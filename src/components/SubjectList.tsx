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
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
            border: `1px solid ${s.recommended ? "rgba(210,140,40,.5)" : s.on ? "rgba(0,0,0,.12)" : "rgba(0,0,0,.05)"}`,
            background: s.recommended ? "#fdfaf2" : s.on ? "#f4f2ec" : "#fff",
            borderRadius: 13,
            padding: "11px 13px",
            cursor: "pointer",
          }}
        >
          <span style={{ width: 6, height: 38, flex: "none", borderRadius: 4, background: s.solid }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#3a382f",
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
                    color: "#b9791a",
                    background: "#faefd6",
                    borderRadius: 6,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  지금 추천 ⚡
                </span>
              )}
            </div>
            <div style={{ height: 4, borderRadius: 3, background: "#eeece5", marginTop: 7, overflow: "hidden" }}>
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
