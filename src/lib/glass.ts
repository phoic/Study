// Glass design tokens, ported from 공부 타이머 글래스.dc.html.
//
// The whole app sits on one soft gradient with drifting color blobs; every
// surface above it is a frosted pane rather than an opaque card. Keeping the
// values here (instead of inline in each component) means the panes stay in
// lock-step — the prototype reuses the same handful of rgba/blur pairs
// everywhere, and drift between them is what makes glass UIs look muddy.

/** Page background — the gradient every frosted surface samples from. */
export const APP_BG = "linear-gradient(135deg,#eef1fb 0%,#f6eef7 45%,#eef6f4 100%)";

/** Ink colors on glass (cooler//lighter than the old paper theme). */
export const INK = {
  strong: "#2b2a27",
  body: "#3a382f",
  muted: "#7a7686",
  faint: "#8b8797",
  hint: "#b7b3c1",
} as const;

const blur = (px: number, sat = 0) =>
  sat ? `blur(${px}px) saturate(${sat}%)` : `blur(${px}px)`;

/** Cross-browser backdrop filter (Safari still needs the prefix). */
export function frost(px: number, sat = 0): React.CSSProperties {
  const v = blur(px, sat);
  return { backdropFilter: v, WebkitBackdropFilter: v };
}

/** The left rail / bottom bar: the most transparent pane in the system. */
export const navPane: React.CSSProperties = {
  background: "rgba(255,255,255,.32)",
  ...frost(30, 180),
};

/** Selected nav item — a brighter pane that reads as "lifted". */
export const navActive: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(255,255,255,.85),rgba(255,255,255,.5))",
  border: "1px solid rgba(255,255,255,.8)",
  color: "#4a4656",
  boxShadow: "0 6px 16px -8px rgba(50,40,70,.4),inset 0 1px 0 rgba(255,255,255,.9)",
};

export const navIdle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0)",
  color: INK.faint,
  boxShadow: "none",
};

/** Primary content card (timer, memo, record stats). */
export const card: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(255,255,255,.75),rgba(255,255,255,.42))",
  border: "1px solid rgba(255,255,255,.7)",
  boxShadow: "0 8px 28px -12px rgba(50,40,70,.35),inset 0 1px 0 rgba(255,255,255,.85)",
  ...frost(20),
};

/** Slightly flatter card used where several sit side by side. */
export const cardSoft: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(255,255,255,.68),rgba(255,255,255,.4))",
  border: "1px solid rgba(255,255,255,.65)",
  boxShadow: "0 8px 28px -14px rgba(50,40,70,.28),inset 0 1px 0 rgba(255,255,255,.8)",
  ...frost(20, 160),
};

/** Small controls: arrows, reset, close. */
export const control: React.CSSProperties = {
  background: "rgba(255,255,255,.5)",
  border: "1px solid rgba(255,255,255,.6)",
  color: INK.muted,
  ...frost(14),
};

/** Inline chip / badge (all-day items, month label). */
export const chip: React.CSSProperties = {
  background: "rgba(255,255,255,.5)",
  border: "1px solid rgba(255,255,255,.6)",
  ...frost(14),
};

/** List row — `on` is the selected subject. */
export function row(on: boolean): React.CSSProperties {
  return {
    background: on
      ? "linear-gradient(160deg,rgba(255,255,255,.78),rgba(255,255,255,.5))"
      : "linear-gradient(160deg,rgba(255,255,255,.55),rgba(255,255,255,.32))",
    border: `1px solid ${on ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.6)"}`,
    boxShadow: on
      ? "0 10px 24px -14px rgba(50,40,70,.4),inset 0 1px 0 rgba(255,255,255,.9)"
      : "inset 0 1px 0 rgba(255,255,255,.75)",
    ...frost(20, 160),
  };
}

/** Grouped list card — hairline-divided sections, so it carries no inner padding. */
export const groupCard: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(255,255,255,.66),rgba(255,255,255,.36))",
  border: "1px solid rgba(255,255,255,.66)",
  boxShadow: "0 10px 28px -16px rgba(50,40,70,.3),inset 0 1px 0 rgba(255,255,255,.85)",
  ...frost(24, 165),
};

/** Bottom sheet pane (phone add-sheet) — the brightest pane in the system. */
export const sheetPane: React.CSSProperties = {
  background: "linear-gradient(165deg,rgba(255,255,255,.86),rgba(255,255,255,.68))",
  border: "1px solid rgba(255,255,255,.8)",
  boxShadow: "0 26px 60px -20px rgba(50,40,80,.5),inset 0 1px 0 rgba(255,255,255,.95)",
  ...frost(40, 180),
};

/** Segmented control (대기 / 전체) — a tray with a lifted active pill. */
export const segmentTray: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: 4,
  background: "rgba(255,255,255,.42)",
  border: "1px solid rgba(255,255,255,.62)",
  borderRadius: 14,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.8)",
  ...frost(18),
};

export function segmentItem(on: boolean): React.CSSProperties {
  return {
    flex: 1,
    border: 0,
    borderRadius: 10,
    padding: "9px 0",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    background: on ? "linear-gradient(160deg,rgba(255,255,255,.96),rgba(255,255,255,.72))" : "transparent",
    color: on ? "#4a4656" : INK.muted,
    boxShadow: on ? "0 5px 14px -7px rgba(50,40,70,.4),inset 0 1px 0 rgba(255,255,255,.9)" : "none",
  };
}

/** Accent gradient shared by the primary CTA and the memo FAB. */
export const ACCENT_GRAD = "linear-gradient(160deg,oklch(0.7 0.14 285),oklch(0.6 0.13 300))";

/** The day-grid container. */
export const gridPane: React.CSSProperties = {
  background: "rgba(255,255,255,.5)",
  border: "1px solid rgba(255,255,255,.6)",
  boxShadow: "0 8px 28px -14px rgba(50,40,70,.3)",
  ...frost(18, 160),
};

/** Hairlines inside the grid — violet-tinted so they read on glass. */
export const GRID_LINE = {
  label: "1px solid rgba(90,80,110,.12)",
  col: "1px solid rgba(90,80,110,.06)",
  rowB: "1px solid rgba(90,80,110,.07)",
} as const;

/** Modal scrim + its floating pane. */
export const scrim: React.CSSProperties = {
  background: "rgba(60,50,80,.22)",
  ...frost(8),
};

export const modalPane: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(255,255,255,.82),rgba(255,255,255,.62))",
  border: "1px solid rgba(255,255,255,.7)",
  boxShadow: "0 30px 70px -20px rgba(50,40,70,.5),inset 0 1px 0 rgba(255,255,255,.9)",
  ...frost(40, 180),
};

/** Brand mark used in the sidebar. */
export const logoMark: React.CSSProperties = {
  background: "linear-gradient(160deg,oklch(0.72 0.14 285/.9),oklch(0.68 0.13 250/.9))",
  border: "1px solid rgba(255,255,255,.7)",
  boxShadow: "0 6px 16px -6px oklch(0.6 0.15 280/.6),inset 0 1px 0 rgba(255,255,255,.8)",
};
