/**
 * 바늘 인벤토리 계산.
 *
 * 바늘은 이 앱에서 유일하게 **물리적으로 하나뿐인 자원**이다. 실은 더 사면
 * 되고 도안은 복사되지만, 4.0mm 80cm 줄바늘은 한 개면 한 곳에만 물릴 수 있다.
 * 그래서 "바늘 뺏김"이 중단 사유 목록에 있고(기획 §3.5), 여기 계산의 목적도
 * 재고 관리가 아니라 **충돌을 미리 보여주는 것**이다.
 */

import { type Craft } from "./units";

export type NeedleKind = "straight" | "circular" | "dpn" | "hook";

export interface NeedleSpec {
  id: string;
  craft: Craft;
  type: NeedleKind;
  sizeMm: number;
  lengthCm?: number;
  /** 지금 이 바늘이 물려 있는 프로젝트 */
  occupiedByProjectId?: string;
}

/* --- 상태 ----------------------------------------------------------------- */

export const isFree = (needle: NeedleSpec) => !needle.occupiedByProjectId;

/**
 * 이 프로젝트가 쓰려는 바늘이 다른 작품에 물려 있는가.
 *
 * 같은 프로젝트에 이미 물려 있으면 충돌이 아니다 — 그건 정상 상태다.
 */
export const isTakenByOther = (needle: NeedleSpec, projectId: string) =>
  !!needle.occupiedByProjectId && needle.occupiedByProjectId !== projectId;

/* --- 정렬 ----------------------------------------------------------------- */

const TYPE_ORDER: NeedleKind[] = ["circular", "straight", "dpn", "hook"];

/**
 * 서랍을 여는 순서로 정렬한다.
 *
 * 기법 → 종류 → 굵기 → 길이. 굵기가 정렬의 중심인 이유는 바늘을 찾는 이유가
 * 늘 "도안이 4.0mm를 요구한다"이기 때문이다. 줄바늘을 먼저 두는 것은 실제로
 * 가장 많이 쓰이고 길이까지 봐야 하는 종류라서다.
 */
export function sortNeedles<T extends NeedleSpec>(needles: T[]): T[] {
  return [...needles].sort(
    (a, b) =>
      Number(a.craft === "crochet") - Number(b.craft === "crochet") ||
      TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
      a.sizeMm - b.sizeMm ||
      (a.lengthCm ?? 0) - (b.lengthCm ?? 0)
  );
}

/* --- 같은 바늘 찾기 ------------------------------------------------------- */

/**
 * 굵기가 같다고 볼 수 있는 범위.
 *
 * 바늘 표기는 체계마다 미묘하게 어긋난다(일본 0호 2.1mm vs US 0 2.0mm).
 * 0.05mm 안쪽이면 같은 바늘로 본다 — 그 차이로 게이지가 달라지지 않는다.
 */
const SAME_SIZE_MM = 0.05;

export const sameSize = (a: number, b: number) =>
  Math.abs(a - b) <= SAME_SIZE_MM;

/**
 * 이미 가진 바늘인지.
 *
 * 스태시에 같은 바늘을 두 번 넣는 건 흔한 실수이고, 그러면 "여유 있는 바늘"
 * 숫자가 틀려서 충돌 경고가 무의미해진다. 길이가 다르면 다른 바늘이다 —
 * 줄바늘 40cm와 80cm는 같은 굵기여도 서로를 대체하지 못한다.
 */
export function findSameNeedle<T extends NeedleSpec>(
  needles: T[],
  spec: Pick<NeedleSpec, "craft" | "type" | "sizeMm" | "lengthCm">
): T | undefined {
  return needles.find(
    (n) =>
      n.craft === spec.craft &&
      n.type === spec.type &&
      sameSize(n.sizeMm, spec.sizeMm) &&
      (n.lengthCm ?? null) === (spec.lengthCm ?? null)
  );
}

/**
 * 이 굵기를 쓸 수 있는 바늘들. 여유 있는 것이 앞에 온다.
 *
 * 게이지가 요구하는 굵기로 인벤토리를 훑을 때 쓴다. 물린 바늘도 목록에서
 * 지우지 않는다 — "가진 건 있는데 다른 작품에 물려 있다"가 사용자가 알아야
 * 하는 사실이고, 그게 바로 바늘 충돌이다.
 */
export function needlesForSize<T extends NeedleSpec>(
  needles: T[],
  craft: Craft,
  sizeMm: number
): T[] {
  return sortNeedles(
    needles.filter((n) => n.craft === craft && sameSize(n.sizeMm, sizeMm))
  ).sort((a, b) => Number(!isFree(a)) - Number(!isFree(b)));
}

/* --- 요약 ----------------------------------------------------------------- */

export interface NeedleTally {
  total: number;
  free: number;
  occupied: number;
}

export function tally(needles: NeedleSpec[]): NeedleTally {
  const free = needles.filter(isFree).length;
  return { total: needles.length, free, occupied: needles.length - free };
}
