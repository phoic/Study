export type MobileTab = "timer" | "timeline" | "calendar" | "record";

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
];

export function MobileTabBar({ tab, onChange }: Props) {
  return (
    <nav
      style={{
        flex: "none",
        height: 64,
        background: "rgba(250,249,246,.92)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(0,0,0,.07)",
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
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
              background: "transparent",
              color: on ? "#2b2a27" : "#b3b0a7",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {it.icon}
            <span style={{ fontSize: 10.5 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
