import type { Session } from "../types";
import { SUBJECTS, subById } from "../data/subjects";
import { addDaysKey, fmtHM, studyDayKey, weekdayOfKey } from "../lib/time";

interface Props {
  sessions: Session[];
  startHour: number;
  todayKey: string;
  accentSolid: string;
  monthLabel: string;
}

const card = (children: React.ReactNode, extra: React.CSSProperties = {}) => (
  <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 2px rgba(0,0,0,.03)", ...extra }}>
    {children}
  </div>
);
const label = (t: string) => <div style={{ fontSize: 12, color: "#9a978f", fontWeight: 700 }}>{t}</div>;

// Ported from buildMonth(): fed by the real session log instead of mock demo
// numbers. Cumulative = baseline doneH + this month's recorded actuals.
export function RecordView({ sessions, startHour, todayKey, accentSolid, monthLabel }: Props) {
  const monthKey = todayKey.slice(0, 7);

  // aggregate sessions
  const bySubjectSec: Record<number, number> = {};
  const byDaySec: Record<string, number> = {};
  let monthTotalSec = 0;
  for (const s of sessions) {
    const day = studyDayKey(s.startTs, startHour);
    const sec = Math.max(0, Math.floor((s.endTs - s.startTs) / 1000));
    byDaySec[day] = (byDaySec[day] ?? 0) + sec;
    if (day.startsWith(monthKey)) {
      bySubjectSec[s.subjectId] = (bySubjectSec[s.subjectId] ?? 0) + sec;
      monthTotalSec += sec;
    }
  }
  const activeDays = Object.keys(byDaySec).filter((d) => d.startsWith(monthKey) && byDaySec[d] > 0).length;
  const dailyAvgSec = monthTotalSec / Math.max(1, activeDays);

  const doneHOf = (id: number) => (subById(id)!.doneH ?? 0) + (bySubjectSec[id] ?? 0) / 3600;
  const totalDoneH = SUBJECTS.reduce((a, s) => a + doneHOf(s.id), 0);
  const totalGoalH = SUBJECTS.reduce((a, s) => a + s.goalH, 0);
  const goalPct = Math.round((totalDoneH / totalGoalH) * 100);

  const stat = (t: string, v: string, sub: string, subColor?: string) =>
    card(
      [
        <div key={0}>{label(t)}</div>,
        <div key={1} className="tnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", marginTop: 6 }}>
          {v}
        </div>,
        <div key={2} style={{ fontSize: 11.5, color: subColor ?? "#b3b0a7", fontWeight: 600, marginTop: 4 }}>
          {sub}
        </div>,
      ],
      { flex: 1 },
    );

  const topRow = (
    <div style={{ display: "flex", gap: 14 }}>
      {stat("이번 달 누적", fmtHM(monthTotalSec), "실제 기록 기준", "oklch(0.55 0.12 150)")}
      {stat("하루 평균", fmtHM(dailyAvgSec), activeDays ? `기록 있는 ${activeDays}일 기준` : "아직 기록 없음")}
      {stat("목표 달성률", `${goalPct}%`, `총 ${Math.round(totalGoalH)}h 중 ${Math.round(totalDoneH)}h`)}
    </div>
  );

  // per-subject cumulative bars
  const maxH = Math.max(...SUBJECTS.map((s) => s.goalH));
  const sorted = [...SUBJECTS].sort((a, b) => doneHOf(b.id) - doneHOf(a.id));
  const subjRows = sorted.map((raw) => {
    const s = subById(raw.id)!;
    const doneH = doneHOf(raw.id);
    return (
      <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
        <span style={{ width: 10, height: 10, flex: "none", borderRadius: 3, background: s.solid }} />
        <span style={{ width: 82, flex: "none", fontSize: 12.5, fontWeight: 600, color: "#4a4840", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {s.name}
        </span>
        <div style={{ flex: 1, height: 10, borderRadius: 6, background: "#f0eee7", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(s.goalH / maxH) * 100}%`, background: s.tint }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(1, doneH / maxH) * 100}%`, background: s.solid, borderRadius: 6 }} />
        </div>
        <span className="tnum" style={{ width: 76, flex: "none", textAlign: "right", fontSize: 11.5, fontWeight: 700, color: "#57544d" }}>
          {doneH.toFixed(doneH < 10 ? 1 : 0)}/{s.goalH}h
        </span>
      </div>
    );
  });
  const subjCard = card(
    [<div key={0} style={{ marginBottom: 16 }}>{label("과목별 누적")}</div>, ...subjRows],
    { flex: 1.15, display: "flex", flexDirection: "column" },
  );

  // 14-day daily bars
  const days = Array.from({ length: 14 }, (_, i) => {
    const dayKey = addDaysKey(todayKey, -(13 - i));
    return { dayKey, sec: byDaySec[dayKey] ?? 0, today: dayKey === todayKey, dnum: Number(dayKey.slice(-2)) };
  });
  const maxD = Math.max(1, ...days.map((d) => d.sec), 3600 * 4); // at least a 4h ceiling for scale
  const bars = (
    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 6, minHeight: 0 }}>
      {days.map((x) => (
        <div key={x.dayKey} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 20,
              height: `${Math.min(1, x.sec / maxD) * 100}%`,
              minHeight: x.sec > 0 ? 4 : 0,
              background: x.today ? accentSolid : weekdayOfKey(x.dayKey) % 6 === 0 ? "#e4e0d5" : "#d9d5ca",
              borderRadius: "5px 5px 3px 3px",
            }}
          />
          <span className="tnum" style={{ fontSize: 9.5, color: x.today ? "#57544d" : "#b3b0a7", fontWeight: x.today ? 700 : 500 }}>
            {x.dnum}
          </span>
        </div>
      ))}
    </div>
  );
  const dailyCard = card(
    [<div key={0} style={{ marginBottom: 16 }}>{label("일별 공부량 · 최근 14일")}</div>, bars],
    { flex: 1, display: "flex", flexDirection: "column" },
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "26px 34px 30px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>학습 기록</div>
        <div style={{ fontSize: 12.5, color: "#a8a59d", fontWeight: 600, background: "#f2f0ea", padding: "5px 11px", borderRadius: 8 }}>{monthLabel}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {topRow}
        <div style={{ flex: 1, display: "flex", gap: 14, minHeight: 0 }}>
          {subjCard}
          {dailyCard}
        </div>
      </div>
    </div>
  );
}
