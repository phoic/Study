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
}

export function CalendarView({ ym, monthLabel, synced, eventsByDay, todayKey, selectedDay, accent, onSelectDay }: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "26px 34px 30px", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>{monthLabel}</div>
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
