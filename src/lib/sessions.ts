import type { Session, TimedBlock } from "../types";
import { isoToKstSecondsOfDay, kstSecondsOfDay, studyDayStartMs } from "./time";

/** A currently-running segment (endTs = now), folded into totals/cells live. */
export interface LiveSegment {
  subjectId: number;
  startTs: number;
  running: boolean;
}

const CELL_MS = 600_000; // 10 minutes

function dayWindow(dayKey: string, startHour: number): [number, number] {
  const ds = studyDayStartMs(dayKey, startHour);
  return [ds, ds + 24 * 3600_000];
}

function clampedMs(aMs: number, bMs: number, ds: number, de: number): number {
  return Math.max(0, Math.min(bMs, de) - Math.max(aMs, ds));
}

/** Seconds studied per subject within a study day (sessions + optional live). */
export function secBySubjectForDay(
  sessions: Session[],
  dayKey: string,
  startHour: number,
  live?: LiveSegment,
  now = Date.now(),
): Record<number, number> {
  const [ds, de] = dayWindow(dayKey, startHour);
  const out: Record<number, number> = {};
  for (const s of sessions) {
    const ms = clampedMs(s.startTs, s.endTs, ds, de);
    if (ms > 0) out[s.subjectId] = (out[s.subjectId] ?? 0) + ms;
  }
  if (live) {
    const ms = clampedMs(live.startTs, now, ds, de);
    if (ms > 0) out[live.subjectId] = (out[live.subjectId] ?? 0) + ms;
  }
  for (const k of Object.keys(out)) out[+k] = Math.floor(out[+k] / 1000);
  return out;
}

export function totalSecForDay(secBySubject: Record<number, number>): number {
  return Object.values(secBySubject).reduce((a, b) => a + b, 0);
}

/** All-time cumulative seconds per subject (every session + optional live). */
export function cumulativeSecBySubject(
  sessions: Session[],
  live?: LiveSegment,
  now = Date.now(),
): Record<number, number> {
  const ms: Record<number, number> = {};
  for (const s of sessions) ms[s.subjectId] = (ms[s.subjectId] ?? 0) + (s.endTs - s.startTs);
  if (live) ms[live.subjectId] = (ms[live.subjectId] ?? 0) + Math.max(0, now - live.startTs);
  const out: Record<number, number> = {};
  for (const k of Object.keys(ms)) out[+k] = Math.floor(ms[+k] / 1000);
  return out;
}

export interface ActualCell {
  subjectId: number;
  frac: number; // 0–1 fill of the 10-min cell
  live: boolean;
}

/** Rasterize sessions (+ live) into 10-minute grid cells keyed by SOD/600 (0–143). */
export function buildActualCells(
  sessions: Session[],
  dayKey: string,
  startHour: number,
  live?: LiveSegment,
  now = Date.now(),
): Map<number, ActualCell> {
  const [ds, de] = dayWindow(dayKey, startHour);
  const cells = new Map<number, ActualCell>();

  const paint = (subjectId: number, aMs: number, bMs: number, running: boolean) => {
    let a = Math.max(aMs, ds);
    const b = Math.min(bMs, de);
    while (a < b) {
      const sod = kstSecondsOfDay(a);
      const cell = Math.floor(sod / 600); // 0–143
      const cellStartMs = a - (sod - cell * 600) * 1000;
      const cellEndMs = cellStartMs + CELL_MS;
      const segEnd = Math.min(b, cellEndMs);
      const frac = (segEnd - Math.max(a, cellStartMs)) / CELL_MS;
      const isLiveCell = running && segEnd >= b;
      const prev = cells.get(cell);
      const nextFrac = Math.min(1, (prev?.frac ?? 0) + frac);
      // keep the subject that contributes the larger share to the cell
      const keepSubject = !prev || frac >= prev.frac ? subjectId : prev.subjectId;
      cells.set(cell, { subjectId: keepSubject, frac: nextFrac, live: (prev?.live ?? false) || isLiveCell });
      a = cellEndMs;
    }
  };

  for (const s of sessions) paint(s.subjectId, s.startTs, s.endTs, false);
  if (live && (live.running || now > live.startTs)) paint(live.subjectId, live.startTs, now, live.running);
  return cells;
}

export interface PlannedCell {
  subjectId: number | null;
}

/** Fill planned (tint) cells from timed blocks, keyed by SOD/600 (0–143). */
export function buildPlannedCells(timed: TimedBlock[]): Map<number, PlannedCell> {
  const cells = new Map<number, PlannedCell>();
  for (const b of timed) {
    const start = Math.floor(isoToKstSecondsOfDay(b.start) / 600);
    const end = Math.ceil(isoToKstSecondsOfDay(b.end) / 600);
    for (let c = start; c < end; c++) cells.set(c, { subjectId: b.subjectId });
  }
  return cells;
}
