import { row as glassRow } from "../lib/glass";

export interface SubjectRow {
  id: number;
  name: string;
  solid: string;
  todayStr: string;
  dGoalStr: string;
  pct: string; // e.g. "42%"
  timeColor: string;
  on: boolean;
  recommended?: boolean; // 자투리 추천 — 가장 뒤처진 과목
}

interface Props {
  rows: SubjectRow[];
  onSelect: (id: number) => void;
}

export function SubjectList({ rows, onSelect }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className="hoverable"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            textAlign: "left",
            ...glassRow(s.on),
            ...(s.recommended && {
              background: "linear-gradient(160deg,rgba(255,252,242,.86),rgba(255,248,232,.55))",
              border: "1px solid rgba(226,178,92,.55)",
            }),
            borderRadius: 18,
            padding: "13px 14px",
            cursor: "pointer",
          }}
        >
          <span style={{ width: 6, height: 38, flex: "none", borderRadius: 4, background: s.solid }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: "#3a3840",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.name}
              </span>
              {s.recommended && (
                <span
                  style={{
                    flex: "none",
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "#a86e15",
                    background: "rgba(250,235,205,.85)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  지금 추천 ⚡
                </span>
              )}
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(120,110,140,.14)", marginTop: 7, overflow: "hidden" }}>
              <div style={{ height: "100%", width: s.pct, background: s.solid, borderRadius: 3 }} />
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", color: s.timeColor }}>
              {s.todayStr}
            </div>
            <div className="tnum" style={{ fontSize: 11, color: "#b3b0a7", fontWeight: 600, marginTop: 2 }}>
              목표 {s.dGoalStr}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
