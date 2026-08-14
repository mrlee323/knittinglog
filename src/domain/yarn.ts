/**
 * 실 재고 계산.
 *
 * 실 부족은 프로젝트 중단 사유의 상위권인데, 지금은 대부분 **다 떠버린 뒤에야**
 * 알게 된다. 여기 계산은 그걸 미리 알려주기 위한 기반이다.
 *
 * 단위는 저장·계산 모두 미터·그램으로 통일한다. 야드·온스는 표시할 때만 환산한다.
 */

import { gramsToMeters, metersToGrams } from "./units";

export interface YarnSpec {
  /** 보유 타래 수 */
  skeinCount: number;
  /** 한 타래 무게(g) */
  skeinGrams?: number;
  /** 한 타래 길이(m) */
  skeinMeters?: number;
}

export interface AllocationSpec {
  skeinsAllocated: number;
}

/* --- 보유량 --------------------------------------------------------------- */

export interface StashTotal {
  skeins: number;
  grams?: number;
  meters?: number;
}

/**
 * 스태시 총량.
 *
 * 타래 스펙이 없으면 개수만 센다. 라벨을 잃어버린 실이 흔해서
 * 무게·길이를 모르는 채로 등록하는 걸 막지 않는다.
 */
export function stashTotal(yarn: YarnSpec): StashTotal {
  const skeins = Math.max(0, yarn.skeinCount);
  return {
    skeins,
    grams: yarn.skeinGrams ? skeins * yarn.skeinGrams : undefined,
    meters: yarn.skeinMeters ? skeins * yarn.skeinMeters : undefined,
  };
}

export const allocatedSkeins = (allocations: AllocationSpec[]) =>
  allocations.reduce((sum, a) => sum + Math.max(0, a.skeinsAllocated), 0);

/**
 * 아직 어느 프로젝트에도 묶이지 않은 타래 수.
 *
 * 음수가 될 수 있다 — 실제로 가진 것보다 많이 배정한 상태이고,
 * 그건 숨기지 말고 사용자에게 보여줘야 하는 정보다.
 */
export const freeSkeins = (yarn: YarnSpec, allocations: AllocationSpec[]) =>
  Math.max(0, yarn.skeinCount) - allocatedSkeins(allocations);

export const isOverAllocated = (
  yarn: YarnSpec,
  allocations: AllocationSpec[]
) => freeSkeins(yarn, allocations) < 0;

/* --- 소요량 --------------------------------------------------------------- */

/**
 * 필요한 미터를 타래 수로 환산한다.
 *
 * 반 타래를 사올 수는 없으므로 올림한다.
 */
export function skeinsForMeters(meters: number, skeinMeters: number): number {
  if (skeinMeters <= 0) throw new RangeError("타래 길이는 0보다 커야 합니다");
  return Math.ceil(Math.max(0, meters) / skeinMeters);
}

/**
 * 다른 실로 바꿔 뜰 때 필요한 타래 수.
 *
 * 도안이 요구하는 건 길이지 타래 수가 아니다. 같은 100g이라도 실마다 길이가
 * 달라서, 타래 수를 그대로 옮기면 모자라거나 남는다. 실 대체에서 가장 흔한 실수.
 */
export function substituteSkeins(
  original: { skeins: number; skeinMeters: number },
  replacement: { skeinMeters: number }
): number {
  const neededMeters = original.skeins * original.skeinMeters;
  return skeinsForMeters(neededMeters, replacement.skeinMeters);
}

/* --- 잔량 예측 (Yarn Chicken) --------------------------------------------- */

export interface WeighIn {
  remainingGrams: number;
  atRow: number;
}

export interface YarnForecast {
  /** 한 단당 소모 그램 */
  gramsPerRow: number;
  /** 남은 실로 더 뜰 수 있는 단수 */
  rowsLeft: number;
  /** 목표까지 부족한 단수. 0이면 충분하다. */
  shortfallRows: number;
  enough: boolean;
}

/**
 * 저울로 잰 잔량 두 지점에서 단당 소모량을 역산하고, 목표까지 갈 수 있는지 본다.
 *
 * 두 번 이상 재야 계산할 수 있다. 한 번만 잰 값으로는 "얼마나 쓰는지"를 알 수 없다.
 */
export function forecastYarn(
  weighIns: WeighIn[],
  targetRow: number,
  currentRow: number
): YarnForecast | null {
  if (weighIns.length < 2) return null;

  const sorted = [...weighIns].sort((a, b) => a.atRow - b.atRow);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const rows = last.atRow - first.atRow;
  const used = first.remainingGrams - last.remainingGrams;
  if (rows <= 0 || used <= 0) return null;

  const gramsPerRow = used / rows;
  const rowsLeft = Math.floor(last.remainingGrams / gramsPerRow);
  const rowsNeeded = Math.max(0, targetRow - currentRow);

  return {
    gramsPerRow,
    rowsLeft,
    shortfallRows: Math.max(0, rowsNeeded - rowsLeft),
    enough: rowsLeft >= rowsNeeded,
  };
}

/* --- 환산 재수출 ---------------------------------------------------------- */

export { gramsToMeters, metersToGrams };
