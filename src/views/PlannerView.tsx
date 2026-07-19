import type { AllDayItem, SubjectResolved } from "../types";
import type { ActualCell, PlannedCell } from "../lib/sessions";
import { TimerCard } from "../components/TimerCard";
import { SubjectList, type SubjectRow } from "../components/SubjectList";
import { DayGrid } from "../components/DayGrid";
import { AllDayStrip } from "../components/AllDayStrip";

export interface PlannerViewProps {
  todayTotalStr: string;
  headerDateLabel: string;
  dDay: number;
  timerSubject: SubjectResolved;
  remainingStr: string;
  elapsedStr: string;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  subjectRows: SubjectRow[];
  onSelect: (id: number) => void;
  gridDateLabel: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  allDay: AllDayItem[];
  plannedCells: Map<number, PlannedCell>;
  actualCells: Map<number, ActualCell>;
  startHour: number;
  rowHeight: number;
  nowSecOfDay: number | null;
}

const arrowBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  border: "1px solid rgba(0,0,0,.09)",
  borderRadius: 9,
  background: "#fff",
  color: "#8a8880",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export function PlannerView(p: PlannerViewProps) {
  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
      {/* left: timer + subjects */}
      <section
        style={{
          width: 398,
          flex: "none",
          borderRight: "1px solid rgba(0,0,0,.06)",
          display: "flex",
          flexDirection: "column",
          padding: "26px 26px 20px",
          background: "#faf9f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, color: "#9a978f", fontWeight: 600, letterSpacing: ".02em" }}>오늘 총 공부</div>
            <div className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.01em", marginTop: 2 }}>
              {p.todayTotalStr}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#9a978f", fontWeight: 600 }}>{p.headerDateLabel}</div>
            <div style={{ fontSize: 12, color: "#c0bdb4", marginTop: 3 }}>여름방학 D-{p.dDay}</div>
          </div>
        </div>

        <TimerCard
          subject={p.timerSubject}
          remainingStr={p.remainingStr}
          elapsedStr={p.elapsedStr}
          running={p.running}
          onToggle={p.onToggle}
          onReset={p.onReset}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "24px 2px 12px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6d6a62" }}>오늘 과목</span>
          <span style={{ fontSize: 11, color: "#b3b0a7", fontWeight: 600 }}>오늘 공부한 시간</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", margin: "0 -6px", padding: "0 6px" }}>
          <SubjectList rows={p.subjectRows} onSelect={p.onSelect} />
        </div>
      </section>

      {/* right: day grid */}
      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#faf9f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 30px 14px" }}>
          <button onClick={p.onPrevDay} className="hoverable" style={arrowBtn} aria-label="이전 날">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>{p.gridDateLabel}</div>
          <button onClick={p.onNextDay} className="hoverable" style={arrowBtn} aria-label="다음 날">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, fontSize: 11.5, color: "#a8a59d", fontWeight: 600 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 22, height: 11, borderRadius: 3, background: "oklch(0.94 0.045 255)" }} />
              계획
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 22, height: 11, borderRadius: 3, background: "oklch(0.64 0.13 255)" }} />
              실제
            </span>
          </div>
        </div>
        <div style={{ margin: "0 30px 12px" }}>
          <AllDayStrip items={p.allDay} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 30px 24px" }}>
          <DayGrid
            plannedCells={p.plannedCells}
            actualCells={p.actualCells}
            startHour={p.startHour}
            rowHeight={p.rowHeight}
            nowSecOfDay={p.nowSecOfDay}
            running={p.running}
          />
        </div>
      </section>
    </div>
  );
}
