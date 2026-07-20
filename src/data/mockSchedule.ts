import type { AllDayItem, CalendarEvent, DaySchedule, TimedBlock } from "../types";
import { subById } from "./subjects";

// Mock schedule ported from 공부 타이머.dc.html so the app is fully usable
// offline (LocalDataSource). Replaced by the live Notion schedule when
// VITE_API_BASE is set. Two independent mock sources, exactly as the prototype:
// the planner grid uses a fixed planned pattern; the calendar uses dayEvents().

// [subjectId, "HH:MM" start, "HH:MM" end]
const PLANNED: Array<[number, string, string]> = [
  [1, "08:00", "10:00"],
  [4, "10:00", "11:30"],
  [5, "13:00", "14:00"],
  [8, "14:00", "14:40"],
  [6, "15:00", "16:00"],
  [7, "16:00", "17:00"],
  [2, "20:00", "21:30"],
  [1, "21:30", "22:30"],
];

const ALLDAY: Array<Omit<AllDayItem, "id">> = [
  { subjectId: 9, title: "국어 학원", estH: 3 },
  { subjectId: 7, title: "수능특강 독서 준비", estH: 2 },
  { subjectId: 3, title: "물리 수행평가 자료조사", endDate: "2026-07-22" },
];

export function mockDay(date: string): DaySchedule {
  const timed: TimedBlock[] = PLANNED.map(([sid, s, e], i) => ({
    id: `${date}-t${i}`,
    subjectId: sid,
    title: subById(sid)?.name ?? "",
    start: `${date}T${s}:00+09:00`,
    end: `${date}T${e}:00+09:00`,
    status: "예정",
    done: false,
  }));
  const allDay: AllDayItem[] = ALLDAY.map((a, i) => ({ id: `${date}-a${i}`, ...a }));
  return { date, timed, allDay };
}

const TASKS = ["개념 학습", "문제풀이", "복습", "오답 정리", "인강 수강"];
const SLOTS = ["08:00", "10:00", "13:00", "15:00", "20:00"];
const DURS = ["1h", "1시간 30분", "2h", "2h", "1h"];

/** Ported dayEvents(d): the demo has real content only for July 2026, d ≥ 13. */
export function mockDayEvents(dateKey: string): CalendarEvent[] {
  const [y, mo, d] = dateKey.split("-").map(Number);
  if (!(y === 2026 && mo === 7) || d < 13) return [];
  const nev = 2 + (d % 5); // 2–6 events, so dense days exercise the "+N개 더"
  const out: CalendarEvent[] = [];
  for (let k = 0; k < nev; k++) {
    const id = ((d * 7 + k * 11) % 9) + 1;
    out.push({
      id: `${dateKey}-${k}`,
      date: dateKey,
      subjectId: id,
      time: SLOTS[(d + k) % 5],
      dur: DURS[(d + k) % 5],
      title: `${subById(id)?.name ?? ""} ${TASKS[(d + k) % 5]}`,
    });
  }
  return out;
}

export function mockMonth(ym: string): CalendarEvent[] {
  const [y, mo] = ym.split("-").map(Number);
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const out: CalendarEvent[] = [];
  for (let d = 1; d <= dim; d++) out.push(...mockDayEvents(`${ym}-${pad(d)}`));
  return out;
}
