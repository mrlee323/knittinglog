import { describe, expect, it } from "vitest";
import { planRepeats, stitchShades } from "./fabric";
import { fromHex } from "./color";

const base = {
  chartWidth: 10,
  chartHeight: 10,
  cellWidth: 10,
  cellHeight: 10,
  availableWidth: 300,
  availableHeight: 300,
};

describe("반복 횟수", () => {
  it("자리를 채울 만큼 깐다", () => {
    // 무늬 하나가 100×100, 자리가 300×300 → 3×3
    expect(planRepeats(base)).toMatchObject({ x: 3, y: 3 });
  });

  it("자리가 무늬보다 작아도 두 번은 깐다", () => {
    // 한 번만 보이면 반복 미리보기가 아니다 — 경계가 어떻게 이어지는지
    // 두 번째가 붙어야 드러난다
    expect(
      planRepeats({ ...base, availableWidth: 50, availableHeight: 50 })
    ).toMatchObject({ x: 2, y: 2 });
  });

  it("모자란 자리는 올려서 채운다 — 잘려도 이어지는 모습이 보여야 한다", () => {
    expect(planRepeats({ ...base, availableWidth: 250 }).x).toBe(3);
  });

  it("게이지 비율이 반영된다", () => {
    // 코가 넓으면 가로로 덜 들어간다
    const wide = planRepeats({ ...base, cellWidth: 20 });
    expect(wide.x).toBeLessThan(planRepeats(base).x);
  });

  it("칸 수 상한을 넘지 않는다", () => {
    // 4코 무늬를 큰 화면에 깔면 수만 칸이 되고, 색칠하는 동안 매번 다시
    // 그리므로 손이 끊긴다
    const plan = planRepeats({
      chartWidth: 4,
      chartHeight: 4,
      cellWidth: 4,
      cellHeight: 4,
      availableWidth: 2000,
      availableHeight: 2000,
      maxCells: 1000,
    });
    expect(plan.cells).toBeLessThanOrEqual(1000);
    expect(plan.capped).toBe(true);
  });

  it("상한에 걸리면 세로를 먼저 줄인다 — 가로로 이어지는 모습이 먼저 궁금하다", () => {
    const plan = planRepeats({
      chartWidth: 10,
      chartHeight: 10,
      cellWidth: 10,
      cellHeight: 10,
      availableWidth: 1000,
      availableHeight: 1000,
      maxCells: 2000,
    });
    expect(plan.x).toBeGreaterThan(plan.y);
  });

  it("상한이 넉넉하면 걸리지 않았다고 알린다", () => {
    expect(planRepeats(base).capped).toBe(false);
  });

  it("반복은 늘 1 이상이다", () => {
    const plan = planRepeats({ ...base, maxCells: 1 });
    expect(plan.x).toBeGreaterThanOrEqual(1);
    expect(plan.y).toBeGreaterThanOrEqual(1);
  });

  it("칸 크기가 0이어도 무한 반복하지 않는다", () => {
    const plan = planRepeats({ ...base, cellWidth: 0, cellHeight: 0 });
    expect(Number.isFinite(plan.x)).toBe(true);
    expect(plan.cells).toBeLessThanOrEqual(12_000);
  });
});

describe("코 색조", () => {
  const lum = (hex: string) => {
    const { r, g, b } = fromHex(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  it("바탕은 실 색 그대로다", () => {
    expect(stitchShades("#b0603c").base).toBe("#b0603c");
  });

  it("어두운 실은 가닥을 밝게 해서 결을 만든다", () => {
    const s = stitchShades("#2b2a28");
    expect(lum(s.strand)).toBeGreaterThan(lum(s.base));
  });

  it("밝은 실은 가닥을 눌러서 결을 만든다 — 흰 실에 흰 하이라이트는 안 보인다", () => {
    const s = stitchShades("#f2efe9");
    expect(lum(s.strand)).toBeLessThan(lum(s.base));
  });

  it("코 사이 그늘은 늘 바탕보다 어둡다", () => {
    for (const hex of ["#ffffff", "#000000", "#b0603c", "#6b8f71", "#ffdd00"]) {
      expect(lum(stitchShades(hex).gap)).toBeLessThanOrEqual(lum(hex));
    }
  });

  it("검은 실도 결이 보인다 — 세 톤이 모두 같으면 색 덩어리가 된다", () => {
    const s = stitchShades("#000000");
    expect(new Set([s.base, s.strand, s.gap]).size).toBeGreaterThan(1);
  });
});
