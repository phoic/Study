import type { ActualCell, PlannedCell } from "../lib/sessions";
import { hourLabel } from "../lib/time";
import { subById } from "../data/subjects";
import { GRID_LINE, INK, gridPane } from "../lib/glass";

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
          paddingLeft: 4,
          paddingRight: 6,
          paddingTop: 2,
          borderRight: GRID_LINE.label,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 9, color: INK.hint, fontWeight: 600, marginTop: 1 }}>{hour % 12 === 0 ? ap : ""}</span>
        <span className="tnum" style={{ fontSize: 12, color: INK.faint, fontWeight: 600 }}>
          {h12}
        </span>
      </div>,
    ];
    for (let c = 0; c < 6; c++) {
      const cellIdx = hour * 6 + c;
      const pl = plannedCells.get(cellIdx);
      const ac = actualCells.get(cellIdx);
      const plWash = pl ? subById(pl.subjectId)?.planned ?? "transparent" : "transparent";
      cells.push(
        <div
          key={c}
          style={{
            position: "relative",
            borderRight: c === 5 ? "none" : GRID_LINE.col,
            borderBottom: GRID_LINE.rowB,
            background: plWash,
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
                background: subById(ac.subjectId)?.bar ?? "rgba(140,130,160,.6)",
                borderRadius: 3,
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
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
          gridTemplateColumns: "48px repeat(6,1fr)",
          height: rowHeight,
          borderTop: hour === startHour ? GRID_LINE.label : "none",
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
          left: 48,
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
    <div style={{ position: "relative", ...gridPane, borderRadius: 16, overflow: "hidden" }}>
      {rows}
      {nowLine}
    </div>
  );
}
