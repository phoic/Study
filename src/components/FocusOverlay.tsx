import type { SubjectResolved } from "../types";
import { APP_BG, INK, control, frost } from "../lib/glass";
import { GlassBackdrop } from "./GlassBackdrop";

interface Props {
  subject: SubjectResolved;
  elapsedStr: string;
  running: boolean;
  onToggle: () => void; // 일시정지 / 재개
  onExit: () => void; // 나가기 — 타이머 상태는 유지
  onAddNote: () => void; // ＋다시 풀 문제 (현재 과목 프리필)
}

// 집중 모드 — 타이머 시작 시 전환되는 전방위 오버레이. 산만한 플래너 UI를 가리고
// 과목·경과시간·최소 컨트롤만 남긴다. 타이머 상태(running/기록)는 여기서 건드리지
// 않으므로 나가기는 순수 화면 전환이다.
export function FocusOverlay({ subject, elapsedStr, running, onToggle, onExit, onAddNote }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: APP_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))",
      }}
    >
      <GlassBackdrop />

      {/* 나가기 (좌상단) */}
      <button
        onClick={onExit}
        className="hoverable"
        aria-label="집중 모드 나가기"
        style={{
          position: "absolute",
          zIndex: 1,
          top: "max(18px, env(safe-area-inset-top))",
          left: 18,
          width: 42,
          height: 42,
          ...control,
          borderRadius: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ width: 13, height: 13, borderRadius: 4, background: subject.solid }} />
        <span style={{ fontSize: 19, fontWeight: 700, color: INK.body }}>{subject.name}</span>
      </div>

      <div
        className="tnum"
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: "min(19vw, 128px)",
          fontWeight: 800,
          letterSpacing: "-.03em",
          lineHeight: 1,
          color: running ? INK.strong : INK.faint,
          margin: "8px 0 4px",
          textShadow: "0 2px 20px rgba(255,255,255,.6)",
        }}
      >
        {elapsedStr}
      </div>
      <div style={{ position: "relative", zIndex: 1, fontSize: 13, color: INK.muted, fontWeight: 600, marginBottom: 40 }}>
        {running ? "기록 중 — 화면을 꺼도 이어집니다" : "일시정지됨"}
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <button
          onClick={onToggle}
          className="hoverable"
          style={{
            width: 220,
            height: 60,
            border: running ? "1px solid rgba(255,255,255,.7)" : 0,
            borderRadius: 17,
            background: running ? "rgba(255,255,255,.62)" : subject.solid,
            color: running ? INK.muted : "#fff",
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            ...(running ? frost(16) : {}),
            boxShadow: running
              ? "inset 0 1px 0 rgba(255,255,255,.85)"
              : `0 10px 24px -8px ${subject.solid}`,
          }}
        >
          {running ? "일시정지" : "이어서 시작"}
        </button>
        <button
          onClick={onAddNote}
          className="hoverable"
          style={{
            border: 0,
            background: "transparent",
            color: INK.faint,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: "6px 10px",
          }}
        >
          ＋ 다시 풀 문제 메모
        </button>
      </div>
    </div>
  );
}
