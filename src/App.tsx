import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent, DaySchedule, ReviewNote, Session, ViewName } from "./types";
import { dataSource } from "./data/dataSource";
import { loadNotes, loadSettings, loadTodos, saveNotes, saveTodos } from "./data/store";
import { SUBJECTS, subById, subjectIdByName } from "./data/subjects";
import { useTimer } from "./hooks/useTimer";
import { useNow } from "./hooks/useNow";
import { useIsMobile } from "./hooks/useIsMobile";
import {
  buildActualCells,
  buildPlannedCells,
  cumulativeSecBySubject,
  secBySubjectForDay,
  totalSecForDay,
  type LiveSegment,
} from "./lib/sessions";
import {
  addDaysKey,
  fmtHM,
  fmtHMS,
  fmtHMlabel,
  kstSecondsOfDay,
  longDateLabel,
  shiftYm,
  studyDayKey,
  ymLabel,
  ymOfKey,
} from "./lib/time";
import { SideNav } from "./components/SideNav";
import { PlannerView } from "./views/PlannerView";
import { CalendarView } from "./views/CalendarView";
import { RecordView } from "./views/RecordView";
import { MemoView } from "./views/MemoView";
import { FocusOverlay } from "./components/FocusOverlay";
import { DayDetailModal } from "./components/DayDetailModal";
import { SubjectList, type SubjectRow } from "./components/SubjectList";
import { TimerCard } from "./components/TimerCard";
import { DayGrid } from "./components/DayGrid";
import { AllDayStrip } from "./components/AllDayStrip";
import { MobileTabBar, type MobileTab } from "./components/MobileTabBar";
import { MobileCalendar } from "./components/MobileCalendar";
import { GlassBackdrop } from "./components/GlassBackdrop";
import { APP_BG, INK, control } from "./lib/glass";
import { solidOf, tintOf } from "./lib/colors";

const VACATION_END = "2026-08-17"; // 여름방학 종료 (D-day 기준)

function dDayTo(dateKey: string, endKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(y, m - 1, d)) / 86_400_000);
}

export function App() {
  const settings = useMemo(loadSettings, []);
  const startHour = settings.studyDayStart;

  // useNow only drives idle re-renders; the timer hook re-renders every 250ms
  // while running. All live math below reads one fresh Date.now() so the big
  // timer and the "오늘 과목" times stay in lock-step (no 1s drift).
  useNow(1000);
  const now = Date.now();
  const [view, setView] = useState<ViewName>("planner");
  const isMobile = useIsMobile();
  const [mtab, setMtab] = useState<MobileTab>("timer");
  const [focus, setFocus] = useState(false); // 집중 모드 오버레이

  // sync back to Notion when a session commits (notion mode only)
  const [syncDay, setSyncDay] = useState<string | null>(null);
  const timer = useTimer((s: Session) => setSyncDay(studyDayKey(s.startTs, startHour)));
  const { state: timerState, sessions } = timer;

  const todayKey = studyDayKey(now, startHour);
  const [viewedDateKey, setViewedDateKey] = useState<string>(todayKey);

  // schedule data
  const [daySchedule, setDaySchedule] = useState<DaySchedule | null>(null);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  // calendar/record can browse other months; default to the current one.
  const [calYm, setCalYm] = useState<string>(ymOfKey(todayKey));

  // per-subject total goal (hours), summed from the Notion schedule; falls back
  // to each subject's hardcoded goalH when a subject isn't in the plan / offline.
  const [goalHById, setGoalHById] = useState<Record<number, number>>({});
  useEffect(() => {
    let alive = true;
    dataSource
      .getGoals()
      .then((g) => {
        if (!alive) return;
        const m: Record<number, number> = {};
        for (const [name, hours] of Object.entries(g)) {
          const id = subjectIdByName(name);
          if (id != null) m[id] = hours;
        }
        setGoalHById(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const goalHOf = (id: number) => goalHById[id] ?? subById(id)?.goalH ?? 0;

  // Cross-device session sync: pull the cloud log once and union it into local,
  // then push changes (debounced). Pushing is gated on `hydrated` so a fresh
  // device never overwrites the cloud with its empty local log before pulling.
  const [hydrated, setHydrated] = useState(dataSource.kind !== "notion");
  useEffect(() => {
    if (dataSource.kind !== "notion") return;
    let alive = true;
    dataSource
      .getSessions()
      .then((remote) => {
        if (!alive) return;
        timer.mergeRemote(remote);
        setHydrated(true);
      })
      .catch((e) => console.warn("session hydrate failed (won't overwrite cloud)", e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pushRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!hydrated || dataSource.kind !== "notion") return;
    clearTimeout(pushRef.current);
    pushRef.current = setTimeout(() => {
      dataSource.putSessions(timer.sessions).catch((e) => console.warn("session push failed", e));
    }, 1500);
    return () => clearTimeout(pushRef.current);
  }, [timer.sessions, hydrated]);

  // ---- 재풀이 메모 (로컬 + KV 동기화, 세션과 동일 패턴) ----
  const noteUid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const [notes, setNotes] = useState<ReviewNote[]>(loadNotes);
  useEffect(() => saveNotes(notes), [notes]);
  const addNote = (subjectId: number, text: string, dueTs: number | null) =>
    setNotes((prev) => [{ id: noteUid(), subjectId, text, createdTs: Date.now(), done: false, dueTs }, ...prev]);
  const toggleNote = (id: string) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));
  const deleteNote = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));
  // 집중 모드/타이머의 ＋다시 풀 문제 퀵애드 (현재 선택 과목 프리필)
  const quickAddNote = () => {
    const text = typeof window !== "undefined" ? window.prompt(`'${sel.name}' — 다시 풀 문제 메모`) : null;
    if (text && text.trim()) addNote(timerState.selectedId, text.trim(), null);
  };

  const [notesHydrated, setNotesHydrated] = useState(dataSource.kind !== "notion");
  useEffect(() => {
    if (dataSource.kind !== "notion") return;
    let alive = true;
    dataSource
      .getNotes()
      .then((remote) => {
        if (!alive) return;
        setNotes((prev) => {
          const byId = new Map(prev.map((n) => [n.id, n]));
          for (const r of remote) if (!byId.has(r.id)) byId.set(r.id, r);
          return [...byId.values()].sort((a, b) => b.createdTs - a.createdTs);
        });
        setNotesHydrated(true);
      })
      .catch((e) => console.warn("notes hydrate failed (won't overwrite cloud)", e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const notesPushRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!notesHydrated || dataSource.kind !== "notion") return;
    clearTimeout(notesPushRef.current);
    notesPushRef.current = setTimeout(() => {
      dataSource.putNotes(notes).catch((e) => console.warn("notes push failed", e));
    }, 1500);
    return () => clearTimeout(notesPushRef.current);
  }, [notes, notesHydrated]);

  useEffect(() => {
    let alive = true;
    dataSource
      .getDay(viewedDateKey)
      .then((d) => alive && setDaySchedule(d))
      .catch(() => alive && setDaySchedule({ date: viewedDateKey, timed: [], allDay: [] }));
    return () => {
      alive = false;
    };
  }, [viewedDateKey]);

  useEffect(() => {
    let alive = true;
    dataSource
      .getMonth(calYm)
      .then((e) => alive && setMonthEvents(e))
      .catch(() => alive && setMonthEvents([]));
    return () => {
      alive = false;
    };
  }, [calYm]);

  // push actuals to Notion after a commit
  useEffect(() => {
    if (!syncDay || dataSource.kind !== "notion") {
      if (syncDay) setSyncDay(null);
      return;
    }
    const secs = secBySubjectForDay(sessions, syncDay, startHour);
    const bySubject: Record<string, number> = {};
    for (const [id, sec] of Object.entries(secs)) {
      const name = subById(Number(id))?.name;
      if (name) bySubject[name] = Math.round(sec / 60);
    }
    dataSource.putActual(syncDay, bySubject).catch((e) => console.warn("putActual failed", e));
    setSyncDay(null);
  }, [syncDay, sessions, startHour]);

  // todos (calendar completion)
  const [todos, setTodos] = useState<Record<string, boolean>>(loadTodos);
  const [calDay, setCalDay] = useState<string | null>(null);
  const isDone = (ev: CalendarEvent) => (ev.id in todos ? todos[ev.id] : ev.done ?? false);
  const toggleTodo = (ev: CalendarEvent) => {
    const willBe = !isDone(ev);
    setTodos((prev) => {
      const next = { ...prev, [ev.id]: willBe };
      saveTodos(next);
      return next;
    });
    // push completion back to Notion (완료 checkbox + 상태)
    if (dataSource.kind === "notion") dataSource.putTodo(ev.id, willBe).catch((e) => console.warn("putTodo failed", e));
  };

  // ---- derived values ----
  const sel = subById(timerState.selectedId)!;
  const viewedIsToday = viewedDateKey === todayKey;
  const live: LiveSegment | undefined =
    timer.liveStartTs != null ? { subjectId: timerState.selectedId, startTs: timer.liveStartTs, running: true } : undefined;

  const secToday = secBySubjectForDay(sessions, todayKey, startHour, live, now);
  // 열품타 방식: 큰 타이머 = 선택 과목의 "오늘 누적"(기록 + 진행 중). "오늘 과목" 행과
  // 항상 같은 값이며, 정지/재시작·과목 전환에도 누적이 이어진다.
  const selTodaySec = secToday[timerState.selectedId] ?? 0;

  // 타이머 시작 시 집중 모드 진입(일시정지→시작일 때만). 정지는 그대로.
  const startFocus = () => {
    const wasRunning = timerState.running;
    timer.toggleRun();
    if (!wasRunning) setFocus(true);
  };

  // 자투리 추천: 가장 뒤처진 과목 1개. 남은목표를 남은일수로 나눈 "하루 필요"보다
  // 오늘 공부가 가장 모자란 과목을 부드럽게 맨 위로 추천한다(자유 선택은 유지).
  const recommendedId: number | null = useMemo(() => {
    const cumSec = cumulativeSecBySubject(sessions, live, now);
    const remainingDays = Math.max(1, dDayTo(todayKey, VACATION_END));
    let best: number | null = null;
    let bestDeficit = 0;
    for (const s of SUBJECTS) {
      const goalSec = goalHOf(s.id) * 3600;
      if (goalSec <= 0) continue;
      const remainingGoal = Math.max(0, goalSec - (cumSec[s.id] ?? 0));
      if (remainingGoal <= 0) continue;
      const deficit = remainingGoal / remainingDays - (secToday[s.id] ?? 0);
      if (deficit > bestDeficit) {
        bestDeficit = deficit;
        best = s.id;
      }
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(secToday), sessions, goalHById, todayKey]);

  // 남은 목표 = 총 목표시간 − 그 과목의 누적 실제시간(모든 기록 + 진행 중). (doc §6)
  let selCumMs = 0;
  for (const s of sessions) if (s.subjectId === timerState.selectedId) selCumMs += s.endTs - s.startTs;
  if (live && live.subjectId === timerState.selectedId) selCumMs += now - live.startTs;
  const remainingSec = Math.max(0, goalHOf(timerState.selectedId) * 3600 - Math.floor(selCumMs / 1000));

  // subject rows for "오늘 과목": planned-today ∪ studied-today ∪ selected
  const subjectRows: SubjectRow[] = useMemo(() => {
    const ids = new Set<number>();
    for (const b of daySchedule?.timed ?? []) if (b.subjectId != null) ids.add(b.subjectId);
    for (const k of Object.keys(secToday)) ids.add(Number(k));
    ids.add(timerState.selectedId);
    if (recommendedId != null) ids.add(recommendedId);
    const rows = [...ids]
      .map((id) => {
        const s = subById(id)!;
        const sec = secToday[id] ?? 0;
        const on = id === timerState.selectedId;
        const goalSec = s.dm * 60;
        const met = sec >= goalSec;
        return {
          id,
          name: s.name,
          solid: s.solid,
          todayStr: fmtHMS(sec),
          dGoalStr: fmtHM(goalSec),
          pct: `${Math.round(Math.min(1, sec / goalSec) * 100)}%`,
          timeColor: met ? s.solid : on && timerState.running ? s.solid : sec > 0 ? "#3a382f" : "#c4c1b8",
          on,
          recommended: id === recommendedId,
          _sec: sec,
        };
      })
      .sort((a, b) => b._sec - a._sec);
    // 추천 과목을 목록 맨 위로
    const ri = rows.findIndex((r) => r.recommended);
    if (ri > 0) rows.unshift(rows.splice(ri, 1)[0]);
    return rows.map(({ _sec, ...r }) => r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySchedule, timerState.selectedId, timerState.running, recommendedId, JSON.stringify(secToday)]);

  const plannedCells = useMemo(() => buildPlannedCells(daySchedule?.timed ?? []), [daySchedule]);
  const actualCells = buildActualCells(sessions, viewedDateKey, startHour, viewedIsToday ? live : undefined, now);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of monthEvents) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [monthEvents]);

  const clearSelectedToday = () => {
    if (typeof window !== "undefined" && !window.confirm(`오늘 '${sel.name}' 기록을 지울까요?`)) return;
    timer.clearSubjectDay(timerState.selectedId, todayKey, startHour);
    if (dataSource.kind === "notion") setSyncDay(todayKey);
  };

  const dayModal = calDay ? (
    <DayDetailModal
      dateKey={calDay}
      events={eventsByDay.get(calDay) ?? []}
      isToday={calDay === todayKey}
      accent={sel.solid}
      isDone={isDone}
      onToggle={toggleTodo}
      onClose={() => setCalDay(null)}
      sheet={isMobile}
    />
  ) : null;

  const mNav: React.CSSProperties = {
    width: 32, height: 32, flex: "none", ...control, borderRadius: 11,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  };
  const chevL = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 5l-7 7 7 7" /></svg>;
  const chevR = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 5l7 7-7 7" /></svg>;
  const swatch = (bg: string) => <span style={{ width: 18, height: 10, borderRadius: 3, background: bg }} />;

  // ---------- mobile layout ----------
  if (isMobile) {
    return (
      <div style={{ width: "100%", height: "100dvh", display: "flex", flexDirection: "column", background: APP_BG, color: INK.strong, position: "relative", fontSize: 14, overflow: "hidden" }}>
        <GlassBackdrop />
        {/* 탭바가 떠 있어 콘텐츠가 그 아래로 흘러간다(유리가 굴절할 게 있어야 하므로).
            캡슐 높이 + 여백만큼 바닥을 비워 마지막 항목이 가리지 않게 한다. */}
        <div
          className="noscroll"
          style={{ position: "relative", zIndex: 1, flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}
        >
          {mtab === "timer" && (
            <div style={{ padding: "10px 18px 12px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: "#8d8a99", fontWeight: 700 }}>오늘 총 공부</div>
                  <div className="tnum" style={{ fontSize: 31, fontWeight: 800, letterSpacing: "-.02em", marginTop: 2 }}>{fmtHM(totalSecForDay(secToday))}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, color: "#8d8a99", fontWeight: 700 }}>{longDateLabel(todayKey)}</div>
                  <div style={{ fontSize: 11.5, color: "#b0aeb8", fontWeight: 600, marginTop: 3 }}>여름방학 D-{dDayTo(todayKey, VACATION_END)}</div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <TimerCard subject={sel} remainingStr={fmtHMlabel(remainingSec)} elapsedStr={fmtHMS(selTodaySec)} running={timerState.running} onToggle={startFocus} onReset={clearSelectedToday} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 10px" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#6d6a76" }}>오늘 과목</span>
                <span style={{ fontSize: 11, color: "#b0aeb8", fontWeight: 600 }}>공부 시간 / 목표</span>
              </div>
              <SubjectList rows={subjectRows} onSelect={timer.selectSubject} />
            </div>
          )}

          {mtab === "timeline" && (
            <div style={{ padding: "10px 14px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px 12px" }}>
                <button onClick={() => setViewedDateKey((k) => addDaysKey(k, -1))} className="hoverable" style={mNav} aria-label="이전 날">{chevL}</button>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em" }}>{longDateLabel(viewedDateKey)}</div>
                <button onClick={() => setViewedDateKey((k) => addDaysKey(k, 1))} className="hoverable" style={mNav} aria-label="다음 날">{chevR}</button>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#a8a59d", fontWeight: 600 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>{swatch(tintOf(255))}계획</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>{swatch(solidOf(255))}실제</span>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}><AllDayStrip items={daySchedule?.allDay ?? []} /></div>
              <DayGrid plannedCells={plannedCells} actualCells={actualCells} startHour={startHour} rowHeight={26} nowSecOfDay={viewedIsToday ? kstSecondsOfDay(now) : null} running={timerState.running} />
            </div>
          )}

          {mtab === "calendar" && (
            <div style={{ padding: "10px 14px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <button onClick={() => setCalYm((v) => shiftYm(v, -1))} className="hoverable" style={mNav} aria-label="이전 달">{chevL}</button>
                <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em", minWidth: 92, textAlign: "center" }}>{ymLabel(calYm)}</div>
                <button onClick={() => setCalYm((v) => shiftYm(v, 1))} className="hoverable" style={mNav} aria-label="다음 달">{chevR}</button>
                <button onClick={() => setCalYm(ymOfKey(todayKey))} className="hoverable" style={{ ...mNav, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700, color: "#6d6a62" }}>오늘</button>
              </div>
              <MobileCalendar ym={calYm} eventsByDay={eventsByDay} todayKey={todayKey} accent={sel.solid} onSelectDay={setCalDay} />
            </div>
          )}

          {mtab === "record" && (
            <div style={{ padding: "10px 16px 12px" }}>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>학습 기록</div>
              <div style={{ fontSize: 12, color: "#a8a59d", fontWeight: 600, margin: "4px 0 16px" }}>{ymLabel(ymOfKey(todayKey))}</div>
              <RecordView sessions={sessions} startHour={startHour} todayKey={todayKey} accentSolid={sel.solid} monthLabel={ymLabel(ymOfKey(todayKey))} goalHById={goalHById} stacked />
            </div>
          )}

          {mtab === "memo" && (
            <div style={{ padding: "10px 16px 12px" }}>
              <MemoView notes={notes} selectedId={timerState.selectedId} onAdd={addNote} onToggle={toggleNote} onDelete={deleteNote} stacked />
            </div>
          )}
        </div>
        <MobileTabBar tab={mtab} onChange={setMtab} />
        {focus && (
          <FocusOverlay
            subject={sel}
            elapsedStr={fmtHMS(selTodaySec)}
            running={timerState.running}
            onToggle={timer.toggleRun}
            onExit={() => setFocus(false)}
            onAddNote={quickAddNote}
          />
        )}
        {dayModal}
      </div>
    );
  }

  // ---------- desktop / iPad layout ----------
  return (
    <div style={{ width: "100vw", height: "100dvh", display: "flex", background: APP_BG, color: INK.strong, overflow: "hidden", position: "relative", fontSize: 14 }}>
      <GlassBackdrop />
      <SideNav view={view} onChange={setView} />

      <main style={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {view === "planner" && (
          <PlannerView
            todayTotalStr={fmtHM(totalSecForDay(secToday))}
            headerDateLabel={longDateLabel(todayKey)}
            dDay={dDayTo(todayKey, VACATION_END)}
            timerSubject={sel}
            remainingStr={fmtHMlabel(remainingSec)}
            elapsedStr={fmtHMS(selTodaySec)}
            running={timerState.running}
            onToggle={startFocus}
            onReset={clearSelectedToday}
            subjectRows={subjectRows}
            onSelect={timer.selectSubject}
            gridDateLabel={longDateLabel(viewedDateKey)}
            onPrevDay={() => setViewedDateKey((k) => addDaysKey(k, -1))}
            onNextDay={() => setViewedDateKey((k) => addDaysKey(k, 1))}
            allDay={daySchedule?.allDay ?? []}
            plannedCells={plannedCells}
            actualCells={actualCells}
            startHour={startHour}
            rowHeight={settings.rowHeight}
            nowSecOfDay={viewedIsToday ? kstSecondsOfDay(now) : null}
          />
        )}

        {view === "calendar" && (
          <CalendarView
            ym={calYm}
            monthLabel={ymLabel(calYm)}
            synced={dataSource.kind === "notion"}
            eventsByDay={eventsByDay}
            todayKey={todayKey}
            selectedDay={calDay}
            accent={sel.solid}
            onSelectDay={setCalDay}
            onPrevMonth={() => setCalYm((v) => shiftYm(v, -1))}
            onNextMonth={() => setCalYm((v) => shiftYm(v, 1))}
            onToday={() => setCalYm(ymOfKey(todayKey))}
          />
        )}

        {view === "record" && (
          <RecordView sessions={sessions} startHour={startHour} todayKey={todayKey} accentSolid={sel.solid} monthLabel={ymLabel(ymOfKey(todayKey))} goalHById={goalHById} />
        )}

        {view === "memo" && (
          <MemoView notes={notes} selectedId={timerState.selectedId} onAdd={addNote} onToggle={toggleNote} onDelete={deleteNote} />
        )}
      </main>

      {focus && (
        <FocusOverlay
          subject={sel}
          elapsedStr={fmtHMS(selTodaySec)}
          running={timerState.running}
          onToggle={timer.toggleRun}
          onExit={() => setFocus(false)}
          onAddNote={quickAddNote}
        />
      )}
      {dayModal}
    </div>
  );
}
