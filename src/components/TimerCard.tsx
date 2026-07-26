import type { SubjectResolved } from "../types";
import { card, control } from "../lib/glass";

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
        position: "relative",
        ...card,
        borderRadius: 26,
        padding: "20px 20px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: subject.solid }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{subject.name}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#a8a59d", fontWeight: 600 }}>
          남은 목표 <span className="tnum" style={{ color: "#57544d" }}>{remainingStr}</span>
        </span>
      </div>

      <div
        className="tnum"
        style={{
          fontSize: 62,
          fontWeight: 700,
          letterSpacing: "-.03em",
          lineHeight: 1.15,
          textAlign: "center",
          padding: "8px 0 0",
          color: running ? "#2b2a35" : "#bab7c4",
        }}
      >
        {elapsedStr}
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "#a8a5b0", fontWeight: 600, margin: "4px 0 16px" }}>
        {running ? "기록 중 — 화면을 꺼도 이어집니다" : "과목을 고르고 시작하세요"}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onToggle}
          className="hoverable"
          style={{
            flex: 1,
            height: 56,
            border: "1px solid rgba(255,255,255,.5)",
            borderRadius: 18,
            background: `linear-gradient(160deg,${subject.solid},oklch(0.6 0.13 290))`,
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 12px 26px -10px rgba(60,45,110,.5),inset 0 1px 0 rgba(255,255,255,.5)",
          }}
        >
          {running ? "일시정지" : el ? "이어서 시작" : "시작"}
        </button>
        <button
          onClick={onReset}
          className="hoverable"
          style={{
            width: 56,
            height: 56,
            flex: "none",
            ...control,
            borderRadius: 18,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.85)",
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
