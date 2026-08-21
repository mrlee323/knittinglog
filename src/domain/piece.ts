/**
 * 조각 계획 — 계산기가 만든 숫자가 머무는 자리.
 *
 * 계산기는 여섯 개가 있고 전부 맞는 답을 낸다. 그런데 답이 **화면을 벗어나면
 * 사라졌다.** "몸판 118코"를 계산해도 저장할 데가 없어서, 배색 도안은 얹을
 * 코수를 다시 묻고 카운터는 목표 단수를 다시 묻는다. 그 사이를 사람이 숫자를
 * 외워 옮겨 다니며 메웠다 — 사용자가 통합 계층이었다.
 *
 * 여기서 중요한 결정 하나: **뜻(cm)을 저장하고 코수는 파생시킨다.**
 * "몸판은 50cm 너비"가 사람의 의도이고 "110코"는 오늘의 게이지로 낸 답이다.
 * 코수만 저장하면 스와치를 다시 떠 게이지가 바뀔 때 저장된 숫자가 조용히
 * 틀린 값이 된다 — 그리고 게이지는 실제로 바뀐다(바늘을 바꾸거나 블로킹 후
 * 값을 넣거나). 뜻이 남아 있으면 다시 계산할 수 있고, 무엇보다 **어긋났다는
 * 사실을 알 수 있다.**
 *
 * 코수도 함께 저장하는 이유는 그 어긋남을 보여주려면 예전 값이 있어야 하기
 * 때문이다. cm만 두면 "지금 게이지로는 115코"만 말할 수 있고 "110코로 계획했는데
 * 지금은 115코"는 말할 수 없다.
 */

import type { Gauge } from "./gauge";
import { rowsForLength, stitchesForWidth } from "./gauge";
import type { ProjectCategory } from "@/types/entities";

/**
 * 조각의 종류.
 *
 * 이름은 사용자가 짓지만(도안마다 부르는 말이 다르다) 종류를 함께 남기면
 * 처음 만드는 사람에게 무엇을 만들어야 하는지 제안할 수 있다.
 */
export type PieceKind =
  | "body"
  | "sleeve"
  | "front"
  | "back"
  | "yoke"
  | "brim"
  | "leg"
  | "foot"
  | "other";

/**
 * 이 종류의 작품이면 대개 어떤 조각으로 나뉘는가.
 *
 * "조각을 추가하세요"에 빈 이름칸만 주면 처음 뜨는 사람은 무엇을 적어야 할지
 * 모른다(디자인 원칙 5). 뜨개에서 옷이 어떤 조각으로 나뉘는지는 상식이 아니라
 * 배워야 하는 것이다.
 *
 * 순서는 뜨는 순서다 — 요크 스웨터든 조각 스웨터든 몸판이 먼저다.
 */
export const SUGGESTED_PIECES: Record<ProjectCategory, PieceKind[]> = {
  sweater: ["body", "sleeve"],
  hat: ["brim", "body"],
  socks: ["leg", "foot"],
  shawl: ["body"],
  bag: ["body"],
  blanket: ["body"],
  accessory: ["body"],
  other: [],
};

export interface PieceSpec {
  /** 완성 너비 · 길이 (cm). 뜻이 담긴 값이다. */
  widthCm?: number;
  lengthCm?: number;
  /** 계획한 코수 · 단수. 위 치수를 어떤 게이지로 계산한 결과다. */
  stitches?: number;
  rows?: number;
}

/** 지금 게이지로 다시 계산한 값. 치수가 없는 쪽은 계산할 수 없다. */
export function pieceCounts(
  piece: PieceSpec,
  gauge: Gauge
): { stitches?: number; rows?: number } {
  return {
    stitches:
      piece.widthCm !== undefined && piece.widthCm > 0
        ? stitchesForWidth(gauge, piece.widthCm)
        : undefined,
    rows:
      piece.lengthCm !== undefined && piece.lengthCm > 0
        ? rowsForLength(gauge, piece.lengthCm)
        : undefined,
  };
}

export interface Drift {
  was: number;
  now: number;
}

export interface PieceDrift {
  stitches?: Drift;
  rows?: Drift;
}

/**
 * 저장된 코수가 지금 게이지와 어긋났는가.
 *
 * 어긋났으면 **양쪽 숫자를 함께** 돌려준다. "다시 계산하세요"만 말하면
 * 사용자는 무엇이 얼마나 달라지는지 모른 채 누르게 된다.
 *
 * 치수를 모르는 조각(코수만 손으로 적은 것)은 어긋남을 알 수 없다 — 비교할
 * 근거가 없다. 그때는 `null`이고, 그건 문제가 아니라 정보의 부재다.
 */
export function pieceDrift(piece: PieceSpec, gauge: Gauge): PieceDrift | null {
  const now = pieceCounts(piece, gauge);
  const drift: PieceDrift = {};

  if (
    piece.stitches !== undefined &&
    now.stitches !== undefined &&
    now.stitches !== piece.stitches
  ) {
    drift.stitches = { was: piece.stitches, now: now.stitches };
  }
  if (
    piece.rows !== undefined &&
    now.rows !== undefined &&
    now.rows !== piece.rows
  ) {
    drift.rows = { was: piece.rows, now: now.rows };
  }

  return drift.stitches || drift.rows ? drift : null;
}

/** 이 조각이 계산의 입력으로 쓸 만한가 — 코수가 있어야 한다. */
export const hasStitches = (piece: PieceSpec): boolean =>
  piece.stitches !== undefined && piece.stitches > 0;
