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

const KST_MS = 9 * 60 * 60_000;
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
function kstDateKeyFromMs(ms: number): string {
  const d = new Date(ms + KST_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
/** Study-day key of an instant (past-midnight counts to the previous day). */
function studyDayKeyMs(ms: number, startHour: number): string {
  const d = new Date(ms + KST_MS);
  if (d.getUTCHours() < startHour) return kstDateKeyFromMs(ms - 24 * 3600_000);
  return kstDateKeyFromMs(ms);
}
function addDaysKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const nd = new Date(Date.UTC(y, m - 1, d) + delta * 24 * 3600_000);
  return `${nd.getUTCFullYear()}-${pad2(nd.getUTCMonth() + 1)}-${pad2(nd.getUTCDate())}`;
}
function isDatetime(v: string): boolean {
  return v.includes("T");
}
/** Study-day key a Notion date value belongs to. */
function valueStudyDay(startVal: string, startHour: number): string {
  if (isDatetime(startVal)) return studyDayKeyMs(Date.parse(startVal), startHour);
  return startVal.slice(0, 10); // date-only → its own calendar day
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
        start: dt.start,
        end: dt.end ?? dt.start,
        status,
        done: propCheckbox(p["완료"]),
      });
    } else {
      // date-only: belongs to [start .. end] inclusive
      const startD = dt.start.slice(0, 10);
      const endD = (dt.end ?? dt.start).slice(0, 10);
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
      time: timed ? new Date(Date.parse(dt.start) + KST_MS).toISOString().slice(11, 16) : null,
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
      .sort((a, b) => Date.parse(rowDate(a)!.start) - Date.parse(rowDate(b)!.start));
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

      if (url.pathname === "/" || url.pathname === "/api") return json({ ok: true, service: "study-timer-proxy" }, env);
      return json({ error: "not found" }, env, 404);
    } catch (e: any) {
      return json({ error: String(e?.message ?? e) }, env, 502);
    }
  },
};
