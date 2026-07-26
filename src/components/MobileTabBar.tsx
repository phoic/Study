import { useRef, useState } from "react";
import { frost } from "../lib/glass";

export type MobileTab = "timer" | "timeline" | "calendar" | "record" | "memo";

interface Props {
  tab: MobileTab;
  onChange: (t: MobileTab) => void;
}

const items: Array<{ tab: MobileTab; label: string; icon: React.ReactNode }> = [
  {
    tab: "timer",
    label: "타이머",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 13V9" strokeLinecap="round" />
        <path d="M9 2h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    tab: "timeline",
    label: "타임라인",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="4" y="3" width="16" height="18" rx="2.2" />
        <path d="M4 8h16M4 13h16M4 18h16M9 3v18" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    tab: "calendar",
    label: "캘린더",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="4.5" width="18" height="16" rx="2.2" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
    ),
  },
  {
    tab: "record",
    label: "기록",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <rect x="3.5" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="6.5" width="4" height="13.5" rx="1" />
        <rect x="16.5" y="3.5" width="4" height="16.5" rx="1" />
      </svg>
    ),
  },
  {
    tab: "memo",
    label: "메모",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
];

const PAD = 6; // capsule inner padding — the track the pill slides along
const N = items.length;
/** iOS-ish settle: fast out, long glide, no overshoot. */
const GLIDE = "transform .46s cubic-bezier(.32,.72,0,1)";

interface Track {
  left: number; // capsule's viewport x
  width: number; // track width (capsule minus padding)
  slot: number;
}

// 떠 있는 리퀴드 글라스 캡슐 탭바. 선택 표시는 알약 하나가 슬롯 사이를 미끄러지고,
// 잡고 끌면 손가락을 따라오다 놓는 순간 가장 가까운 탭에 붙는다.
export function MobileTabBar({ tab, onChange }: Props) {
  const capsuleRef = useRef<HTMLDivElement>(null);
  // 드래그 중 매 프레임 getBoundingClientRect를 부르면 레이아웃을 되풀이해 읽는다 —
  // 캡슐 위치는 드래그 동안 변하지 않으니 pointerdown에서 한 번만 재둔다.
  const trackRef = useRef<Track | null>(null);
  const downRef = useRef<{ x: number; moved: boolean } | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);

  const idx = Math.max(0, items.findIndex((i) => i.tab === tab));

  /** 손가락 중심에 알약을 맞춘 좌표(트랙 안으로 클램프). */
  const pillLeft = (clientX: number, t: Track) =>
    Math.min(Math.max(clientX - t.left - PAD - t.slot / 2, 0), t.width - t.slot);

  const t = trackRef.current;
  const dragLeft = dragX != null && t ? pillLeft(dragX, t) : null;
  // 끄는 동안에도 아이콘이 미리 살아나야 "붙잡고 있다"는 느낌이 난다.
  const activeIdx = dragLeft != null && t ? Math.round(dragLeft / t.slot) : idx;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = capsuleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = r.width - PAD * 2;
    trackRef.current = { left: r.left, width, slot: width / N };
    downRef.current = { x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = downRef.current;
    if (!d) return;
    // 탭과 드래그를 가르는 문턱 — 없으면 단순 탭에도 알약이 손가락으로 순간이동한다.
    if (!d.moved && Math.abs(e.clientX - d.x) < 6) return;
    d.moved = true;
    setDragX(e.clientX);
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = downRef.current;
    const tr = trackRef.current;
    downRef.current = null;
    setDragX(null);
    if (!d || !tr) return;
    const target = d.moved
      ? Math.round(pillLeft(e.clientX, tr) / tr.slot) // 끌던 중 → 가장 가까운 슬롯
      : Math.floor((e.clientX - tr.left - PAD) / tr.slot); // 그냥 탭 → 누른 슬롯
    const i = Math.min(Math.max(target, 0), N - 1);
    if (items[i].tab !== tab) onChange(items[i].tab);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        padding: "0 14px calc(10px + env(safe-area-inset-bottom))",
        pointerEvents: "none",
      }}
    >
      <div
        ref={capsuleRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={() => {
          downRef.current = null;
          setDragX(null);
        }}
        style={{
          position: "relative",
          pointerEvents: "auto",
          height: 62,
          padding: PAD,
          borderRadius: 999,
          display: "grid",
          gridTemplateColumns: `repeat(${N},1fr)`,
          background: "linear-gradient(180deg,rgba(255,255,255,.52),rgba(255,255,255,.74))",
          ...frost(30, 190),
          border: "1px solid rgba(255,255,255,.75)",
          boxShadow:
            "0 18px 40px -14px rgba(50,40,70,.45),0 2px 8px -4px rgba(50,40,70,.2),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.45)",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* 유리 윗면 반사 — 캡슐이 두께를 가진 것처럼 보이게 하는 얇은 하이라이트 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: 1,
            height: 20,
            borderRadius: "999px 999px 40% 40%/999px 999px 100% 100%",
            background: "linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0))",
            pointerEvents: "none",
          }}
        />

        {/* 슬라이딩 알약 */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: PAD,
            top: PAD,
            bottom: PAD,
            width: `calc((100% - ${PAD * 2}px) / ${N})`,
            borderRadius: 999,
            // 밝은 유리 위의 흰 알약은 묻힌다 — 아주 옅은 보라를 섞어 선택을 읽히게.
            background: "linear-gradient(160deg,rgba(255,255,255,.98),rgba(238,235,252,.82))",
            border: "1px solid rgba(255,255,255,.95)",
            boxShadow: "0 10px 20px -8px rgba(60,45,110,.42),0 1px 2px rgba(60,45,110,.12),inset 0 1px 0 rgba(255,255,255,1)",
            // 끄는 동안엔 살짝 늘어나며 따라온다(리퀴드), 놓으면 미끄러져 붙는다.
            transform:
              dragLeft != null
                ? `translateX(${dragLeft}px) scaleX(1.06)`
                : `translateX(${idx * 100}%) scaleX(1)`,
            transition: dragLeft != null ? "none" : `${GLIDE}, box-shadow .3s ease`,
            pointerEvents: "none",
          }}
        />

        {items.map((it, i) => {
          const on = i === activeIdx;
          return (
            <button
              key={it.tab}
              onClick={() => onChange(it.tab)}
              aria-label={it.label}
              aria-current={it.tab === tab ? "page" : undefined}
              style={{
                position: "relative",
                border: 0,
                background: "transparent",
                padding: 0,
                color: on ? "#3b3550" : "#95919f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "color .25s ease, transform .25s ease",
                transform: on ? "scale(1.06)" : "scale(1)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {it.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
