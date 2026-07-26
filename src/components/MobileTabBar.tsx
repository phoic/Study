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

export function MobileTabBar({ tab, onChange }: Props) {
  return (
    <nav
      style={{
        position: "relative",
        zIndex: 20,
        flex: "none",
        background: "linear-gradient(180deg,rgba(255,255,255,.62),rgba(255,255,255,.78))",
        ...frost(30, 180),
        borderTop: "1px solid rgba(255,255,255,.7)",
        boxShadow: "0 -8px 24px -16px rgba(50,40,70,.3)",
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        padding: "9px 6px calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      {items.map((it) => {
        const on = tab === it.tab;
        return (
          <button
            key={it.tab}
            onClick={() => onChange(it.tab)}
            style={{
              border: 0,
              background: on ? "rgba(255,255,255,.72)" : "transparent",
              borderRadius: 15,
              color: on ? "#3f3a52" : "#a8a5b0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "6px 0",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {it.icon}
            <span style={{ fontSize: 10 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
