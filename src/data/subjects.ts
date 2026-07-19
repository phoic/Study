import type { Subject, SubjectResolved } from "../types";
import { solidOf, tintOf } from "../lib/colors";

// The 9 subjects — names and colors mirror the Notion `과목` Select options
// exactly, so schedule rows match by name. Ported from 공부 타이머.dc.html.
// goalH = 방학 총 목표시간, dm = 하루 목표(분). doneH는 "앱 시작 전 이미 한 시간"의
// 기준값 — 실제 누적은 타이머로 기록한 세션에서만 집계하므로 0으로 둔다. (과거 공부를
// 미리 채우고 싶으면 여기 숫자만 올리면 그만큼 누적/달성률에 더해진다.)
export const SUBJECTS: Subject[] = [
  { id: 1, name: "미적분1", hue: 255, goalH: 40, doneH: 0, dm: 120 },
  { id: 2, name: "확률과 통계", hue: 300, goalH: 30, doneH: 0, dm: 90 },
  { id: 3, name: "역학과 에너지", hue: 27, goalH: 25, doneH: 0, dm: 60 },
  { id: 4, name: "물질과 에너지", hue: 55, goalH: 25, doneH: 0, dm: 90 },
  { id: 5, name: "영어", hue: 150, goalH: 35, doneH: 0, dm: 80 },
  { id: 6, name: "문학", hue: 95, goalH: 20, doneH: 0, dm: 60 },
  { id: 7, name: "독서", hue: 60, goalH: 15, doneH: 0, dm: 60, solid: "oklch(0.5 0.07 60)", tint: "oklch(0.9 0.032 60)" },
  { id: 8, name: "점검·보충", hue: 265, goalH: 10, doneH: 0, dm: 40, solid: "oklch(0.62 0.015 265)", tint: "oklch(0.93 0.008 265)" },
  { id: 9, name: "학원", hue: 350, goalH: 12, doneH: 0, dm: 60 },
];

export function resolveSubject(s: Subject): SubjectResolved {
  return { ...s, solid: s.solid ?? solidOf(s.hue), tint: s.tint ?? tintOf(s.hue) };
}

const byId = new Map(SUBJECTS.map((s) => [s.id, s]));
const byName = new Map(SUBJECTS.map((s) => [s.name, s]));

export function subById(id: number | null | undefined): SubjectResolved | null {
  if (id == null) return null;
  const s = byId.get(id);
  return s ? resolveSubject(s) : null;
}

export function subByName(name: string | null | undefined): SubjectResolved | null {
  if (!name) return null;
  const s = byName.get(name.trim());
  return s ? resolveSubject(s) : null;
}

export function subjectIdByName(name: string | null | undefined): number | null {
  return subByName(name)?.id ?? null;
}
