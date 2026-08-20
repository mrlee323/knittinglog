/**
 * 도안 용어 사전 — 기획 §4 IR의 **렌더링 계층**.
 *
 * 도안은 텍스트가 아니라 언어 중립 IR로 저장하고, 표시할 때만 이 사전을
 * 통해 렌더링한다. 그래서 한↔영 도안 변환이 기계번역이 아니라 결정적 기호
 * 변환이 된다.
 *
 *   파싱(원본 언어) → IR → 렌더링(대상 언어)
 *
 * 이 파일은 **이름만** 갖는다. 코수 변화(delta)와 좌우 반전 대응은 계산이므로
 * `src/domain/stitches.ts`가 소유한다. 둘을 한 파일에 두면 언어를 추가할 때
 * 검산 표를 건드리게 되고, 그 반대도 마찬가지다.
 *
 * 새 언어 추가는 아래 맵에 로케일 키를 하나 더 붙이는 것으로 끝난다.
 */

import { STITCHES } from "@/domain/stitches";
import type { Locale } from "@/i18n";

export interface StitchLabel {
  /** 도안 축약형 — 서술형 도안에 쓰는 표기 */
  short: string;
  /** 전개형 — 처음 보는 사람에게 설명할 때, 범례에 쓰는 표기 */
  long: string;
}

const LABELS: Record<Locale, Record<string, StitchLabel>> = {
  ko: {
    knit: { short: "겉", long: "겉뜨기" },
    purl: { short: "안", long: "안뜨기" },
    sl: { short: "걸러", long: "걸러뜨기" },
    yo: { short: "바늘비우기", long: "바늘비우기" },
    m1l: { short: "왼늘림", long: "왼쪽으로 기운 늘리기" },
    m1r: { short: "오른늘림", long: "오른쪽으로 기운 늘리기" },
    kfb: { short: "1코2단", long: "한 코에 겉뜨기 두 번" },
    k2tog: { short: "오른코모아", long: "오른코 모아뜨기 (2코 줄임)" },
    ssk: { short: "왼코모아", long: "왼코 모아뜨기 (2코 줄임)" },
    k3tog: { short: "오른코3모아", long: "오른코 3모아뜨기" },
    sssk: { short: "왼코3모아", long: "왼코 3모아뜨기" },
    cdd: { short: "중심3모아", long: "중심 3코 모아뜨기" },
    none: { short: "코없음", long: "코 없음 (칸 채우기용)" },
    /* 안면 단에서만 나오는 기법 — 도안에 그려지지 않고 서술형에만 등장한다 */
    p2tog: {
      short: "안오른코모아",
      long: "안면에서 뜨는 오른코 모아뜨기 (2코 줄임)",
    },
    ssp: {
      short: "안왼코모아",
      long: "안면에서 뜨는 왼코 모아뜨기 (2코 줄임)",
    },
    p3tog: { short: "안오른코3모아", long: "안면에서 뜨는 오른코 3모아뜨기" },
    sssp: { short: "안왼코3모아", long: "안면에서 뜨는 왼코 3모아뜨기" },
    cddp: { short: "안중심3모아", long: "안면에서 뜨는 중심 3코 모아뜨기" },
    m1lp: { short: "안왼늘림", long: "안면에서 왼쪽으로 기운 늘리기" },
    m1rp: { short: "안오른늘림", long: "안면에서 오른쪽으로 기운 늘리기" },
    pfb: { short: "안1코2단", long: "한 코에 안뜨기 두 번" },
    ch: { short: "사슬", long: "사슬뜨기" },
    sc: { short: "짧은뜨기", long: "짧은뜨기" },
    dc: { short: "한길긴뜨기", long: "한길 긴뜨기" },
  },
  en: {
    knit: { short: "k", long: "knit" },
    purl: { short: "p", long: "purl" },
    sl: { short: "sl", long: "slip" },
    yo: { short: "yo", long: "yarn over" },
    m1l: { short: "m1l", long: "make one left" },
    m1r: { short: "m1r", long: "make one right" },
    kfb: { short: "kfb", long: "knit front and back" },
    k2tog: { short: "k2tog", long: "knit 2 together (right-leaning)" },
    ssk: { short: "ssk", long: "slip slip knit (left-leaning)" },
    k3tog: { short: "k3tog", long: "knit 3 together" },
    sssk: { short: "sssk", long: "slip slip slip knit" },
    cdd: { short: "cdd", long: "centered double decrease" },
    none: { short: "—", long: "no stitch (grid filler)" },
    p2tog: { short: "p2tog", long: "purl 2 together (wrong-side k2tog)" },
    ssp: { short: "ssp", long: "slip slip purl (wrong-side ssk)" },
    p3tog: { short: "p3tog", long: "purl 3 together" },
    sssp: { short: "sssp", long: "slip slip slip purl" },
    cddp: { short: "cddp", long: "centered double decrease, purlwise" },
    m1lp: { short: "m1lp", long: "make one left purlwise" },
    m1rp: { short: "m1rp", long: "make one right purlwise" },
    pfb: { short: "pfb", long: "purl front and back" },
    ch: { short: "ch", long: "chain" },
    sc: { short: "sc", long: "single crochet" },
    dc: { short: "dc", long: "double crochet" },
  },
};

export const stitchLabel = (
  op: string,
  locale: Locale,
  form: "short" | "long" = "short"
) => LABELS[locale][op]?.[form] ?? op;

/** 범례용 — 도메인 표의 순서를 그대로 따른다. */
export const stitchLegend = (locale: Locale, ops: string[] = []) =>
  (ops.length ? STITCHES.filter((s) => ops.includes(s.op)) : STITCHES).map(
    (s) => ({
      op: s.op,
      short: stitchLabel(s.op, locale, "short"),
      long: stitchLabel(s.op, locale, "long"),
    })
  );

/**
 * 서술형 도안 렌더링 — "차트 → 글" 변환의 언어 계층.
 *
 * 도메인이 `{ op, count }` 묶음을 내놓고, 여기서 언어별 관습대로 문장을 만든다.
 * 같은 IR에서 `겉 5코, 오른코모아`와 `k5, k2tog`가 나오는 것이 §4가 말한
 * 한↔영 도안 상호 변환이다 — 기계번역이 아니라 결정적 기호 변환이다.
 */

/**
 * 코수를 표기에 붙여 쓰는 기법.
 *
 * 영문 도안은 기본 코를 `k5`처럼 붙여 쓰지만 `k2tog5`라고 쓰지는 않는다.
 * 여러 코를 먹는 기법은 반복 횟수로 적는다(`k2tog x2`). 두 로케일이 같은
 * 구분을 쓰므로 한 곳에 둔다.
 */
const SUFFIX_COUNT = new Set(["knit", "purl", "sl", "ch", "sc", "dc"]);

export interface OpRun {
  op: string;
  count: number;
}

export function formatRun(run: OpRun, locale: Locale): string {
  const short = stitchLabel(run.op, locale, "short");
  const suffix = SUFFIX_COUNT.has(run.op);

  if (locale === "ko") {
    if (suffix) return `${short} ${run.count}코`;
    return run.count === 1 ? short : `${short} ${run.count}번`;
  }
  if (suffix) return `${short}${run.count}`;
  return run.count === 1 ? short : `${short} x${run.count}`;
}

/** 한 단을 문장 하나로. 빈 단(전부 코 없음)은 빈 문자열이 된다. */
export const formatRow = (runs: OpRun[], locale: Locale): string =>
  runs.map((r) => formatRun(r, locale)).join(", ");

/** 이 로케일에 이름이 있는지. 언어 추가 시 빠진 기법을 테스트로 잡는 데 쓴다. */
export const hasStitchLabel = (op: string, locale: Locale) =>
  op in LABELS[locale];
