/**
 * 도안 용어 사전 — 기획 §4 IR의 렌더링 계층.
 *
 * 도안은 텍스트가 아니라 언어 중립 IR로 저장하고, **표시할 때만** 이 사전을
 * 통해 렌더링한다. 그래서 한↔영 도안 변환이 기계번역이 아니라
 * 결정적 기호 변환이 된다.
 *
 *   파싱(원본 언어) → IR → 렌더링(대상 언어)
 *
 * 새 언어 추가는 이 파일에 로케일 키를 하나 더 붙이는 것으로 끝난다.
 * P1에서 IR 에디터·렌더러와 함께 본격 확장한다. 여기서는 op 집합의
 * 형태만 확정해둔다.
 */

import type { Craft } from "@/domain/units";
import type { Locale } from "@/i18n";

/** 코 하나가 코수에 미치는 영향. 자동 검산의 근거가 된다. */
export interface StitchDelta {
  /** 전단에서 소비하는 코수 */
  consumes: number;
  /** 이번 단에 만들어내는 코수 */
  produces: number;
}

export interface StitchDef {
  op: string;
  craft: Craft;
  delta: StitchDelta;
  /** 로케일별 표기. 축약형과 전개형을 함께 둔다. */
  labels: Record<Locale, { short: string; long: string }>;
  /** 차트 심볼 식별자 (P2 차트 렌더러가 사용) */
  chartSymbol?: string;
  /** 좌우 반전 시 대응되는 op (k2tog ↔ ssk) */
  mirrorOf?: string;
}

export const STITCHES: StitchDef[] = [
  {
    op: "knit",
    craft: "knit",
    delta: { consumes: 1, produces: 1 },
    labels: {
      ko: { short: "겉", long: "겉뜨기" },
      en: { short: "k", long: "knit" },
    },
    chartSymbol: "knit",
  },
  {
    op: "purl",
    craft: "knit",
    delta: { consumes: 1, produces: 1 },
    labels: {
      ko: { short: "안", long: "안뜨기" },
      en: { short: "p", long: "purl" },
    },
    chartSymbol: "purl",
  },
  {
    op: "yo",
    craft: "knit",
    delta: { consumes: 0, produces: 1 },
    labels: {
      ko: { short: "바늘비우기", long: "바늘비우기" },
      en: { short: "yo", long: "yarn over" },
    },
    chartSymbol: "yo",
  },
  {
    op: "k2tog",
    craft: "knit",
    delta: { consumes: 2, produces: 1 },
    labels: {
      ko: { short: "오른코모아", long: "오른코 모아뜨기" },
      en: { short: "k2tog", long: "knit 2 together" },
    },
    chartSymbol: "dec-right",
    mirrorOf: "ssk",
  },
  {
    op: "ssk",
    craft: "knit",
    delta: { consumes: 2, produces: 1 },
    labels: {
      ko: { short: "왼코모아", long: "왼코 모아뜨기" },
      en: { short: "ssk", long: "slip slip knit" },
    },
    chartSymbol: "dec-left",
    mirrorOf: "k2tog",
  },
  // 코바늘은 "어디에 뜨는가"(전단의 어느 코·공간)가 필수 정보라
  // IR 노드에 into 슬롯이 추가된다. P1에서 확장.
  {
    op: "ch",
    craft: "crochet",
    delta: { consumes: 0, produces: 1 },
    labels: {
      ko: { short: "사슬", long: "사슬뜨기" },
      en: { short: "ch", long: "chain" },
    },
  },
  {
    op: "sc",
    craft: "crochet",
    delta: { consumes: 1, produces: 1 },
    labels: {
      ko: { short: "짧은뜨기", long: "짧은뜨기" },
      en: { short: "sc", long: "single crochet" },
    },
  },
  {
    op: "dc",
    craft: "crochet",
    delta: { consumes: 1, produces: 1 },
    labels: {
      ko: { short: "한길긴뜨기", long: "한길 긴뜨기" },
      en: { short: "dc", long: "double crochet" },
    },
  },
];

const BY_OP = new Map(STITCHES.map((s) => [s.op, s]));

export const findStitch = (op: string) => BY_OP.get(op);

export const stitchLabel = (
  op: string,
  locale: Locale,
  form: "short" | "long" = "short"
) => BY_OP.get(op)?.labels[locale][form] ?? op;
