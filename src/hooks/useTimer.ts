import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, TimerState } from "../types";
import { loadSessions, loadTimer, saveSessions, saveTimer } from "../data/store";

// Timestamp-based stopwatch (doc §4-1, §7). The current "sitting" for the
// selected subject accumulates across pause/resume; committed running segments
// become Sessions (the real actual-time log). Because `liveStartTs` is an epoch
// timestamp, the elapsed value stays correct across reloads and iPad
// background-throttling — we never count ticks, we diff clocks.

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface TimerApi {
  state: TimerState;
  sessions: Session[];
  elapsedMs: number; // current sitting elapsed (selected subject)
  toggleRun: () => void;
  resetRun: () => void;
  selectSubject: (id: number) => void;
  /** epoch ms of the live running segment start, or null when paused. */
  liveStartTs: number | null;
}

export function useTimer(onCommit?: (s: Session) => void): TimerApi {
  const [state, setState] = useState<TimerState>(loadTimer);
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [, forceTick] = useState(0);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // persist
  useEffect(() => saveTimer(state), [state]);
  useEffect(() => saveSessions(sessions), [sessions]);

  // repaint while running (does not drive the clock — just re-renders)
  useEffect(() => {
    if (!state.running) return;
    const iv = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(iv);
  }, [state.running]);

  const commit = useCallback((subjectId: number, startTs: number, endTs: number) => {
    if (endTs - startTs < 1000) return; // ignore < 1s blips
    const s: Session = { id: uid(), subjectId, startTs, endTs };
    setSessions((prev) => [...prev, s]);
    onCommitRef.current?.(s);
  }, []);

  const toggleRun = useCallback(() => {
    setState((s) => {
      const now = Date.now();
      if (s.running) {
        commit(s.selectedId, s.liveStartTs, now);
        return { ...s, running: false, liveStartTs: 0, sittingBase: s.sittingBase + (now - s.liveStartTs) };
      }
      return { ...s, running: true, liveStartTs: now };
    });
  }, [commit]);

  const resetRun = useCallback(() => {
    setState((s) => {
      if (s.running) commit(s.selectedId, s.liveStartTs, Date.now());
      return { ...s, running: false, liveStartTs: 0, sittingBase: 0 };
    });
  }, [commit]);

  const selectSubject = useCallback(
    (id: number) => {
      setState((s) => {
        if (id === s.selectedId) return s;
        const now = Date.now();
        if (s.running) {
          commit(s.selectedId, s.liveStartTs, now);
          return { ...s, selectedId: id, running: true, liveStartTs: now, sittingBase: 0 };
        }
        return { ...s, selectedId: id, sittingBase: 0 };
      });
    },
    [commit],
  );

  const elapsedMs = state.sittingBase + (state.running ? Date.now() - state.liveStartTs : 0);

  return {
    state,
    sessions,
    elapsedMs,
    toggleRun,
    resetRun,
    selectSubject,
    liveStartTs: state.running ? state.liveStartTs : null,
  };
}
