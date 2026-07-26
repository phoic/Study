import type { CalendarEvent } from "../types";
import { subById } from "../data/subjects";
import { weekdayOfKey } from "../lib/time";
import { INK, frost } from "../lib/glass";

interface Props {
  ym: string;
  eventsByDay: Map<string, CalendarEvent[]>;
  todayKey: string;
  accent: string;
  onSelectDay: (dateKey: string) => void;
}

const wd = ["일", "월", "화", "수", "목", "금", "토"];
const wcol = (i: number) => (i === 0 ? "oklch(0.6 0.16 25)" : i === 6 ? "oklch(0.55 0.11 250)" : INK.faint);
const pad2 = (n: number) => String(n).padStart(2, "0");

// Compact month grid for phones (ported from the mobile prototype): day number +
// up to 3 subject dots. Tap a day to open the detail sheet.
export function MobileCalendar({ ym, eventsByDay, todayKey, accent, onSelectDay }: Props) {
  const [y, mo] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < first; i++) cells.push(<div key={`b${i}`} />);
  for (let d = 1; d <= dim; d++) {
    const dateKey = `${ym}-${pad2(d)}`;
    const events = eventsByDay.get(dateKey) ?? [];
    const active = events.length > 0;
    const today = dateKey === todayKey;
    const wday = weekdayOfKey(dateKey);
    const weekend = wday === 0 || wday === 6;
    const dots = events.slice(0, 3).map((e, k) => (
      <span key={k} style={{ width: 5, height: 5, borderRadius: "50%", background: subById(e.subjectId)?.solid ?? INK.hint }} />
    ));
    cells.push(
      <div
        key={d}
        onClick={active ? () => onSelectDay(dateKey) : undefined}
        style={{
          aspectRatio: "1 / 1.15",
          background: active ? (weekend ? "rgba(255,255,255,.34)" : "rgba(255,255,255,.55)") : "rgba(255,255,255,.16)",
          ...(active ? frost(14, 150) : {}),
          border: "1px solid rgba(255,255,255,.55)",
          borderRadius: 13,
          padding: "5px 0 6px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          opacity: active ? 1 : 0.42,
          cursor: active ? "pointer" : "default",
        }}
      >
        <span
          className="tnum"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 9,
            fontSize: 13.5,
            fontWeight: today ? 800 : 600,
            color: today ? "#fff" : wcol(wday),
            background: today ? accent : "transparent",
          }}
        >
          {d}
        </span>
        <div style={{ display: "flex", gap: 3, height: 5 }}>{dots}</div>
      </div>,
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 8 }}>
        {wd.map((d, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: wcol(i), textAlign: "center" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>{cells}</div>
    </div>
  );
}
