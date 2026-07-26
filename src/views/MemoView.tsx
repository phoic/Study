import { useMemo, useState } from "react";
import type { ReviewNote } from "../types";
import { SUBJECTS, subById } from "../data/subjects";
import { INK, cardSoft, chip as glassChip } from "../lib/glass";

interface Props {
  notes: ReviewNote[];
  selectedId: number; // 기본 프리필 과목 (타이머 선택 과목)
  onAdd: (subjectId: number, text: string, dueTs: number | null) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  stacked?: boolean; // 모바일 세로 레이아웃
}

const DUE_OPTS: Array<{ label: string; days: number | null }> = [
  { label: "없음", days: null },
  { label: "내일", days: 1 },
  { label: "3일", days: 3 },
  { label: "1주", days: 7 },
];

function dueLabel(dueTs: number, now: number): string {
  const days = Math.round((dueTs - now) / 86_400_000);
  if (days <= 0) return "복습 대기";
  if (days === 1) return "내일 복습";
  return `${days}일 후 복습`;
}

// 재풀이 메모 — "다시 풀 문제"를 과목별로 적어두는 별도 화면. 기록처럼 로컬+KV로
// 기기 간 유지된다(App에서 동기화). 복습 시점(dueTs)이 지난 항목은 상단에 강조.
export function MemoView({ notes, selectedId, onAdd, onToggle, onDelete, stacked = false }: Props) {
  const now = Date.now();
  const [draftSubject, setDraftSubject] = useState<number>(selectedId);
  const [draftText, setDraftText] = useState("");
  const [draftDue, setDraftDue] = useState<number | null>(null); // days
  const [onlyPending, setOnlyPending] = useState(true);

  const submit = () => {
    const text = draftText.trim();
    if (!text) return;
    const dueTs = draftDue != null ? now + draftDue * 86_400_000 : null;
    onAdd(draftSubject, text, dueTs);
    setDraftText("");
    setDraftDue(null);
  };

  // 오늘 복습 대기: dueTs 지났고 아직 안 풀린 것
  const dueList = useMemo(
    () => notes.filter((n) => !n.done && n.dueTs != null && n.dueTs <= now).sort((a, b) => (a.dueTs ?? 0) - (b.dueTs ?? 0)),
    [notes, now],
  );

  const bySubject = useMemo(() => {
    const visible = onlyPending ? notes.filter((n) => !n.done) : notes;
    const m = new Map<number, ReviewNote[]>();
    for (const n of visible) {
      const arr = m.get(n.subjectId) ?? [];
      arr.push(n);
      m.set(n.subjectId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => Number(a.done) - Number(b.done) || b.createdTs - a.createdTs);
    // 과목 정의 순서대로
    return SUBJECTS.filter((s) => m.has(s.id)).map((s) => ({ subject: subById(s.id)!, items: m.get(s.id)! }));
  }, [notes, onlyPending]);

  const pill = (id: number) => {
    const s = subById(id)!;
    const on = draftSubject === id;
    return (
      <button
        key={id}
        onClick={() => setDraftSubject(id)}
        className="hoverable"
        style={{
          border: `1px solid ${on ? s.solid : "rgba(255,255,255,.6)"}`,
          background: on ? s.solid : "rgba(255,255,255,.5)",
          color: on ? "#fff" : INK.muted,
          borderRadius: 999,
          padding: "5px 11px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {s.name}
      </button>
    );
  };

  const card: React.CSSProperties = {
    ...cardSoft,
    borderRadius: 18,
    padding: stacked ? "14px 15px" : "18px 20px",
  };

  const noteItem = (n: ReviewNote) => {
    const s = subById(n.subjectId)!;
    return (
      <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderTop: "1px solid rgba(90,80,110,.1)" }}>
        <button
          onClick={() => onToggle(n.id)}
          className="hoverable"
          aria-label={n.done ? "미완료로" : "다시 풀었음"}
          style={{
            flex: "none",
            width: 22,
            height: 22,
            marginTop: 1,
            borderRadius: 7,
            border: `1.6px solid ${n.done ? s.solid : "rgba(90,80,110,.28)"}`,
            background: n.done ? s.solid : "rgba(255,255,255,.6)",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {n.done && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              color: n.done ? "#b3b0a7" : "#3a382f",
              textDecoration: n.done ? "line-through" : "none",
              wordBreak: "break-word",
            }}
          >
            {n.text}
          </div>
          {n.dueTs != null && !n.done && (
            <div style={{ fontSize: 11, fontWeight: 600, color: n.dueTs <= now ? "#c0392b" : "#a8a59d", marginTop: 3 }}>
              {dueLabel(n.dueTs, now)}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(n.id)}
          className="hoverable"
          aria-label="삭제"
          style={{ flex: "none", border: 0, background: "transparent", color: "#c4c1b8", cursor: "pointer", padding: 4, marginTop: 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div style={stacked ? { display: "flex", flexDirection: "column", gap: 14 } : { flex: 1, display: "flex", flexDirection: "column", padding: "26px 34px 30px", minHeight: 0, overflowY: "auto" }}>
      {!stacked && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>재풀이 메모</div>
          <div style={{ fontSize: 12.5, color: INK.muted, fontWeight: 600, ...glassChip, padding: "5px 11px", borderRadius: 9 }}>다시 풀 문제</div>
        </div>
      )}

      {/* 입력 */}
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{SUBJECTS.map((s) => pill(s.id))}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="다시 풀 문제 (예: 9월 모평 21번, 킬러 확통)"
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px solid rgba(255,255,255,.7)",
              borderRadius: 11,
              padding: "10px 12px",
              fontSize: 14,
              background: "rgba(255,255,255,.55)",
              color: INK.strong,
              outline: "none",
            }}
          />
          <button
            onClick={submit}
            className="hoverable"
            style={{ flex: "none", border: 0, borderRadius: 11, background: "linear-gradient(160deg,oklch(0.72 0.14 285/.95),oklch(0.66 0.13 250/.95))", color: "#fff", fontSize: 14, fontWeight: 700, padding: "0 18px", cursor: "pointer", boxShadow: "0 6px 16px -8px oklch(0.6 0.15 280/.7)" }}
          >
            추가
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, color: "#9a978f", fontWeight: 600 }}>언제 다시</span>
          {DUE_OPTS.map((o) => {
            const on = draftDue === o.days;
            return (
              <button
                key={o.label}
                onClick={() => setDraftDue(o.days)}
                className="hoverable"
                style={{
                  border: `1px solid ${on ? "rgba(90,80,110,.5)" : "rgba(255,255,255,.6)"}`,
                  background: on ? "rgba(74,70,86,.92)" : "rgba(255,255,255,.5)",
                  color: on ? "#fff" : INK.faint,
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 오늘 복습 대기 */}
      {dueList.length > 0 && (
        <div style={{ ...card, border: "1px solid rgba(192,57,43,.3)", background: "linear-gradient(160deg,rgba(255,244,242,.8),rgba(255,238,236,.5))" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#c0392b", marginBottom: 4 }}>오늘 복습 대기 · {dueList.length}</div>
          {dueList.map(noteItem)}
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "대기", v: true },
          { label: "전체", v: false },
        ].map((f) => {
          const on = onlyPending === f.v;
          return (
            <button
              key={f.label}
              onClick={() => setOnlyPending(f.v)}
              className="hoverable"
              style={{
                border: `1px solid ${on ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.4)"}`,
                background: on ? "rgba(255,255,255,.6)" : "transparent",
                color: on ? "#4a4656" : INK.faint,
                borderRadius: 9,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 과목별 목록 */}
      {bySubject.length === 0 ? (
        <div style={{ textAlign: "center", color: "#b3b0a7", fontSize: 13, padding: "36px 0" }}>
          {onlyPending ? "복습 대기 중인 문제가 없어요." : "아직 메모가 없어요. 위에서 추가해 보세요."}
        </div>
      ) : (
        bySubject.map(({ subject, items }) => (
          <div key={subject.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: subject.solid }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#4a4840" }}>{subject.name}</span>
              <span style={{ fontSize: 11.5, color: "#b3b0a7", fontWeight: 600 }}>· {items.length}</span>
            </div>
            {items.map(noteItem)}
          </div>
        ))
      )}
    </div>
  );
}
