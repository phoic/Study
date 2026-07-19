// Subject colors, ported from the prototype: a solid fill and a light tint,
// both derived from the subject's hue in oklch (so planned = tint, actual = solid).

export function solidOf(hue: number): string {
  return `oklch(0.64 0.13 ${hue})`;
}

export function tintOf(hue: number): string {
  return `oklch(0.94 0.045 ${hue})`;
}
