import type { ViewName } from "../types";
import { INK, logoMark, navActive, navIdle, navPane } from "../lib/glass";

interface Props {
  view: ViewName;
  onChange: (v: ViewName) => void;
}

const items: Array<{ view: ViewName; label: string; icon: React.ReactNode }> = [
  {
    view: "planner",
    label: "플래너",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="7" height="18" rx="1.6" />
        <rect x="14" y="3" width="7" height="10" rx="1.6" />
      </svg>
    ),
  },
  {
    view: "calendar",
    label: "캘린더",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="4.5" width="18" height="16" rx="2.2" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
    ),
  },
  {
    view: "record",
    label: "기록",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <rect x="3.5" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="6.5" width="4" height="13.5" rx="1" />
        <rect x="16.5" y="3.5" width="4" height="16.5" rx="1" />
      </svg>
    ),
  },
  {
    view: "memo",
    label: "메모",
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </svg>
    ),
  },
];

export function SideNav({ view, onChange }: Props) {
  return (
    <nav
      style={{
        position: "relative",
        zIndex: 1,
        width: 80,
        flex: "none",
        ...navPane,
        borderRight: "1px solid rgba(255,255,255,.45)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 0 20px",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          ...logoMark,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            border: "2.4px solid #fff",
            borderRadius: "50%",
            borderRightColor: "transparent",
            transform: "rotate(-40deg)",
          }}
        />
      </div>

      {items.map((it) => {
        const on = view === it.view;
        return (
          <button
            key={it.view}
            onClick={() => onChange(it.view)}
            className="hoverable"
            style={{
              width: 58,
              height: 60,
              ...(on ? navActive : navIdle),
              borderRadius: 17,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            {it.icon}
            <span style={{ fontSize: 11, fontWeight: 600 }}>{it.label}</span>
          </button>
        );
      })}

      <div style={{ flex: 1 }} />
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "rgba(255,255,255,.5)",
          border: "1px solid rgba(255,255,255,.7)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: INK.muted,
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        공
      </div>
    </nav>
  );
}
