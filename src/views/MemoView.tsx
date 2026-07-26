import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReviewNote } from "../types";
import { SUBJECTS, subById } from "../data/subjects";
import {
  ACCENT_GRAD,
  INK,
  cardSoft,
  chip as glassChip,
  frost,
  groupCard,
  scrim,
  segmentItem,
  segmentTray,
  sheetPane,
} from "../lib/glass";

interface Props {
  notes: ReviewNote[];
  selectedId: number; // 기본 프리필 과목 (타이머 선택 과목)
  onAdd: (subjectId: number, text: string, dueTs: number | null) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  stacked?: boolean; // 모바일 세로 레이아웃
}

const DUE_OPTS: Array<{ label: string; days: number | null }> = [
  { label: "미정", days: null },
  { label: "내일", days: 1 },
  { label: "3일", days: 3 },
  { label: "1주", days: 7 },
];

interface DueTone {
  label: string;
  fg: string;
  bg: string;
}

// 복습 시점을 남은 일수로 색 온도에 매핑한다 — 지났으면 붉게, 멀수록 차갑게.
function dueTone(dueTs: number | null | undefined, now: number): DueTone {
  if (dueTs == null) return { label: "날짜 미정", fg: "#a09daa", bg: "rgba(255,255,255,.45)" };
  const days = Math.round((dueTs - now) / 86_400_000);
  if (days <= 0) return { label: "복습 대기", fg: "oklch(0.5 0.16 25)", bg: "oklch(0.92 0.06 25/.7)" };
  if (days === 1) return { label: "내일 복습", fg: "oklch(0.5 0.15 25)", bg: "oklch(0.93 0.05 25/.6)" };
  if (days <= 3) return { label: `${days}일 후 복습`, fg: "oklch(0.48 0.12 262)", bg: "oklch(0.93 0.045 262/.6)" };
  return { label: `${days}일 후 복습`, fg: "oklch(0.46 0.1 175)", bg: "oklch(0.93 0.04 175/.6)" };
}

const addedLabel = (ts: number) => {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} 추가`;
};

const checkIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 6" />
  </svg>
);

// 재풀이 메모 — "다시 풀 문제"를 과목별로 적어두는 별도 화면. 기록처럼 로컬+KV로
// 기기 간 유지된다(App에서 동기화). 데스크톱은 입력줄이 상단에 붙박이로 있고,
// 모바일은 FAB → 바텀시트로 추가한다(목록이 화면을 다 쓰도록).
export function MemoView({ notes, selectedId, onAdd, onToggle, onDelete, stacked = false }: Props) {
  const now = Date.now();
  const [draftSubject, setDraftSubject] = useState<number>(selectedId);
  const [draftText, setDraftText] = useState("");
  const [draftDue, setDraftDue] = useState<number | null>(null); // days
  const [onlyPending, setOnlyPending] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheetOpen) inputRef.current?.focus();
  }, [sheetOpen]);

  const submit = () => {
    const text = draftText.trim();
    if (!text) return;
    const dueTs = draftDue != null ? now + draftDue * 86_400_000 : null;
    onAdd(draftSubject, text, dueTs);
    setDraftText("");
    setDraftDue(null);
    setSheetOpen(false);
  };

  // 시트는 열 때마다 타이머의 현재 과목으로 프리필 — 자투리로 풀다 걸린 문제를
  // 과목 고르는 단계 없이 바로 적을 수 있게.
  const openSheet = () => {
    setDraftSubject(selectedId);
    setDraftText("");
    setDraftDue(null);
    setSheetOpen(true);
  };

  const pendingCount = useMemo(() => notes.filter((n) => !n.done).length, [notes]);

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
    const tone = dueTone(n.dueTs, now);
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
          {n.done && checkIcon}
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
            <div style={{ fontSize: 11, fontWeight: 600, color: tone.fg, marginTop: 3 }}>{tone.label}</div>
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

  // ---------- 모바일: 세그먼트 + 과목 그룹 카드 + FAB/바텀시트 ----------
  if (stacked) {
    const mobileItem = (n: ReviewNote) => {
      const s = subById(n.subjectId)!;
      const tone = dueTone(n.dueTs, now);
      return (
        <div
          key={n.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,.4)",
            background: n.done ? "rgba(255,255,255,.14)" : "transparent",
          }}
        >
          <button
            onClick={() => onToggle(n.id)}
            aria-label={n.done ? "미완료로" : "다시 풀었음"}
            style={{
              width: 22,
              height: 22,
              flex: "none",
              marginTop: 1,
              border: n.done ? 0 : "1.5px solid rgba(120,110,140,.28)",
              background: n.done ? s.solid : "rgba(255,255,255,.5)",
              borderRadius: 7,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
            }}
          >
            {n.done && checkIcon}
          </button>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.35,
                color: n.done ? "#b0aeb8" : "#3a3840",
                textDecoration: n.done ? "line-through" : "none",
                wordBreak: "break-word",
              }}
            >
              {n.text}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: tone.fg,
                  background: tone.bg,
                  border: "1px solid rgba(255,255,255,.6)",
                  borderRadius: 7,
                  padding: "3px 8px",
                }}
              >
                {tone.label}
              </span>
              <span style={{ fontSize: 11, color: "#b0aeb8", fontWeight: 600 }}>{addedLabel(n.createdTs)}</span>
            </div>
          </div>
          <button
            onClick={() => onDelete(n.id)}
            aria-label="삭제"
            style={{
              width: 28,
              height: 28,
              flex: "none",
              border: "1px solid rgba(255,255,255,.5)",
              background: "rgba(255,255,255,.34)",
              borderRadius: 9,
              color: "#b0aeb8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      );
    };

    const sheetChip = (on: boolean, solid: string): React.CSSProperties => ({
      background: on ? `linear-gradient(160deg,${solid},oklch(0.6 0.12 290))` : "rgba(255,255,255,.5)",
      color: on ? "#fff" : "#6d6a76",
      border: `1px solid ${on ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.68)"}`,
      boxShadow: on ? `0 7px 18px -8px ${solid},inset 0 1px 0 rgba(255,255,255,.5)` : "inset 0 1px 0 rgba(255,255,255,.75)",
      ...frost(12),
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div style={{ padding: "0 4px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}>재풀이 메모</div>
          <div style={{ fontSize: 11.5, color: "#8d8a99", fontWeight: 600, marginTop: 3 }}>
            다시 풀 문제 <span className="tnum" style={{ color: "#57544d", fontWeight: 700 }}>{pendingCount}</span>개 대기
          </div>
        </div>

        <div style={segmentTray}>
          {[
            { label: "대기", v: true },
            { label: "전체", v: false },
          ].map((f) => (
            <button key={f.label} onClick={() => setOnlyPending(f.v)} style={segmentItem(onlyPending === f.v)}>
              {f.label}
            </button>
          ))}
        </div>

        {bySubject.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#b8b6c0", padding: "60px 0" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, border: "2px dashed rgba(120,110,140,.28)" }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {onlyPending ? "다시 풀 문제가 없어요" : "아직 메모가 없어요"}
            </div>
          </div>
        ) : (
          bySubject.map(({ subject, items }) => (
            <div key={subject.id} style={{ ...groupCard, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,.55)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: subject.solid }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3f3d46" }}>{subject.name}</span>
                <span className="tnum" style={{ fontSize: 11, color: "#b0aeb8", fontWeight: 700 }}>
                  · {items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>{items.map(mobileItem)}</div>
            </div>
          ))
        )}

        {/* FAB/시트는 body로 포털 — 스크롤 컨테이너가 z-index:1 스태킹 컨텍스트라,
            그 안에 두면 z-index를 아무리 올려도 탭바 밑에 깔린다. */}
        {createPortal(
          <>
            {/* FAB — 탭바 위에 떠 있고, 목록이 길어져도 항상 손 닿는 자리 */}
            <button
              onClick={openSheet}
          aria-label="다시 풀 문제 추가"
          style={{
            position: "fixed",
            right: 18,
            bottom: "calc(86px + env(safe-area-inset-bottom))",
            zIndex: 25,
            width: 56,
            height: 56,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,.5)",
            background: ACCENT_GRAD,
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 14px 30px -10px rgba(80,60,140,.6),inset 0 1px 0 rgba(255,255,255,.5)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {sheetOpen && (
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              ...scrim,
              display: "flex",
              alignItems: "flex-end",
              padding: "0 10px calc(10px + env(safe-area-inset-bottom))",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", ...sheetPane, borderRadius: 28, padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ width: 38, height: 4, borderRadius: 3, background: "rgba(120,110,140,.24)", alignSelf: "center" }} />
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>다시 풀 문제 추가</div>
              <input
                ref={inputRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="예: 9월 모평 21번, 킬러 확통"
                style={{
                  width: "100%",
                  height: 50,
                  border: "1px solid rgba(255,255,255,.8)",
                  borderRadius: 15,
                  background: "rgba(255,255,255,.6)",
                  ...frost(14),
                  padding: "0 16px",
                  fontFamily: "inherit",
                  fontSize: 16, // iOS는 16px 미만이면 포커스 시 화면을 확대한다
                  fontWeight: 500,
                  color: INK.strong,
                  outline: "none",
                  boxShadow: "inset 0 1px 2px rgba(50,40,70,.06)",
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11.5, color: "#9a97a3", fontWeight: 700 }}>과목</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUBJECTS.map((raw) => {
                    const s = subById(raw.id)!;
                    const on = raw.id === draftSubject;
                    return (
                      <button
                        key={raw.id}
                        onClick={() => setDraftSubject(raw.id)}
                        style={{
                          ...sheetChip(on, s.solid),
                          borderRadius: 11,
                          padding: "8px 12px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: 3, background: on ? "rgba(255,255,255,.9)" : s.solid }} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11.5, color: "#9a97a3", fontWeight: 700 }}>언제 다시</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {DUE_OPTS.map((o) => {
                    const on = draftDue === o.days;
                    return (
                      <button
                        key={o.label}
                        onClick={() => setDraftDue(o.days)}
                        style={{
                          flex: 1,
                          border: `1px solid ${on ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.68)"}`,
                          background: on ? "linear-gradient(160deg,rgba(72,64,96,.94),rgba(50,44,72,.94))" : "rgba(255,255,255,.5)",
                          color: on ? "#fff" : "#7a7686",
                          boxShadow: on ? "0 7px 18px -9px rgba(50,40,70,.6)" : "inset 0 1px 0 rgba(255,255,255,.75)",
                          borderRadius: 11,
                          padding: "9px 0",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          ...frost(12),
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                <button
                  onClick={() => setSheetOpen(false)}
                  style={{
                    width: 84,
                    flex: "none",
                    height: 50,
                    border: "1px solid rgba(255,255,255,.7)",
                    borderRadius: 15,
                    background: "rgba(255,255,255,.5)",
                    color: "#8a8794",
                    fontSize: 14.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={submit}
                  style={{
                    flex: 1,
                    height: 50,
                    border: "1px solid rgba(255,255,255,.5)",
                    borderRadius: 15,
                    background: `linear-gradient(160deg,${subById(draftSubject)!.solid},oklch(0.6 0.13 290))`,
                    color: "#fff",
                    fontSize: 14.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 10px 24px -10px rgba(50,40,80,.55),inset 0 1px 0 rgba(255,255,255,.5)",
                  }}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}
          </>,
          document.body,
        )}
      </div>
    );
  }

  // ---------- 데스크톱: 붙박이 입력줄 + 과목별 목록 ----------
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: "26px 34px 30px", minHeight: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>재풀이 메모</div>
        <div style={{ fontSize: 12.5, color: INK.muted, fontWeight: 600, ...glassChip, padding: "5px 11px", borderRadius: 9 }}>다시 풀 문제</div>
      </div>

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
            style={{ flex: "none", border: 0, borderRadius: 11, background: ACCENT_GRAD, color: "#fff", fontSize: 14, fontWeight: 700, padding: "0 18px", cursor: "pointer", boxShadow: "0 6px 16px -8px oklch(0.6 0.15 280/.7)" }}
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
