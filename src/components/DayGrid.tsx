import type { ActualCell, PlannedCell } from "../lib/sessions";
import { hourLabel } from "../lib/time";
import { subById } from "../data/subjects";

interface Props {
  plannedCells: Map<number, PlannedCell>;
  actualCells: Map<number, ActualCell>;
  startHour: number;
  rowHeight: number;
  nowSecOfDay: number | null; // null → hide the now-line (not viewing today)
  running: boolean;
}

// Ported from buildGrid()/cellMaps(): 24 rows starting at `startHour`, each row
// = 6 ten-minute cells. Planned = subject tint fill; actual = solid overlay
// whose width is the cell's studied fraction; the live cell pulses.
export function DayGrid({ plannedCells, actualCells, startHour, rowHeight, nowSecOfDay, running }: Props) {
  const rows = [];
  for (let r = 0; r < 24; r++) {
    const hour = (startHour + r) % 24;
    const { ap, h12 } = hourLabel(hour);
    const cells = [
      <div
        key="l"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          gap: 3,
          paddingRight: 8,
          paddingTop: 2,
          borderRight: "1px solid rgba(0,0,0,.08)",
        }}
      >
        <span style={{ fontSize: 9, color: "#c4c1b8", fontWeight: 600, marginTop: 1 }}>{hour % 12 === 0 ? ap : ""}</span>
        <span className="tnum" style={{ fontSize: 12, color: "#8a8880", fontWeight: 600 }}>
          {h12}
        </span>
      </div>,
    ];
    for (let c = 0; c < 6; c++) {
      const cellIdx = hour * 6 + c;
      const pl = plannedCells.get(cellIdx);
      const ac = actualCells.get(cellIdx);
      const plTint = pl ? subById(pl.subjectId)?.tint ?? "transparent" : "transparent";
      cells.push(
        <div
          key={c}
          style={{
            position: "relative",
            borderRight: c === 5 ? "none" : "1px solid rgba(0,0,0,.045)",
            borderBottom: "1px solid rgba(0,0,0,.05)",
            background: plTint,
          }}
        >
          {ac && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 2,
                bottom: 2,
                width: `calc(${ac.frac * 100}% - 1px)`,
                background: subById(ac.subjectId)?.solid ?? "#999",
                borderRadius: 3,
                animation: ac.live && running ? "livepulse 1.4s ease-in-out infinite" : "none",
              }}
            />
          )}
        </div>,
      );
    }
    rows.push(
      <div
        key={r}
        style={{
          display: "grid",
          gridTemplateColumns: "42px repeat(6,1fr)",
          height: rowHeight,
          borderTop: hour === startHour ? "1px solid rgba(0,0,0,.08)" : "none",
        }}
      >
        {cells}
      </div>,
    );
  }

  let nowLine = null;
  if (nowSecOfDay != null) {
    const nowHour = Math.floor(nowSecOfDay / 3600);
    const nri = (nowHour - startHour + 24) % 24;
    const top = (nri + (nowSecOfDay % 3600) / 3600) * rowHeight;
    nowLine = (
      <div
        style={{
          position: "absolute",
          left: 42,
          right: 0,
          top,
          height: 0,
          borderTop: "2px solid oklch(0.62 0.19 25)",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -4,
            top: -4,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "oklch(0.62 0.19 25)",
            animation: "nowdot 1.8s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", background: "#fff", border: "1px solid rgba(0,0,0,.07)", borderRadius: 14, overflow: "hidden" }}>
      {rows}
      {nowLine}
    </div>
  );
}
