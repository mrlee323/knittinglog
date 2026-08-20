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

/* --- 명도 ----------------------------------------------------------------- */

/** sRGB 채널값(0~255)을 감마를 벗긴 선형값(0~1)으로 */
function linear(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** 선형값(0~1)을 다시 sRGB 채널값(0~255)으로 */
function encode(value: number): number {
  const s =
    value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return s * 255;
}

/**
 * WCAG 상대휘도. 검정 0, 흰색 1.
 *
 * `isLight`와 계산이 다른 것은 쓰임이 다르기 때문이다. `isLight`는 **글자를
 * 이 색 위에 얹을지**를 감마 있는 근사식으로 빠르게 정하고, 이쪽은 **두 색이
 * 나란히 놓였을 때 구분되는지**를 잰다. 후자는 감마를 벗겨야 맞다 — 벗기지
 * 않으면 어두운 색끼리의 차이가 실제보다 크게 나온다.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = fromHex(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * WCAG 명도비. 같은 명도면 1:1, 검정과 흰색이 21:1.
 *
 * 순서는 상관없다 — 밝은 쪽을 분자로 놓는다.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * 명도만 남긴 회색.
 *
 * 배색에서 무늬가 사라지는 이유는 **색이 아니라 명도**다. 휘도를 유지한 회색으로
 * 바꿔 보면 명도가 비슷한 두 색이 같은 회색으로 뭉쳐 보인다 — 경고 문장보다
 * 이게 빠르다(docs/CHART-EDITOR.md §4.3).
 */
export function toGray(hex: string): string {
  const value = encode(relativeLuminance(hex));
  return toHex({ r: value, g: value, b: value });
}
