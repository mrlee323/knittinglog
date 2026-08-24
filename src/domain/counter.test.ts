import { describe, expect, it } from "vitest";
import {
  applyStep,
  counterBlueprints,
  counterView,
  derivedLinkedValue,
  hoursRemaining,
  isLinked,
  lastLifelineBelow,
  reconcileLinked,
  rowsPerHour,
  rowsToUnravel,
  rowsUntilRepeatTarget,
  stepValue,
  type CounterRecord,
} from "./counter";

describe("파생 값", () => {
  it("목표가 있으면 남은 단수와 진행률을 계산한다", () => {
    const v = counterView({ value: 62, target: 120 });
    expect(v.remaining).toBe(58);
    expect(v.progress).toBeCloseTo(0.5167, 3);
    expect(v.done).toBe(false);
  });

  it("목표가 없으면 진행률도 없다", () => {
    const v = counterView({ value: 40 });
    expect(v.progress).toBeUndefined();
    expect(v.remaining).toBeUndefined();
  });

  it("목표를 넘겨도 진행률은 100%에서 멈춘다", () => {
    const v = counterView({ value: 130, target: 120 });
    expect(v.progress).toBe(1);
    expect(v.remaining).toBe(0);
    expect(v.done).toBe(true);
  });

  it("반복 구간의 위치를 알려준다", () => {
    // 12단 무늬를 25단까지 떴으면 2회 완료 + 현재 반복에서 1단
    const v = counterView({ value: 25, repeatLength: 12 });
    expect(v.repeat).toEqual({
      completed: 2,
      rowInRepeat: 1,
      length: 12,
      target: undefined,
    });
  });

  it("반복 경계에서 딱 떨어진다", () => {
    const v = counterView({ value: 24, repeatLength: 12 });
    expect(v.repeat?.completed).toBe(2);
    expect(v.repeat?.rowInRepeat).toBe(0);
  });

  it("목표 단수가 없으면 반복 목표로 완료를 판정한다", () => {
    expect(
      counterView({ value: 59, repeatLength: 12, repeatTarget: 5 }).done
    ).toBe(false);
    expect(
      counterView({ value: 60, repeatLength: 12, repeatTarget: 5 }).done
    ).toBe(true);
  });

  it("반복 목표까지 남은 단수를 센다", () => {
    expect(
      rowsUntilRepeatTarget({ value: 25, repeatLength: 12, repeatTarget: 5 })
    ).toBe(35);
    expect(rowsUntilRepeatTarget({ value: 25, repeatLength: 12 })).toBeNull();
  });

  it("음수·소수 값을 방어한다", () => {
    expect(counterView({ value: -5 }).value).toBe(0);
    expect(counterView({ value: 3.7 }).value).toBe(3);
  });
});

describe("증감", () => {
  it("0 밑으로 내려가지 않는다", () => {
    expect(stepValue(0, -1)).toBe(0);
    expect(stepValue(3, -5)).toBe(0);
    expect(stepValue(3, 1)).toBe(4);
  });
});

describe("연동 카운터", () => {
  it("메인 값에서 파생시킨다", () => {
    expect(derivedLinkedValue(24, 8)).toBe(3);
    expect(derivedLinkedValue(23, 8)).toBe(2);
    expect(derivedLinkedValue(0, 8)).toBe(0);
  });

  it("도중에 붙였으면 시작값을 보정한다", () => {
    expect(derivedLinkedValue(24, 8, 5)).toBe(8);
  });

  const counters = (): CounterRecord[] => [
    { id: "body", value: 23 },
    { id: "incs", value: 2, linkedCounterId: "body", linkRatio: 8 },
  ];

  it("메인을 올리면 연동도 따라 오른다", () => {
    const updates = applyStep(counters(), "body", 1);
    expect(updates).toEqual([
      { id: "body", value: 24 },
      { id: "incs", value: 3 },
    ]);
  });

  it("경계를 넘지 않으면 연동은 건드리지 않는다", () => {
    const updates = applyStep(counters(), "body", -1);
    expect(updates).toEqual([{ id: "body", value: 22 }]);
  });

  it("되돌리면 연동도 되돌아간다 — 파생이라 어긋날 수 없다", () => {
    const list: CounterRecord[] = [
      { id: "body", value: 24 },
      { id: "incs", value: 3, linkedCounterId: "body", linkRatio: 8 },
    ];
    expect(applyStep(list, "body", -1)).toEqual([
      { id: "body", value: 23 },
      { id: "incs", value: 2 },
    ]);
  });

  it("값이 안 바뀌면 아무것도 쓰지 않는다", () => {
    expect(applyStep([{ id: "a", value: 0 }], "a", -1)).toEqual([]);
  });

  it("없는 카운터는 무시한다", () => {
    expect(applyStep(counters(), "nope", 1)).toEqual([]);
  });

  it("연동 카운터는 직접 증감할 수 없다", () => {
    // 직접 올리면 메인과 어긋나고, 다음 재조정 때 조용히 되돌아간다
    expect(applyStep(counters(), "incs", 1)).toEqual([]);
    expect(isLinked({ value: 0, linkedCounterId: "body", linkRatio: 8 })).toBe(
      true
    );
    expect(isLinked({ value: 0 })).toBe(false);
    // 비율 없는 연동은 연동이 아니다
    expect(isLinked({ value: 0, linkedCounterId: "body" })).toBe(false);
  });

  it("어긋난 연동 값을 다시 맞춘다", () => {
    const drifted: CounterRecord[] = [
      { id: "body", value: 24 },
      { id: "incs", value: 99, linkedCounterId: "body", linkRatio: 8 },
    ];
    expect(reconcileLinked(drifted)).toEqual([{ id: "incs", value: 3 }]);
  });

  it("이미 맞으면 갱신하지 않는다", () => {
    expect(reconcileLinked(counters())).toEqual([]);
  });
});

describe("라이프라인", () => {
  it("현재 단수 아래의 가장 가까운 라이프라인을 찾는다", () => {
    expect(lastLifelineBelow(62, [12, 30, 48])).toBe(48);
    expect(lastLifelineBelow(48, [12, 30, 48])).toBe(48);
  });

  it("라이프라인이 없으면 null", () => {
    expect(lastLifelineBelow(10, [30, 48])).toBeNull();
    expect(lastLifelineBelow(10, [])).toBeNull();
  });

  it("풀어야 할 단수를 센다", () => {
    expect(rowsToUnravel(62, 48)).toBe(14);
    expect(rowsToUnravel(48, 48)).toBe(0);
  });
});

describe("뜨는 속도", () => {
  it("세션 기록에서 시간당 단수를 낸다", () => {
    expect(
      rowsPerHour([
        { rowsAdded: 30, durationMs: 3_600_000 },
        { rowsAdded: 10, durationMs: 3_600_000 },
      ])
    ).toBe(20);
  });

  it("1분 미만 세션은 노이즈라 버린다", () => {
    expect(
      rowsPerHour([
        { rowsAdded: 1, durationMs: 5_000 },
        { rowsAdded: 20, durationMs: 3_600_000 },
      ])
    ).toBe(20);
  });

  it("쓸 세션이 없으면 null", () => {
    expect(rowsPerHour([])).toBeNull();
    expect(rowsPerHour([{ rowsAdded: 0, durationMs: 3_600_000 }])).toBeNull();
  });

  it("남은 시간을 추정한다", () => {
    expect(hoursRemaining(58, 20)).toBeCloseTo(2.9);
    expect(hoursRemaining(58, null)).toBeNull();
  });
});

describe("counterBlueprints", () => {
  const layout = [
    { id: "sleeve", label: "소매", sortOrder: 1, target: 120 },
    {
      id: "body",
      label: "몸판",
      sortOrder: 0,
      target: 180,
      repeatLength: 12,
      repeatTarget: 5,
    },
    {
      id: "pattern",
      label: "무늬",
      sortOrder: 2,
      linkedCounterId: "body",
      linkRatio: 8,
    },
  ];

  it("sortOrder 순서로 정렬한다", () => {
    expect(counterBlueprints(layout).map((c) => c.label)).toEqual([
      "몸판",
      "소매",
      "무늬",
    ]);
  });

  it("목표와 무늬 반복 설정을 그대로 옮긴다", () => {
    const [body] = counterBlueprints(layout);
    expect(body).toMatchObject({
      target: 180,
      repeatLength: 12,
      repeatTarget: 5,
    });
  });

  it("연동 참조를 id가 아니라 순번으로 바꾼다", () => {
    const pattern = counterBlueprints(layout)[2];
    // 정렬 후 몸판이 0번이다 — 새 프로젝트에서 그 자리의 카운터를 따라가야 한다
    expect(pattern.linkedIndex).toBe(0);
    expect(pattern.linkRatio).toBe(8);
  });

  it("목록에 없는 카운터를 따라가던 연동은 버린다", () => {
    const orphan = counterBlueprints([
      { id: "a", label: "몸판", sortOrder: 0 },
      {
        id: "b",
        label: "무늬",
        sortOrder: 1,
        linkedCounterId: "지워진카운터",
        linkRatio: 4,
      },
    ]);
    expect(orphan[1].linkedIndex).toBeUndefined();
    expect(orphan[1].linkRatio).toBeUndefined();
  });

  it("값과 시작값 보정은 옮기지 않는다", () => {
    const [copy] = counterBlueprints([
      { id: "a", label: "몸판", sortOrder: 0, target: 100 },
    ]);
    expect(copy).not.toHaveProperty("value");
    expect(copy).not.toHaveProperty("linkOffset");
  });
});
