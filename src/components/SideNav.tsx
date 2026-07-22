import type { ViewName } from "../types";

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
        width: 78,
        flex: "none",
        background: "#f2f0ea",
        borderRight: "1px solid rgba(0,0,0,.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 0 20px",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          background: "#2b2a27",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 26,
        }}
      >
        <div
          style={{
            width: 13,
            height: 13,
            border: "2.4px solid #faf9f6",
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
              width: 56,
              height: 58,
              border: 0,
              background: on ? "#2b2a27" : "transparent",
              color: on ? "#faf9f6" : "#9a978f",
              borderRadius: 15,
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
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#e2ded3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8a8880",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        공
      </div>
    </nav>
  );
}
