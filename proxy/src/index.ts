// Cloudflare Worker — thin CORS proxy between the study-timer PWA and Notion.
// Keeps the Notion token server-side (browsers can't call Notion: CORS + token)
// and normalizes rows into the shape the app expects. See ../README.md.

export interface Env {
  NOTION_TOKEN: string; // secret
  NOTION_DATABASE_ID: string;
  NOTION_VERSION: string;
  STUDY_DAY_START: string;
  ALLOW_ORIGIN: string;
  ACTUAL_PROP: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function cors(env: Env): Record<string, string> {
  return {
    "access-control-allow-origin": env.ALLOW_ORIGIN || "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,accept",
    "access-control-max-age": "86400",
  };
}
function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors(env) },
  });
}

// ---- KST helpers (mirror src/lib/time.ts) --------------------------------
function addDaysKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d) + delta * 24 * 3600_000);
  return `${nd.getUTCFullYear()}-${pad2(nd.getUTCMonth() + 1)}-${pad2(nd.getUTCDate())}`;
}
// Notion returns these datetimes with the intended **KST wall clock** in the
// string (e.g. "2026-07-18T08:00:00.000Z" means 오전 8시), so we read the literal
// date/time and treat it as KST — never re-offset it. This is what makes an
// 08:00 Notion block land on the 8am grid row (doc §7).
interface Wall {
  date: string; // YYYY-MM-DD
  hh: number;
  mm: number;
  hasTime: boolean;
}
function wallClock(v: string): Wall {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return { date: v.slice(0, 10), hh: 0, mm: 0, hasTime: false };
  return { date: `${m[1]}-${m[2]}-${m[3]}`, hh: m[4] ? +m[4] : 0, mm: m[5] ? +m[5] : 0, hasTime: m[4] != null };
}
function isDatetime(v: string): boolean {
  return wallClock(v).hasTime;
}
/** KST-labelled ISO for the frontend, built from the Notion wall clock. */
function kstIso(v: string): string {
  const w = wallClock(v);
  return `${w.date}T${pad2(w.hh)}:${pad2(w.mm)}:00+09:00`;
}
function hhmm(v: string): string {
  const w = wallClock(v);
  return `${pad2(w.hh)}:${pad2(w.mm)}`;
}
/** Study-day key a Notion date value belongs to (05:00 boundary, KST wall clock). */
function valueStudyDay(startVal: string, startHour: number): string {
  const w = wallClock(startVal);
  if (w.hasTime && w.hh < startHour) return addDaysKey(w.date, -1);
  return w.date;
}

// ---- Notion REST ---------------------------------------------------------
async function notion(env: Env, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.NOTION_TOKEN}`,
      "notion-version": env.NOTION_VERSION,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`notion ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function queryRange(env: Env, fromKey: string, toKey: string): Promise<any[]> {
  const pages: any[] = [];
  let cursor: string | undefined;
  do {
    const body: any = {
      page_size: 100,
      filter: {
        and: [
          { property: "날짜", date: { on_or_after: fromKey } },
          { property: "날짜", date: { on_or_before: `${toKey}T23:59:59+09:00` } },
        ],
      },
      sorts: [{ property: "날짜", direction: "ascending" }],
    };
    if (cursor) body.start_cursor = cursor;
    const r = await notion(env, `/databases/${env.NOTION_DATABASE_ID}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    pages.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// ---- normalizers ---------------------------------------------------------
const propTitle = (p: any) => (p?.title ?? []).map((t: any) => t.plain_text).join("").trim();
const propSelect = (p: any) => p?.select?.name ?? null;
const propNumber = (p: any) => (typeof p?.number === "number" ? p.number : null);
const propCheckbox = (p: any) => !!p?.checkbox;

function rowDate(page: any): { start: string; end: string | null } | null {
  const d = page.properties?.["날짜"]?.date;
  if (!d?.start) return null;
  return { start: d.start, end: d.end ?? null };
}

interface WireTimed {
  id: string;
  subject: string | null;
  title: string;
  start: string;
  end: string;
  status: string | null;
  done: boolean;
}
interface WireAllDay {
  id: string;
  subject: string | null;
  title: string;
  estH: number | null;
  status: string | null;
  endDate: string | null;
}

function buildDay(date: string, pages: any[], startHour: number) {
  const timed: WireTimed[] = [];
  const allDay: WireAllDay[] = [];
  for (const pg of pages) {
    const dt = rowDate(pg);
    if (!dt) continue;
    const p = pg.properties;
    const subject = propSelect(p["과목"]);
    const title = propTitle(p["제목"]);
    const status = propSelect(p["상태"]);
    if (isDatetime(dt.start)) {
      if (valueStudyDay(dt.start, startHour) !== date) continue;
      timed.push({
        id: pg.id,
        subject,
        title,
        start: kstIso(dt.start),
        end: kstIso(dt.end ?? dt.start),
        status,
        done: propCheckbox(p["완료"]),
      });
    } else {
      // date-only: belongs to [start .. end] inclusive
      const startD = wallClock(dt.start).date;
      const endD = wallClock(dt.end ?? dt.start).date;
      if (date < startD || date > endD) continue;
      allDay.push({ id: pg.id, subject, title, estH: propNumber(p["예상시간(h)"]), status, endDate: dt.end ? endD : null });
    }
  }
  return { date, timed, allDay };
}

function buildMonth(ym: string, pages: any[], startHour: number) {
  const events: any[] = [];
  for (const pg of pages) {
    const dt = rowDate(pg);
    if (!dt) continue;
    const p = pg.properties;
    const subject = propSelect(p["과목"]);
    const title = propTitle(p["제목"]);
    const done = propCheckbox(p["완료"]);
    const day = valueStudyDay(dt.start, startHour);
    if (!day.startsWith(ym)) continue;
    const timed = isDatetime(dt.start);
    events.push({
      id: pg.id,
      date: day,
      subject,
      title,
      time: timed ? hhmm(dt.start) : null,
      dur: null,
      done,
    });
  }
  return events;
}

// ---- actual write-back ---------------------------------------------------
async function putActual(env: Env, date: string, bySubject: Record<string, number>, startHour: number) {
  const pages = await queryRange(env, addDaysKey(date, -1), addDaysKey(date, 1));
  const dayRows = pages.filter((pg) => {
    const dt = rowDate(pg);
    return dt && isDatetime(dt.start) && valueStudyDay(dt.start, startHour) === date;
  });
  const results: Record<string, string> = {};
  for (const [subject, minutes] of Object.entries(bySubject)) {
    // earliest timed plan row for this subject on this study-day
    const candidates = dayRows
      .filter((pg) => propSelect(pg.properties["과목"]) === subject)
      .sort((a, b) => Date.parse(kstIso(rowDate(a)!.start)) - Date.parse(kstIso(rowDate(b)!.start)));
    const target = candidates[0];
    if (!target) {
      results[subject] = "no-matching-row";
      continue;
    }
    await notion(env, `/pages/${target.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: { [env.ACTUAL_PROP]: { number: Math.round(minutes) } } }),
    });
    results[subject] = `wrote ${Math.round(minutes)}m → ${target.id}`;
  }
  return results;
}

// ---- planned totals (per-subject goal from the schedule) -----------------
/** Planned hours a row contributes: timed block duration, else 예상시간(h). */
function plannedHours(pg: any): number {
  const dt = rowDate(pg);
  if (!dt) return 0;
  if (isDatetime(dt.start)) {
    const s = Date.parse(kstIso(dt.start));
    const e = Date.parse(kstIso(dt.end ?? dt.start));
    return Math.max(0, (e - s) / 3_600_000);
  }
  return propNumber(pg.properties["예상시간(h)"]) ?? 0;
}

async function computeGoals(env: Env): Promise<Record<string, number>> {
  // whole plan (wide range covers the vacation DB)
  const pages = await queryRange(env, "2026-01-01", "2026-12-31");
  const bySubject: Record<string, number> = {};
  for (const pg of pages) {
    const subj = propSelect(pg.properties["과목"]);
    if (!subj) continue;
    bySubject[subj] = (bySubject[subj] ?? 0) + plannedHours(pg);
  }
  for (const k of Object.keys(bySubject)) bySubject[k] = Math.round(bySubject[k] * 10) / 10;
  return bySubject;
}

// ---- todo completion sync ------------------------------------------------
async function putTodo(env: Env, pageId: string, done: boolean) {
  const properties: any = { 완료: { checkbox: done } };
  if (done) properties["상태"] = { select: { name: "완료" } }; // don't downgrade 상태 on uncheck
  await notion(env, `/pages/${pageId}`, { method: "PATCH", body: JSON.stringify({ properties }) });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    const url = new URL(req.url);
    const startHour = Number(env.STUDY_DAY_START || "5");

    try {
      if (url.pathname === "/api/schedule" && req.method === "GET") {
        const date = url.searchParams.get("date");
        if (!date) return json({ error: "date required" }, env, 400);
        const pages = await queryRange(env, addDaysKey(date, -1), addDaysKey(date, 1));
        return json(buildDay(date, pages, startHour), env);
      }

      if (url.pathname === "/api/schedule/month" && req.method === "GET") {
        const ym = url.searchParams.get("ym");
        if (!ym) return json({ error: "ym required" }, env, 400);
        const pages = await queryRange(env, addDaysKey(`${ym}-01`, -1), `${ym}-31`);
        return json({ events: buildMonth(ym, pages, startHour) }, env);
      }

      if (url.pathname === "/api/actual" && req.method === "POST") {
        const body = (await req.json()) as { date?: string; bySubject?: Record<string, number> };
        if (!body.date || !body.bySubject) return json({ error: "date and bySubject required" }, env, 400);
        const results = await putActual(env, body.date, body.bySubject, startHour);
        return json({ ok: true, results }, env);
      }

      if (url.pathname === "/api/goals" && req.method === "GET") {
        return json({ bySubject: await computeGoals(env) }, env);
      }

      if (url.pathname === "/api/todo" && req.method === "POST") {
        const body = (await req.json()) as { pageId?: string; done?: boolean };
        if (!body.pageId) return json({ error: "pageId required" }, env, 400);
        await putTodo(env, body.pageId, !!body.done);
        return json({ ok: true }, env);
      }

      if (url.pathname === "/" || url.pathname === "/api") return json({ ok: true, service: "study-timer-proxy" }, env);
      return json({ error: "not found" }, env, 404);
    } catch (e: any) {
      return json({ error: String(e?.message ?? e) }, env, 502);
    }
  },
};
