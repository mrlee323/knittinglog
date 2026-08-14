/**
 * 단위·규격 환산.
 *
 * 해외 도안을 국내 실·바늘로 옮겨 뜨는 것이 이 서비스의 주요 시나리오이므로
 * 국가별 규격 대조는 선택 기능이 아니라 기반 데이터다.
 */

/* --- 기본 단위 ------------------------------------------------------------ */

export const CM_PER_INCH = 2.54;
export const GRAMS_PER_OUNCE = 28.349523125;
export const METERS_PER_YARD = 0.9144;

export const cmToInch = (cm: number) => cm / CM_PER_INCH;
export const inchToCm = (inch: number) => inch * CM_PER_INCH;
export const gramsToOunces = (g: number) => g / GRAMS_PER_OUNCE;
export const ouncesToGrams = (oz: number) => oz * GRAMS_PER_OUNCE;
export const metersToYards = (m: number) => m / METERS_PER_YARD;
export const yardsToMeters = (yd: number) => yd * METERS_PER_YARD;

export type UnitSystem = "metric" | "imperial";

/* --- 바늘 호수 ------------------------------------------------------------ */

export type Craft = "knit" | "crochet";

export interface NeedleSize {
  /** 밀리미터. 유일한 정규 키 — 나머지 표기는 전부 여기서 파생된다. */
  mm: number;
  us?: string;
  /** 일본 호수(号). 한국도 이 체계를 쓴다. */
  jp?: string;
  /** 구 영국/캐나다 표기. 숫자가 커질수록 가늘다. */
  uk?: string;
}

/**
 * 대바늘. 일본 호수는 0호 = 2.1mm에서 0.3mm씩 올라간다.
 * mm 값이 체계마다 미묘하게 어긋나므로(2.0 vs 2.1) 근사 매칭이 필요하다.
 */
export const KNITTING_NEEDLES: NeedleSize[] = [
  { mm: 2.0, us: "0", jp: "0호", uk: "14" },
  { mm: 2.1, jp: "0호" },
  { mm: 2.25, us: "1", uk: "13" },
  { mm: 2.4, jp: "1호" },
  { mm: 2.7, jp: "2호" },
  { mm: 2.75, us: "2", uk: "12" },
  { mm: 3.0, us: "2.5", jp: "3호", uk: "11" },
  { mm: 3.25, us: "3", uk: "10" },
  { mm: 3.3, jp: "4호" },
  { mm: 3.5, us: "4" },
  { mm: 3.6, jp: "5호" },
  { mm: 3.75, us: "5", uk: "9" },
  { mm: 3.9, jp: "6호" },
  { mm: 4.0, us: "6", uk: "8" },
  { mm: 4.2, jp: "7호" },
  { mm: 4.5, us: "7", jp: "8호", uk: "7" },
  { mm: 4.8, jp: "9호" },
  { mm: 5.0, us: "8", uk: "6" },
  { mm: 5.1, jp: "10호" },
  { mm: 5.4, jp: "11호" },
  { mm: 5.5, us: "9", uk: "5" },
  { mm: 5.7, jp: "12호" },
  { mm: 6.0, us: "10", jp: "13호", uk: "4" },
  { mm: 6.5, us: "10.5", uk: "3" },
  { mm: 7.0, uk: "2" },
  { mm: 8.0, us: "11", uk: "0" },
  { mm: 9.0, us: "13", uk: "00" },
  { mm: 10.0, us: "15", uk: "000" },
  { mm: 12.75, us: "17" },
  { mm: 15.0, us: "19" },
  { mm: 19.0, us: "35" },
  { mm: 25.0, us: "50" },
];

/** 코바늘. 일본 かぎ針은 2/0호 = 2.0mm에서 시작하는 별도 체계다. */
export const CROCHET_HOOKS: NeedleSize[] = [
  { mm: 2.0, jp: "2/0호" },
  { mm: 2.25, us: "B/1" },
  { mm: 2.3, jp: "3/0호" },
  { mm: 2.5, jp: "4/0호" },
  { mm: 2.75, us: "C/2" },
  { mm: 3.0, jp: "5/0호" },
  { mm: 3.25, us: "D/3" },
  { mm: 3.5, us: "E/4", jp: "6/0호" },
  { mm: 3.75, us: "F/5" },
  { mm: 4.0, us: "G/6", jp: "7/0호" },
  { mm: 4.5, us: "7" },
  { mm: 5.0, us: "H/8", jp: "8/0호" },
  { mm: 5.5, us: "I/9" },
  { mm: 6.0, us: "J/10", jp: "10/0호" },
  { mm: 6.5, us: "K/10.5" },
  { mm: 8.0, us: "L/11" },
  { mm: 9.0, us: "M/N/13" },
  { mm: 10.0, us: "N/P/15" },
  { mm: 15.0, us: "P/Q" },
  { mm: 16.0, us: "Q" },
];

export const needleTable = (craft: Craft) =>
  craft === "knit" ? KNITTING_NEEDLES : CROCHET_HOOKS;

/** mm에 가장 가까운 규격을 찾는다. 도안의 mm 표기가 표에 정확히 없을 수 있다. */
export function findNeedle(
  mm: number,
  craft: Craft = "knit"
): NeedleSize | undefined {
  const table = needleTable(craft);
  if (table.length === 0) return undefined;
  return table.reduce((best, cur) =>
    Math.abs(cur.mm - mm) < Math.abs(best.mm - mm) ? cur : best
  );
}

/** 표에 있는 호수만 오름차순으로. 바늘 조정 제안이 이 사다리를 오르내린다. */
export const needleLadder = (craft: Craft = "knit") =>
  [...new Set(needleTable(craft).map((n) => n.mm))].sort((a, b) => a - b);

/* --- 실 굵기 -------------------------------------------------------------- */

/** Craft Yarn Council 표준 굵기 구간 0~7. */
export type YarnWeightClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface YarnWeight {
  cyc: YarnWeightClass;
  /** 국가별 명칭. 한국은 일본 명칭을 그대로 들여왔다. */
  names: { en: string; uk: string; ja: string; ko: string };
  /** 10cm당 권장 메리야스 코수 [최소, 최대] */
  gaugeRange: [number, number];
  /** 권장 대바늘 mm [최소, 최대] */
  needleRangeMm: [number, number];
}

export const YARN_WEIGHTS: YarnWeight[] = [
  {
    cyc: 0,
    names: { en: "Lace", uk: "1–3 ply", ja: "レース糸", ko: "레이스사" },
    gaugeRange: [33, 40],
    needleRangeMm: [1.5, 2.25],
  },
  {
    cyc: 1,
    names: {
      en: "Super Fine / Fingering",
      uk: "4 ply",
      ja: "中細",
      ko: "중세사",
    },
    gaugeRange: [27, 32],
    needleRangeMm: [2.25, 3.25],
  },
  {
    cyc: 2,
    names: { en: "Fine / Sport", uk: "5 ply", ja: "合太", ko: "합태사" },
    gaugeRange: [23, 26],
    needleRangeMm: [3.25, 3.75],
  },
  {
    cyc: 3,
    names: { en: "Light / DK", uk: "8 ply", ja: "並太", ko: "병태사" },
    gaugeRange: [21, 24],
    needleRangeMm: [3.75, 4.5],
  },
  {
    cyc: 4,
    names: {
      en: "Medium / Worsted / Aran",
      uk: "10–12 ply",
      ja: "極太",
      ko: "극태사",
    },
    gaugeRange: [16, 20],
    needleRangeMm: [4.5, 5.5],
  },
  {
    cyc: 5,
    names: {
      en: "Bulky / Chunky",
      uk: "12–14 ply",
      ja: "超極太",
      ko: "초극태사",
    },
    gaugeRange: [12, 15],
    needleRangeMm: [5.5, 8.0],
  },
  {
    cyc: 6,
    names: { en: "Super Bulky", uk: "16 ply", ja: "ジャンボ", ko: "슈퍼벌키" },
    gaugeRange: [7, 11],
    needleRangeMm: [8.0, 12.75],
  },
  {
    cyc: 7,
    names: { en: "Jumbo", uk: "—", ja: "ジャンボ", ko: "점보" },
    gaugeRange: [1, 6],
    needleRangeMm: [12.75, 25.0],
  },
];

export const yarnWeight = (cyc: YarnWeightClass) =>
  YARN_WEIGHTS.find((w) => w.cyc === cyc)!;

/**
 * 게이지로 실 굵기를 역추정한다.
 * 라벨을 잃어버린 스태시 실이나 굵기 표기가 없는 해외 실에 쓴다.
 */
export function guessYarnWeight(
  stitchesPer10cm: number
): YarnWeight | undefined {
  return (
    YARN_WEIGHTS.find(
      (w) =>
        stitchesPer10cm >= w.gaugeRange[0] && stitchesPer10cm <= w.gaugeRange[1]
    ) ??
    // 구간 사이에 끼면 가장 가까운 구간으로 보낸다
    YARN_WEIGHTS.reduce<YarnWeight | undefined>((best, w) => {
      const dist = Math.min(
        Math.abs(stitchesPer10cm - w.gaugeRange[0]),
        Math.abs(stitchesPer10cm - w.gaugeRange[1])
      );
      if (!best) return w;
      const bestDist = Math.min(
        Math.abs(stitchesPer10cm - best.gaugeRange[0]),
        Math.abs(stitchesPer10cm - best.gaugeRange[1])
      );
      return dist < bestDist ? w : best;
    }, undefined)
  );
}

/* --- 실 길이·무게 --------------------------------------------------------- */

/** 타래 스펙(무게·길이)으로 그램을 미터로 환산한다. */
export const gramsToMeters = (
  grams: number,
  skeinGrams: number,
  skeinMeters: number
) => (grams / skeinGrams) * skeinMeters;

export const metersToGrams = (
  meters: number,
  skeinGrams: number,
  skeinMeters: number
) => (meters / skeinMeters) * skeinGrams;
