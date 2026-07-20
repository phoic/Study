import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, DaySchedule, Session, ViewName } from "./types";
import { dataSource } from "./data/dataSource";
import { loadSettings, loadTodos, saveTodos } from "./data/store";
import { subById, subjectIdByName } from "./data/subjects";
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

  // useNow only drives idle re-renders; the timer hook re-renders every 250ms
  // while running. All live math below reads one fresh Date.now() so the big
  // timer and the "오늘 과목" times stay in lock-step (no 1s drift).
  useNow(1000);
  const now = Date.now();
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
            remainingStr={fmtHMlabel(remainingSec)}
            elapsedStr={fmtHMS(selTodaySec)}
            running={timerState.running}
            onToggle={timer.toggleRun}
            onReset={() => {
              if (typeof window !== "undefined" && !window.confirm(`오늘 '${sel.name}' 기록을 지울까요?`)) return;
              timer.clearSubjectDay(timerState.selectedId, todayKey, startHour);
              if (dataSource.kind === "notion") setSyncDay(todayKey);
            }}
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
