import { describe, expect, it } from "vitest";
import { nextStep, stepProgress, type ProjectReadiness } from "./projectStart";

const empty: ProjectReadiness = {
  hasYarn: false,
  hasGauge: false,
  hasPiece: false,
  hasCounter: false,
};

describe("nextStep — 다음 걸음 하나만 말한다", () => {
  it("아무것도 없으면 실부터", () => {
    expect(nextStep(empty)).toBe("yarn");
  });

  it("실이 있으면 스와치", () => {
    expect(nextStep({ ...empty, hasYarn: true })).toBe("swatch");
  });

  it("스와치까지 있으면 조각", () => {
    expect(nextStep({ ...empty, hasYarn: true, hasGauge: true })).toBe("piece");
  });

  it("조각까지 있으면 카운터", () => {
    expect(
      nextStep({ ...empty, hasYarn: true, hasGauge: true, hasPiece: true })
    ).toBe("counter");
  });

  it("카운터가 있으면 안내가 끝난다 — 앞이 비어 있어도", () => {
    // 도안을 받아 그대로 뜨는 사람은 계산을 건너뛴다. 세기 시작했으면
    // 안내가 할 일은 없다.
    expect(nextStep({ ...empty, hasCounter: true })).toBe("ready");
  });
});

describe("stepProgress", () => {
  it("지난 단계를 센다", () => {
    expect(stepProgress(empty)).toEqual({ done: 0, total: 4 });
    expect(stepProgress({ ...empty, hasYarn: true, hasGauge: true })).toEqual({
      done: 2,
      total: 4,
    });
  });

  it("건너뛴 단계도 지난 것으로 세지 않는다", () => {
    // 카운터만 있는 경우 — 앞을 건너뛴 것이지 지난 게 아니다
    expect(stepProgress({ ...empty, hasCounter: true })).toEqual({
      done: 1,
      total: 4,
    });
  });
});
