// Subject colors, ported from 공부 타이머 글래스.dc.html: a solid fill and a light
// tint derived from the subject's hue (planned = tint, actual = solid).
// The glass theme lifts lightness and drops chroma versus the old paper theme —
// saturated fills fight the frosted panes they sit on.

export function solidOf(hue: number): string {
  return `oklch(0.7 0.105 ${hue})`;
}

export function tintOf(hue: number): string {
  return `oklch(0.93 0.04 ${hue})`;
}

/** Planned-cell wash on the day grid — the tint at grid opacity. */
export function plannedOf(hue: number): string {
  return `oklch(0.9 0.06 ${hue} / .32)`;
}

/** Actual-time bar: a lit gradient so recorded blocks read as glass, not paint. */
export function barOf(hue: number): string {
  return `linear-gradient(160deg, oklch(0.72 0.14 ${hue} / .85), oklch(0.6 0.14 ${hue} / .62))`;
}
