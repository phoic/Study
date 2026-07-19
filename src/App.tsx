import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, DaySchedule, Session, ViewName } from "./types";
import { dataSource } from "./data/dataSource";
import { loadSettings, loadTodos, saveTodos } from "./data/store";
import { subById } from "./data/subjects";
import { useTimer } from "./hooks/useTimer";
import { useNow } from "./hooks/useNow";
import {
  buildActualCells,
  buildPlannedCells,
  secBySubjectForDay,
  totalSecForDay,
  type LiveSegment,
} from "./lib/sessions";
import {
  addDaysKey,
  fmtHM,
  fmtHMS,
  kstSecondsOfDay,
  longDateLabel,
  studyDayKey,
  ymOfKey,
} from "./lib/time";
import { SideNav } from "./components/SideNav";
import { PlannerView } from "./views/PlannerView";
import { CalendarView } from "./views/CalendarView";
import { RecordView } from "./views/RecordView";
import { DayDetailModal } from "./components/DayDetailModal";
import type { SubjectRow } from "./components/SubjectList";

const VACATION_END = "2026-08-17"; // 여름방학 종료 (D-day 기준)

function dDayTo(dateKey: string, endKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(y, m - 1, d)) / 86_400_000);
}

export function App() {
  const settings = useMemo(loadSettings, []);
  const startHour = settings.studyDayStart;

  const now = useNow(1000);
  const [view, setView] = useState<ViewName>("planner");

  // sync back to Notion when a session commits (notion mode only)
  const [syncDay, setSyncDay] = useState<string | null>(null);
  const timer = useTimer((s: Session) => setSyncDay(studyDayKey(s.startTs, startHour)));
  const { state: timerState, sessions } = timer;

  const todayKey = studyDayKey(now, startHour);
  const [viewedDateKey, setViewedDateKey] = useState<string>(todayKey);

  // schedule data
  const [daySchedule, setDaySchedule] = useState<DaySchedule | null>(null);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const ym = ymOfKey(todayKey);

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
      .getMonth(ym)
      .then((e) => alive && setMonthEvents(e))
      .catch(() => alive && setMonthEvents([]));
    return () => {
      alive = false;
    };
  }, [ym]);

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
  const toggleTodo = (ev: CalendarEvent) => {
    setTodos((prev) => {
      const cur = ev.id in prev ? prev[ev.id] : ev.date < todayKey;
      const next = { ...prev, [ev.id]: !cur };
      saveTodos(next);
      return next;
    });
  };
  const isDone = (ev: CalendarEvent) => (ev.id in todos ? todos[ev.id] : ev.date < todayKey);

  // ---- derived values ----
  const sel = subById(timerState.selectedId)!;
  const viewedIsToday = viewedDateKey === todayKey;
  const live: LiveSegment | undefined =
    timer.liveStartTs != null ? { subjectId: timerState.selectedId, startTs: timer.liveStartTs, running: true } : undefined;

  const secToday = secBySubjectForDay(sessions, todayKey, startHour, live, now);
  const elapsedSec = Math.floor(timer.elapsedMs / 1000);

  // subject rows for "오늘 과목": planned-today ∪ studied-today ∪ selected
  const subjectRows: SubjectRow[] = useMemo(() => {
    const ids = new Set<number>();
    for (const b of daySchedule?.timed ?? []) if (b.subjectId != null) ids.add(b.subjectId);
    for (const k of Object.keys(secToday)) ids.add(Number(k));
    ids.add(timerState.selectedId);
    return [...ids]
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
          _sec: sec,
        };
      })
      .sort((a, b) => b._sec - a._sec)
      .map(({ _sec, ...r }) => r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daySchedule, timerState.selectedId, timerState.running, JSON.stringify(secToday)]);

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

  const [yy, mm] = ym.split("-").map(Number);
  const monthLabel = `${yy}년 ${mm}월`;

  return (
    <div style={{ width: "100vw", height: "100dvh", display: "flex", background: "#faf9f6", color: "#2b2a27", overflow: "hidden", position: "relative", fontSize: 14 }}>
      <SideNav view={view} onChange={setView} />

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {view === "planner" && (
          <PlannerView
            todayTotalStr={fmtHM(totalSecForDay(secToday))}
            headerDateLabel={longDateLabel(todayKey)}
            dDay={dDayTo(todayKey, VACATION_END)}
            timerSubject={sel}
            remainingStr={fmtHM(Math.max(0, (sel.goalH - sel.doneH) * 3600 - elapsedSec))}
            elapsedStr={fmtHMS(elapsedSec)}
            running={timerState.running}
            onToggle={timer.toggleRun}
            onReset={timer.resetRun}
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
            ym={ym}
            monthLabel={monthLabel}
            synced={dataSource.kind === "notion"}
            eventsByDay={eventsByDay}
            todayKey={todayKey}
            selectedDay={calDay}
            accent={sel.solid}
            onSelectDay={setCalDay}
          />
        )}

        {view === "record" && (
          <RecordView sessions={sessions} startHour={startHour} todayKey={todayKey} accentSolid={sel.solid} monthLabel={monthLabel} />
        )}
      </main>

      {calDay && (
        <DayDetailModal
          dateKey={calDay}
          events={eventsByDay.get(calDay) ?? []}
          isToday={calDay === todayKey}
          accent={sel.solid}
          isDone={isDone}
          onToggle={toggleTodo}
          onClose={() => setCalDay(null)}
        />
      )}
    </div>
  );
}
