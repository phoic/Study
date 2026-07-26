import type { AllDayItem } from "../types";
import { subById } from "../data/subjects";
import { chip } from "../lib/glass";

interface Props {
  items: AllDayItem[];
}

function labelFor(it: AllDayItem): string {
  if (it.endDate) {
    const [, mo, d] = it.endDate.split("-").map(Number);
    return `~${mo}/${d}`;
  }
  if (it.estH != null) return `예상 ${it.estH}h`;
  return "있음";
}

// The "종일·미지정" strip: date-only rows (Notion is_datetime=0) are shown as
// pills — presence only, never drawn on the time grid (doc §4-2/§5).
export function AllDayStrip({ items }: Props) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#b3b0a7", fontWeight: 700, flex: "none" }}>종일·미지정</span>
      {items.map((it) => {
        const s = subById(it.subjectId);
        return (
          <div
            key={it.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              ...chip,
              borderRadius: 11,
              padding: "5px 11px",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 3, background: s?.solid ?? "#c4c1b8" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#4a4840" }}>{it.title}</span>
            <span style={{ fontSize: 11, color: "#b3b0a7", fontWeight: 600 }}>{labelFor(it)}</span>
          </div>
        );
      })}
    </div>
  );
}
