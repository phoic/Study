import type { CalendarEvent } from "../types";
import { subById } from "../data/subjects";
import { weekdayName } from "../lib/time";

interface Props {
  dateKey: string;
  events: CalendarEvent[];
  isToday: boolean;
  accent: string;
  isDone: (ev: CalendarEvent) => boolean;
  onToggle: (ev: CalendarEvent) => void;
  onClose: () => void;
}

// Ported from buildDayModal()/buildDayDetail(): a centered card listing a day's
// planned todos with completion checkboxes.
export function DayDetailModal({ dateKey, events, isToday, accent, isDone, onToggle, onClose }: Props) {
  const [, mo, d] = dateKey.split("-").map(Number);
  const doneN = events.filter((e) => isDone(e)).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(40,38,34,.34)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 470, maxHeight: "82%", display: "flex", flexDirection: "column", position: "relative" }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 2,
            width: 30,
            height: 30,
            border: 0,
            borderRadius: 9,
            background: "#f2f0ea",
            color: "#8a8880",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="닫기"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div style={{ width: "100%", maxHeight: "100%", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 18, boxShadow: "0 24px 60px -20px rgba(40,38,34,.45)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingRight: 34 }}>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>
                {mo}월 {d}일
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#a8a59d" }}>({weekdayName(dateKey)})</span>
              {isToday && (
                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "#fff", background: accent, borderRadius: 6, padding: "2px 7px" }}>
                  오늘
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#b3b0a7", fontWeight: 600, marginTop: 6 }}>
              {events.length ? `할 일 ${doneN}/${events.length} 완료` : "휴식일"}
            </div>
          </div>

          {events.length === 0 ? (
            <div style={{ minHeight: 200, padding: 30, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#c4c1b8", gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #d9d5ca" }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>계획된 일정이 없어요</div>
            </div>
          ) : (
            <div style={{ overflowY: "auto", padding: 12, maxHeight: 440 }}>
              {events.map((e) => {
                const s = subById(e.subjectId);
                const done = isDone(e);
                const color = s?.solid ?? "#c4c1b8";
                return (
                  <button
                    key={e.id}
                    onClick={() => onToggle(e)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid rgba(0,0,0,.05)",
                      background: done ? "#f6f4ef" : "#fff",
                      borderRadius: 12,
                      padding: "11px 12px",
                      marginBottom: 7,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        flex: "none",
                        borderRadius: 7,
                        border: done ? 0 : "2px solid #d5d1c7",
                        background: done ? color : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      {done && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 6" />
                        </svg>
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: done ? "#b3b0a7" : "#3a382f",
                          textDecoration: done ? "line-through" : "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {e.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 3, background: color }} />
                        <span style={{ fontSize: 11, color: "#a8a59d", fontWeight: 600 }}>{s?.name ?? ""}</span>
                        <span className="tnum" style={{ fontSize: 11, color: "#c0bdb4", fontWeight: 600 }}>
                          {[e.time, e.dur].filter(Boolean).map((x) => `· ${x}`).join(" ")}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
