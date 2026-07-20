import type { CalendarEvent } from "../types";
import { subById } from "../data/subjects";
import { weekdayOfKey } from "../lib/time";

interface Props {
  ym: string; // YYYY-MM
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  selectedDay: string | null;
  accent: string;
  onSelectDay: (dateKey: string) => void;
}

const wd = ["일", "월", "화", "수", "목", "금", "토"];
const wcol = (i: number) => (i === 0 ? "oklch(0.6 0.16 25)" : i === 6 ? "oklch(0.55 0.11 250)" : "#8a8880");
const pad2 = (n: number) => String(n).padStart(2, "0");

// Ported from buildCalendar() (desktop): a month grid where each active day
// (has events) shows up to two event chips and is clickable to open the day
// detail. Today and the selected day are accented.
export function CalendarMonth({ ym, eventsByDay, todayKey, selectedDay, accent, onSelectDay }: Props) {
  const [y, mo] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < first; i++) cells.push(<div key={`b${i}`} style={{ background: "transparent" }} />);

  for (let d = 1; d <= dim; d++) {
    const dateKey = `${ym}-${pad2(d)}`;
    const events = eventsByDay.get(dateKey) ?? [];
    const active = events.length > 0;
    const today = dateKey === todayKey;
    const selected = dateKey === selectedDay;
    const wday = weekdayOfKey(dateKey);
    const weekend = wday === 0 || wday === 6;
    const shown = Math.min(events.length, 3);

    const evs: React.ReactNode[] = [];
    for (let k = 0; k < shown; k++) {
      const s = subById(events[k].subjectId);
      evs.push(
        <div
          key={k}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            borderLeft: `3px solid ${s?.solid ?? "#c4c1b8"}`,
            background: s?.tint ?? "#f0eee7",
            borderRadius: 5,
            padding: "3px 7px",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#3f3d36",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
              minWidth: 0,
            }}
          >
            {s?.name ?? events[k].title}
          </span>
          {events[k].time && (
            <span className="tnum" style={{ fontSize: 10, color: "#a8a59d", fontWeight: 700, flex: "none" }}>
              {events[k].time}
            </span>
          )}
        </div>,
      );
    }
    if (events.length > shown) {
      evs.push(
        <div key="m" style={{ fontSize: 10.5, color: "#b3b0a7", fontWeight: 700, paddingLeft: 4 }}>
          +{events.length - shown}개 더
        </div>,
      );
    }

    cells.push(
      <div
        key={d}
        onClick={active ? () => onSelectDay(dateKey) : undefined}
        style={{
          background: active ? (weekend ? "#f7f5f0" : "#fff") : "#fbfaf7",
          border: selected ? `2px solid ${accent}` : today ? `1.5px solid ${accent}` : "1px solid rgba(0,0,0,.07)",
          boxShadow: selected ? `0 4px 14px -6px ${accent}` : "none",
          borderRadius: 12,
          padding: selected ? "7px 8px 8px" : "8px 9px 9px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          opacity: active ? 1 : 0.4,
          minHeight: 0,
          overflow: "hidden",
          cursor: active ? "pointer" : "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
          <span
            className="tnum"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 22,
              height: 22,
              padding: "0 5px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: today ? 800 : 600,
              color: today ? "#fff" : wcol(wday),
              background: today ? accent : "transparent",
            }}
          >
            {d}
          </span>
        </div>
        {evs}
      </div>,
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 10 }}>
        {wd.map((d, i) => (
          <div key={i} style={{ fontSize: 12, fontWeight: 700, color: wcol(i), textAlign: "center" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "minmax(112px, 1fr)", gap: 8 }}>
          {cells}
        </div>
      </div>
    </div>
  );
}
