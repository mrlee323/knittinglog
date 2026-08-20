import { describe, expect, it } from "vitest";
import {
  DEFAULT_SELVEDGE,
  equivalentTotal,
  fitRepeat,
  planConversion,
  tileChart,
} from "./construction";
import { createStitchChart, getOp, type StitchChart } from "./stitchChart";

const chartFromRows = (rows: string[][]): StitchChart => ({
  width: rows[0].length,
  height: rows.length,
  ops: rows.slice().reverse().flat(),
});

describe("반복 들어맞기", () => {
  it("나누어떨어지면 맞는다", () => {
    expect(fitRepeat(60, 12)).toMatchObject({
      repeats: 5,
      remainder: 0,
      fits: true,
    });
  });

  it("남으면 안 맞고, 몇 코가 남는지 알려준다", () => {
    expect(fitRepeat(60, 7)).toMatchObject({
      repeats: 8,
      remainder: 4,
      fits: false,
    });
  });

  it("반복이 한 번도 안 들어가면 맞는 게 아니다", () => {
    // 나머지가 0이어도 무늬가 하나도 안 들어간 것이다
    expect(fitRepeat(0, 12)).toMatchObject({
      repeats: 0,
      remainder: 0,
      fits: false,
    });
  });

  it("반복보다 코수가 적으면 안 맞는다", () => {
    expect(fitRepeat(8, 12).fits).toBe(false);
  });

  it("음수 코수는 0으로 본다 — 시접이 폭보다 클 때 생긴다", () => {
    expect(fitRepeat(-5, 12)).toMatchObject({ motifStitches: 0, fits: false });
  });
});

describe("원형으로 바꾸기", () => {
  it("코수가 반복의 배수여야 한다", () => {
    expect(
      planConversion({ from: "flat", to: "round", repeat: 12, total: 144 }).fit
        .fits
    ).toBe(true);
    expect(
      planConversion({ from: "flat", to: "round", repeat: 12, total: 150 }).fit
        .fits
    ).toBe(false);
  });

  it("시접 코를 쓰지 않는다 — 양끝이 만나므로", () => {
    const plan = planConversion({
      from: "round",
      to: "round",
      repeat: 12,
      total: 144,
      selvedge: 3,
    });
    expect(plan.selvedge).toBe(0);
    expect(plan.fit.motifStitches).toBe(144);
  });

  it("모든 단이 겉면이 된다고 알린다", () => {
    expect(
      planConversion({ from: "flat", to: "round", repeat: 12, total: 144 })
        .notes
    ).toContain("everyRowRs");
  });

  it("단 경계 어긋남을 알린다 — 배색·줄무늬에서 두드러진다", () => {
    expect(
      planConversion({ from: "flat", to: "round", repeat: 12, total: 144 })
        .notes
    ).toContain("jog");
  });

  it("평면에서 오면 시접 코를 빼고 모든 단이 겉면이 된다고 알린다", () => {
    const notes = planConversion({
      from: "flat",
      to: "round",
      repeat: 12,
      total: 144,
    }).notes;
    expect(notes).toContain("dropSelvedge");
    expect(notes).toContain("everyRowRs");
  });

  it("원형에 머무는 경우에는 시접·면 이야기를 하지 않는다", () => {
    // 코수만 확인하는 경우다. 바뀌지 않는 것을 알리면 무엇이 바뀌는지 흐려진다.
    const notes = planConversion({
      from: "round",
      to: "round",
      repeat: 12,
      total: 144,
    }).notes;
    expect(notes).not.toContain("dropSelvedge");
    expect(notes).not.toContain("everyRowRs");
    expect(notes).toContain("mustDivide");
  });

  it("평면에 머무는 경우에는 새로 알릴 것이 없다", () => {
    expect(
      planConversion({ from: "flat", to: "flat", repeat: 12, total: 146 }).notes
    ).toEqual([]);
  });
});

describe("평면으로 바꾸기", () => {
  it("시접 코가 기본으로 양쪽에 붙는다", () => {
    const plan = planConversion({
      from: "round",
      to: "flat",
      repeat: 12,
      total: 146,
    });
    expect(plan.selvedge).toBe(DEFAULT_SELVEDGE);
    // 146 - 2 = 144, 12의 배수
    expect(plan.fit.motifStitches).toBe(144);
    expect(plan.fit.fits).toBe(true);
  });

  it("시접을 뺀 안쪽이 반복의 배수여야 한다", () => {
    // 144코는 원형에서는 맞지만 평면에서는 시접 2코를 빼면 142코가 되어 안 맞는다
    expect(
      planConversion({ from: "flat", to: "round", repeat: 12, total: 144 }).fit
        .fits
    ).toBe(true);
    expect(
      planConversion({ from: "round", to: "flat", repeat: 12, total: 144 }).fit
        .fits
    ).toBe(false);
  });

  it("시접 코수를 바꿀 수 있다", () => {
    const plan = planConversion({
      from: "round",
      to: "flat",
      repeat: 12,
      total: 150,
      selvedge: 3,
    });
    expect(plan.fit.motifStitches).toBe(144);
    expect(plan.fit.fits).toBe(true);
  });

  it("안면 단·이음선·무늬 끊김을 알린다", () => {
    const notes = planConversion({
      from: "round",
      to: "flat",
      repeat: 12,
      total: 146,
    }).notes;
    expect(notes).toContain("alternatingSides");
    expect(notes).toContain("seam");
    expect(notes).toContain("motifBreaks");
  });
});

describe("가까운 코수 제안", () => {
  it("안 맞으면 아래·위 후보를 준다", () => {
    // 150 / 12 = 12회 + 6코
    const plan = planConversion({
      from: "flat",
      to: "round",
      repeat: 12,
      total: 150,
    });
    expect(plan.nearest).toEqual({ down: 144, up: 156 });
  });

  it("이미 맞으면 반복 하나 적은/많은 값을 준다", () => {
    const plan = planConversion({
      from: "flat",
      to: "round",
      repeat: 12,
      total: 144,
    });
    expect(plan.nearest).toEqual({ down: 132, up: 156 });
  });

  it("후보에 시접 코가 포함된다 — 그대로 캐스트온할 수 있는 값이어야 한다", () => {
    const plan = planConversion({
      from: "round",
      to: "flat",
      repeat: 12,
      total: 150,
      selvedge: 1,
    });
    // 안쪽 148 → 12회(144) + 4코 남음. 아래 후보 144+2, 위 후보 156+2
    expect(plan.nearest).toEqual({ down: 146, up: 158 });
  });

  it("반복이 하나뿐이면 아래 후보가 없다", () => {
    expect(
      planConversion({ from: "flat", to: "round", repeat: 12, total: 12 })
        .nearest.down
    ).toBeNull();
  });

  it("반복이 하나도 안 들어가면 아래 후보가 없다", () => {
    const plan = planConversion({
      from: "flat",
      to: "round",
      repeat: 12,
      total: 8,
    });
    expect(plan.nearest.down).toBeNull();
    expect(plan.nearest.up).toBe(12);
  });
});

describe("방식 사이로 옮기기", () => {
  it("원형 144코는 평면에서 146코가 된다 — 같은 12회 + 시접 2코", () => {
    expect(
      equivalentTotal({ repeats: 12, repeat: 12, to: "flat", selvedge: 1 })
    ).toBe(146);
  });

  it("평면 146코는 원형에서 144코가 된다", () => {
    const plan = planConversion({
      from: "flat",
      to: "flat",
      repeat: 12,
      total: 146,
      selvedge: 1,
    });
    expect(
      equivalentTotal({ repeats: plan.fit.repeats, repeat: 12, to: "round" })
    ).toBe(144);
  });

  it("둘레가 아니라 무늬 횟수를 유지한다", () => {
    // 시접이 두꺼워도 무늬 횟수는 그대로다 — 무늬가 몇 번 도는지가 인상을 정한다
    const thin = equivalentTotal({
      repeats: 10,
      repeat: 8,
      to: "flat",
      selvedge: 1,
    });
    const thick = equivalentTotal({
      repeats: 10,
      repeat: 8,
      to: "flat",
      selvedge: 4,
    });
    expect(thin).toBe(82);
    expect(thick).toBe(88);
  });

  it("원형에는 시접을 붙이지 않는다", () => {
    expect(
      equivalentTotal({ repeats: 10, repeat: 8, to: "round", selvedge: 4 })
    ).toBe(80);
  });

  it("옮긴 코수는 그 방식에서 딱 맞는다", () => {
    for (const to of ["flat", "round"] as const) {
      const total = equivalentTotal({
        repeats: 7,
        repeat: 11,
        to,
        selvedge: 2,
      });
      const plan = planConversion({
        from: to === "flat" ? "round" : "flat",
        to,
        repeat: 11,
        total,
        selvedge: 2,
      });
      expect(plan.fit.fits, to).toBe(true);
      expect(plan.fit.repeats, to).toBe(7);
    }
  });
});

describe("무늬 늘어놓기", () => {
  const motif = chartFromRows([["purl", "knit", "knit", "yo"]]);

  it("목표 코수만큼 반복한다", () => {
    const tiled = tileChart(motif, 8);
    expect(tiled.width).toBe(8);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((x) => getOp(tiled, x, 0))).toEqual([
      "purl",
      "knit",
      "knit",
      "yo",
      "purl",
      "knit",
      "knit",
      "yo",
    ]);
  });

  it("딱 맞지 않으면 마지막 반복이 끊긴 채로 보인다", () => {
    // 숫자로 "2코 남아요"를 말하는 것과 어디서 잘리는지 보는 것은 다르다
    const tiled = tileChart(motif, 6);
    expect([0, 1, 2, 3, 4, 5].map((x) => getOp(tiled, x, 0))).toEqual([
      "purl",
      "knit",
      "knit",
      "yo",
      "purl",
      "knit",
    ]);
  });

  it("시접 코는 겉뜨기로 둔다 — 격자에서 빈 칸이라 무늬와 구별된다", () => {
    const tiled = tileChart(motif, 6, 1);
    expect([0, 1, 2, 3, 4, 5].map((x) => getOp(tiled, x, 0))).toEqual([
      "knit", // 시접
      "purl",
      "knit",
      "knit",
      "yo", // 무늬 1회
      "knit", // 시접
    ]);
  });

  it("단 수는 그대로다 — 늘어놓는 것은 가로 방향뿐이다", () => {
    const two = chartFromRows([
      ["knit", "purl"],
      ["purl", "knit"],
    ]);
    const tiled = tileChart(two, 6);
    expect(tiled.height).toBe(2);
    expect(getOp(tiled, 0, 0)).toBe("purl");
    expect(getOp(tiled, 0, 1)).toBe("knit");
  });

  it("늘어놓은 무늬도 아래가 첫 단이다", () => {
    const two = chartFromRows([
      ["yo", "yo"],
      ["knit", "knit"],
    ]);
    const tiled = tileChart(two, 4);
    expect(getOp(tiled, 0, 0)).toBe("knit");
    expect(getOp(tiled, 0, 1)).toBe("yo");
  });

  it("빈 시접이면 무늬가 끝에서 끝까지 채워진다", () => {
    const tiled = tileChart(motif, 4, 0);
    expect(getOp(tiled, 3, 0)).toBe("yo");
  });

  it("목표 코수가 0이어도 격자가 깨지지 않는다", () => {
    const tiled = tileChart(motif, 0);
    expect(tiled.width).toBe(1);
    expect(tiled.ops).toHaveLength(1);
  });

  it("늘어놓아도 격자 크기와 칸 수가 맞는다", () => {
    const tiled = tileChart(createStitchChart(7, 5), 30, 2);
    expect(tiled.ops).toHaveLength(30 * 5);
  });
});
