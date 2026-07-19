import type { SubjectResolved } from "../types";

interface Props {
  subject: SubjectResolved;
  remainingStr: string;
  elapsedStr: string;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export function TimerCard({ subject, remainingStr, elapsedStr, running, onToggle, onReset }: Props) {
  const el = elapsedStr !== "00:00:00";
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,.06)",
        borderRadius: 20,
        padding: "22px 22px 20px",
        boxShadow: "0 1px 2px rgba(0,0,0,.03)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: subject.solid }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{subject.name}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#a8a59d", fontWeight: 600 }}>
          남은 목표 <span className="tnum" style={{ color: "#57544d" }}>{remainingStr}</span>
        </span>
      </div>

      <div
        className="tnum"
        style={{
          fontSize: 58,
          fontWeight: 800,
          letterSpacing: "-.03em",
          lineHeight: 1,
          textAlign: "center",
          padding: "8px 0 4px",
          color: running ? "#2b2a27" : "#c7c4bb",
        }}
      >
        {elapsedStr}
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: "#b3b0a7", margin: "8px 0 18px" }}>
        {running ? "기록 중 — 화면을 꺼도 이어집니다" : "과목을 고르고 시작하세요"}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onToggle}
          className="hoverable"
          style={{
            flex: 1,
            height: 52,
            border: 0,
            borderRadius: 15,
            background: subject.solid,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 6px 16px -6px ${subject.solid}`,
          }}
        >
          {running ? "일시정지" : el ? "이어서 시작" : "시작"}
        </button>
        <button
          onClick={onReset}
          className="hoverable"
          style={{
            width: 52,
            height: 52,
            flex: "none",
            border: "1px solid rgba(0,0,0,.1)",
            borderRadius: 15,
            background: "#fff",
            color: "#8a8880",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="리셋"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12a8 8 0 1 1 2.5 5.8M4 12V7m0 5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
