import type { AllDayItem, CalendarEvent, DaySchedule, ReviewNote, Session, TimedBlock } from "../types";
import { mockDay, mockMonth } from "./mockSchedule";
import { subjectIdByName } from "./subjects";

// Wire shapes returned by the proxy — subjects are 과목 *names* there; we map
// them to numeric subjectIds here so the id mapping lives in one place.
interface WireDay {
  date: string;
  timed: Array<{ id: string; subject: string | null; title: string; start: string; end: string; status: string | null; done: boolean }>;
  allDay: Array<{ id: string; subject: string | null; title: string; estH: number | null; status: string | null; endDate: string | null }>;
}
interface WireEvent {
  id: string;
  date: string;
  subject: string | null;
  title: string;
  time: string | null;
  dur: string | null;
  done: boolean;
}

// The UI talks only to this interface, so the same components run on local mock
// data or the live Notion proxy. `bySubject` maps 과목 name → actual minutes.
export interface DataSource {
  readonly kind: "local" | "notion";
  getDay(date: string): Promise<DaySchedule>;
  getMonth(ym: string): Promise<CalendarEvent[]>;
  putActual(date: string, bySubject: Record<string, number>): Promise<void>;
  /** Per-subject total planned hours from the schedule (과목 name → hours). */
  getGoals(): Promise<Record<string, number>>;
  /** Sync a plan row's 완료 checkbox back to Notion. */
  putTodo(pageId: string, done: boolean): Promise<void>;
  /** Durable study-session log (cross-device). Empty in local mode. */
  getSessions(): Promise<Session[]>;
  putSessions(sessions: Session[]): Promise<void>;
  /** Durable re-solve notes (cross-device). Empty in local mode. */
  getNotes(): Promise<ReviewNote[]>;
  putNotes(notes: ReviewNote[]): Promise<void>;
}

class LocalDataSource implements DataSource {
  readonly kind = "local" as const;
  async getDay(date: string) {
    return mockDay(date);
  }
  async getMonth(ym: string) {
    return mockMonth(ym);
  }
  async putActual() {
    // Local mode: actuals already live in localStorage (the session log).
  }
  async getGoals() {
    return {}; // local mode falls back to the hardcoded subject goals
  }
  async putTodo() {
    // Local mode: todo state lives in localStorage only.
  }
  async getSessions(): Promise<Session[]> {
    return []; // local mode: the log lives only in localStorage
  }
  async putSessions() {
    // Local mode: nothing to back up to.
  }
  async getNotes(): Promise<ReviewNote[]> {
    return []; // local mode: notes live only in localStorage
  }
  async putNotes() {
    // Local mode: nothing to back up to.
  }
}

class NotionDataSource implements DataSource {
  readonly kind = "notion" as const;
  constructor(private base: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`proxy ${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  async getDay(date: string): Promise<DaySchedule> {
    const w = await this.get<WireDay>(`/api/schedule?date=${encodeURIComponent(date)}`);
    const timed: TimedBlock[] = w.timed.map((t) => ({
      id: t.id,
      subjectId: subjectIdByName(t.subject),
      title: t.title,
      start: t.start,
      end: t.end,
      status: t.status,
      done: t.done,
    }));
    const allDay: AllDayItem[] = w.allDay.map((a) => ({
      id: a.id,
      subjectId: subjectIdByName(a.subject),
      title: a.title,
      estH: a.estH,
      status: a.status,
      endDate: a.endDate,
    }));
    return { date: w.date, timed, allDay };
  }
  async getMonth(ym: string): Promise<CalendarEvent[]> {
    const r = await this.get<{ events: WireEvent[] }>(`/api/schedule/month?ym=${encodeURIComponent(ym)}`);
    return r.events.map((e) => ({
      id: e.id,
      date: e.date,
      subjectId: subjectIdByName(e.subject),
      title: e.title,
      time: e.time,
      dur: e.dur,
      done: e.done,
    }));
  }
  async putActual(date: string, bySubject: Record<string, number>) {
    const res = await fetch(`${this.base}/api/actual`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, bySubject }),
    });
    if (!res.ok) throw new Error(`proxy /api/actual → ${res.status}`);
  }
  async getGoals(): Promise<Record<string, number>> {
    const r = await this.get<{ bySubject: Record<string, number> }>(`/api/goals`);
    return r.bySubject ?? {};
  }
  async putTodo(pageId: string, done: boolean) {
    const res = await fetch(`${this.base}/api/todo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageId, done }),
    });
    if (!res.ok) throw new Error(`proxy /api/todo → ${res.status}`);
  }
  async getSessions(): Promise<Session[]> {
    const r = await this.get<{ sessions: Session[] }>(`/api/sessions`);
    return Array.isArray(r.sessions) ? r.sessions : [];
  }
  async putSessions(sessions: Session[]) {
    const res = await fetch(`${this.base}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessions }),
    });
    if (!res.ok) throw new Error(`proxy /api/sessions → ${res.status}`);
  }
  async getNotes(): Promise<ReviewNote[]> {
    const r = await this.get<{ notes: ReviewNote[] }>(`/api/notes`);
    return Array.isArray(r.notes) ? r.notes : [];
  }
  async putNotes(notes: ReviewNote[]) {
    const res = await fetch(`${this.base}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error(`proxy /api/notes → ${res.status}`);
  }
}

const base = (import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/$/, "");

export const dataSource: DataSource = base ? new NotionDataSource(base) : new LocalDataSource();
