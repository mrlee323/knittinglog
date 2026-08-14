import { describe, expect, it } from "vitest";
import {
  cmToInch,
  findNeedle,
  gramsToMeters,
  gramsToOunces,
  guessYarnWeight,
  inchToCm,
  KNITTING_NEEDLES,
  metersToGrams,
  metersToYards,
  needleLadder,
  ouncesToGrams,
  yardsToMeters,
  yarnWeight,
  YARN_WEIGHTS,
} from "./units";

describe("기본 단위", () => {
  it("길이·무게·실길이를 환산한다", () => {
    expect(cmToInch(2.54)).toBeCloseTo(1);
    expect(inchToCm(4)).toBeCloseTo(10.16);
    expect(gramsToOunces(100)).toBeCloseTo(3.5274, 3);
    expect(metersToYards(100)).toBeCloseTo(109.361, 2);
  });

  it("왕복 변환이 원래 값으로 돌아온다", () => {
    expect(inchToCm(cmToInch(37.5))).toBeCloseTo(37.5);
    expect(ouncesToGrams(gramsToOunces(50))).toBeCloseTo(50);
    expect(yardsToMeters(metersToYards(210))).toBeCloseTo(210);
  });
});

describe("바늘 호수", () => {
  it("mm에 가장 가까운 규격을 찾는다", () => {
    expect(findNeedle(4.0)?.us).toBe("6");
    expect(findNeedle(4.0)?.uk).toBe("8");
    // 표에 없는 값도 근사 매칭된다
    expect(findNeedle(4.05)?.mm).toBe(4.0);
  });

  it("대바늘과 코바늘이 다른 체계다", () => {
    expect(findNeedle(4.0, "knit")?.jp).toBeUndefined();
    expect(findNeedle(4.0, "crochet")?.jp).toBe("7/0호");
    expect(findNeedle(4.0, "crochet")?.us).toBe("G/6");
  });

  it("일본 호수는 0호 2.1mm에서 0.3mm씩 올라간다", () => {
    expect(KNITTING_NEEDLES.find((n) => n.jp === "1호")?.mm).toBe(2.4);
    expect(KNITTING_NEEDLES.find((n) => n.jp === "2호")?.mm).toBe(2.7);
  });

  it("사다리는 중복 없이 오름차순이다", () => {
    const ladder = needleLadder("knit");
    expect(new Set(ladder).size).toBe(ladder.length);
    expect([...ladder].sort((a, b) => a - b)).toEqual(ladder);
  });
});

describe("실 굵기", () => {
  it("CYC 구간별 국가 명칭을 담는다", () => {
    expect(yarnWeight(3).names.en).toContain("DK");
    expect(yarnWeight(3).names.ja).toBe("並太");
    expect(yarnWeight(3).names.ko).toBe("병태사");
    expect(yarnWeight(1).names.uk).toBe("4 ply");
  });

  it("CYC 0~7이 빠짐없이 있다", () => {
    expect(YARN_WEIGHTS.map((w) => w.cyc)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("게이지로 굵기를 역추정한다", () => {
    expect(guessYarnWeight(22)?.cyc).toBe(3); // DK
    expect(guessYarnWeight(28)?.cyc).toBe(1); // fingering
    expect(guessYarnWeight(18)?.cyc).toBe(4); // worsted
  });

  it("구간 사이에 낀 값도 가까운 굵기로 보낸다", () => {
    // 26과 27 사이에는 정의된 구간이 없다
    expect(guessYarnWeight(26.5)).toBeDefined();
  });
});

describe("실 길이 ↔ 무게", () => {
  // 50g / 125m 타래
  it("그램을 미터로 환산한다", () => {
    expect(gramsToMeters(25, 50, 125)).toBeCloseTo(62.5);
  });

  it("왕복 변환이 일치한다", () => {
    expect(metersToGrams(gramsToMeters(37, 50, 125), 50, 125)).toBeCloseTo(37);
  });
});
