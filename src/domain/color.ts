/**
 * 색 계산.
 *
 * 사진→차트 변환과 천 렌더링이 함께 쓴다. 처음에는 사진 변환 모듈 안에 있었지만
 * 색 변환은 그 기능의 것이 아니라 공용이다.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const clamp255 = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

export const toHex = ({ r, g, b }: RGB) =>
  `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * `#rrggbb` 또는 `rrggbb`를 읽는다.
 *
 * 짧은 형식(`#fff`)은 받지 않는다. 팔레트는 우리가 만든 값이므로 형식을 좁게
 * 두는 편이 낫다 — 넓게 받으면 잘못된 값이 조용히 검은색으로 들어온다.
 */
export function fromHex(hex: string): RGB {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new RangeError(`hex 색이 아닙니다: ${hex}`);
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * 밝게. `amount`는 0~1.
 *
 * 흰색으로 섞는다. 실 색을 그대로 유지하면서 결만 드러내야 하므로 채도를
 * 건드리지 않는 이 방식이 맞다 — 밝기만 올리면 파란 실이 하늘색이 된다.
 */
export function tint(hex: string, amount: number): string {
  const { r, g, b } = fromHex(hex);
  const k = Math.max(0, Math.min(1, amount));
  return toHex({
    r: r + (255 - r) * k,
    g: g + (255 - g) * k,
    b: b + (255 - b) * k,
  });
}

/** 어둡게. `amount`는 0~1. 검은색으로 섞는다. */
export function shade(hex: string, amount: number): string {
  const { r, g, b } = fromHex(hex);
  const k = Math.max(0, Math.min(1, amount));
  return toHex({ r: r * (1 - k), g: g * (1 - k), b: b * (1 - k) });
}

/**
 * 밝은 색인가.
 *
 * 결을 드러내는 방향을 정하는 데 쓴다. 흰 실에 흰 하이라이트를 얹으면 아무것도
 * 보이지 않으므로, 밝은 색은 어둡게 눌러 결을 만들어야 한다.
 */
export function isLight(hex: string): boolean {
  const { r, g, b } = fromHex(hex);
  // 사람 눈의 민감도를 반영한 가중치. 단순 평균은 노란색을 어둡다고 본다.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}
