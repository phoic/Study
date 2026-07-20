import type { CalendarEvent } from "../types";
import { CalendarMonth } from "../components/CalendarMonth";

interface Props {
  ym: string;
  monthLabel: string;
  synced: boolean;
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  selectedDay: string | null;
  accent: string;
  onSelectDay: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

const navBtn: React.CSSProperties = {
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

export function CalendarView({ ym, monthLabel, synced, eventsByDay, todayKey, selectedDay, accent, onSelectDay, onPrevMonth, onNextMonth, onToday }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "26px 34px 30px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onPrevMonth} className="hoverable" style={navBtn} aria-label="이전 달">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", minWidth: 108, textAlign: "center" }}>{monthLabel}</div>
        <button onClick={onNextMonth} className="hoverable" style={navBtn} aria-label="다음 달">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={onToday} className="hoverable" style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 700, color: "#6d6a62" }}>
          오늘
        </button>
        <div style={{ fontSize: 12.5, color: "#a8a59d", fontWeight: 600, background: "#f2f0ea", padding: "5px 11px", borderRadius: 8 }}>
          내 계획 · 노션 연동
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a8a59d", fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: synced ? "oklch(0.64 0.13 150)" : "#c4c1b8" }} />
          {synced ? "노션 동기화됨" : "로컬 데이터"}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CalendarMonth
          ym={ym}
          eventsByDay={eventsByDay}
          todayKey={todayKey}
          selectedDay={selectedDay}
          accent={accent}
          onSelectDay={onSelectDay}
        />
      </div>
    </div>
  );
}
