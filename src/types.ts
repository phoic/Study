// Shared domain types for the study timer.

export interface Subject {
  id: number;
  name: string;
  hue: number;
  goalH: number; // total goal hours for the vacation
  doneH: number; // baseline cumulative hours (before app-recorded actuals)
  dm: number; // daily goal, minutes
  solid?: string; // optional color override (독서, 점검·보충)
  tint?: string;
  bar?: string; // actual-time gradient on the day grid
  planned?: string; // planned-cell wash on the day grid
}

export interface SubjectResolved extends Subject {
  solid: string;
  tint: string;
  bar: string;
  planned: string;
}

/** A timed plan block — Notion row with 날짜.is_datetime = 1. */
export interface TimedBlock {
  id: string;
  subjectId: number | null;
  title: string;
  start: string; // ISO datetime with offset (…+09:00 or …Z)
  end: string; // ISO datetime with offset
  status?: string | null;
  done?: boolean;
}

/** A date-only / all-day row — Notion 날짜.is_datetime = 0 (준비 과제, 학원 등). */
export interface AllDayItem {
  id: string;
  subjectId: number | null;
  title: string;
  estH?: number | null; // 예상시간(h)
  status?: string | null;
  endDate?: string | null; // YYYY-MM-DD for multi-day ranges (~7/22)
}

export interface DaySchedule {
  date: string; // study-day key YYYY-MM-DD (KST)
  timed: TimedBlock[];
  allDay: AllDayItem[];
}

/** A recorded study session — the real "actual" time, source of truth locally. */
export interface Session {
  id: string;
  subjectId: number;
  startTs: number; // epoch ms
  endTs: number; // epoch ms
}

/** A "re-solve" note — a problem worth revisiting, grouped by subject. */
export interface ReviewNote {
  id: string;
  subjectId: number;
  text: string;
  createdTs: number; // epoch ms
  done: boolean; // 다시 풀었음
  dueTs?: number | null; // optional "언제 다시" reminder (epoch ms), null = 없음
}

/** A lightweight event for the month calendar / record views. */
export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD (KST)
  subjectId: number | null;
  title: string;
  time?: string | null; // HH:MM if timed
  dur?: string | null; // human duration label
  done?: boolean;
}

export interface TimerState {
  selectedId: number;
  running: boolean;
  liveStartTs: number; // epoch ms of the current running segment (0 when paused)
  sittingBase: number; // ms already committed within the current sitting (for display)
}

export interface Settings {
  studyDayStart: number; // hour the "study day" begins (4/5/6)
  rowHeight: number; // grid row height px (24–40)
}

export type ViewName = "planner" | "calendar" | "record" | "memo";
