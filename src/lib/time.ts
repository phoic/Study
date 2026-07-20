// Time helpers. Everything the grid needs is expressed in **KST** wall-clock,
// because Notion stores dates in UTC (…Z) and the schedule must render on the
// Korean clock (doc §7). KST is a fixed +09:00 offset (no DST), so we can read
// KST wall-clock fields by shifting the epoch and using the UTC getters.

export const KST_OFFSET_MIN = 9 * 60;
const KST_MS = KST_OFFSET_MIN * 60_000;

export interface KstParts {
  y: number;
  mo: number; // 1–12
  d: number;
  h: number;
  mi: number;
  s: number;
  weekday: number; // 0=Sun … 6=Sat
}

/** Break an epoch-ms instant into KST wall-clock fields. */
export function kstParts(ms: number): KstParts {
  const d = new Date(ms + KST_MS);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
}

/** Seconds since KST midnight for an instant (0 … 86399). */
export function kstSecondsOfDay(ms: number): number {
  const p = kstParts(ms);
  return p.h * 3600 + p.mi * 60 + p.s;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD key of the KST calendar date for an instant. */
export function kstDateKey(ms: number): string {
  const p = kstParts(ms);
  return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`;
}

/**
 * The "study day" a moment belongs to. A study day runs from `startHour`:00
 * to the next day's `startHour`:00 (KST), so past-midnight study still counts
 * toward the previous calendar day (doc §7).
 */
export function studyDayKey(ms: number, startHour: number): string {
  const p = kstParts(ms);
  if (p.h < startHour) {
    // belongs to the previous calendar date
    return kstDateKey(ms - 24 * 3600_000);
  }
  return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`;
}

/** Epoch-ms of the start (startHour:00 KST) of the study day with the given key. */
export function studyDayStartMs(dateKey: string, startHour: number): number {
  const [y, mo, d] = dateKey.split("-").map(Number);
  // startHour:00 KST == (startHour-9):00 UTC on the same date
  return Date.UTC(y, mo - 1, d, startHour - 9, 0, 0);
}

/** ISO datetime (with +09:00) for a KST date key + "HH:MM". */
export function kstIso(dateKey: string, hhmm: string): string {
  return `${dateKey}T${hhmm}:00+09:00`;
}

/** Seconds-of-day (KST) for an ISO datetime string. */
export function isoToKstSecondsOfDay(iso: string): number {
  return kstSecondsOfDay(Date.parse(iso));
}

/** "HH:MM" (KST) for an ISO datetime string. */
export function isoToKstHhmm(iso: string): string {
  const p = kstParts(Date.parse(iso));
  return `${pad2(p.h)}:${pad2(p.mi)}`;
}

// ---- formatting ----------------------------------------------------------

export function fmtHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s % 60)}`;
}

export function fmtHM(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${pad2(m)}`;
}

/** Unambiguous hour/minute label for large durations, e.g. "40시간", "39시간 59분", "40분". */
export function fmtHMlabel(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function hourLabel(h: number): { ap: string; h12: number } {
  const ap = h < 12 ? "오전" : "오후";
  const h12 = ((h + 11) % 12) + 1;
  return { ap, h12 };
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** Weekday of a YYYY-MM-DD date key (KST-agnostic — pure date). */
export function weekdayOfKey(dateKey: string): number {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

export function weekdayName(dateKey: string): string {
  return WD[weekdayOfKey(dateKey)];
}

/** "2026. 7. 19. (일)" */
export function longDateLabel(dateKey: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return `${y}. ${mo}. ${d}. (${WD[weekdayOfKey(dateKey)]})`;
}

export function addDaysKey(dateKey: string, delta: number): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const nd = new Date(Date.UTC(y, mo - 1, d) + delta * 24 * 3600_000);
  return `${nd.getUTCFullYear()}-${pad2(nd.getUTCMonth() + 1)}-${pad2(nd.getUTCDate())}`;
}

/** "YYYY-MM" for a date key. */
export function ymOfKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Shift a "YYYY-MM" by whole months. */
export function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

/** "2026년 7월" from a "YYYY-MM". */
export function ymLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}
