import type { AllDayItem, CalendarEvent, DaySchedule, TimedBlock } from "../types";
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
}

const base = (import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/$/, "");

export const dataSource: DataSource = base ? new NotionDataSource(base) : new LocalDataSource();
