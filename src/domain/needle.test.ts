import { describe, expect, it } from "vitest";
import {
  findSameNeedle,
  isFree,
  isTakenByOther,
  needlesForSize,
  sameSize,
  sortNeedles,
  tally,
  type NeedleSpec,
} from "./needle";

const needle = (over: Partial<NeedleSpec> & { id: string }): NeedleSpec => ({
  craft: "knit",
  type: "circular",
  sizeMm: 4,
  ...over,
});

describe("점유 상태", () => {
  it("물린 프로젝트가 없으면 여유다", () => {
    expect(isFree(needle({ id: "a" }))).toBe(true);
    expect(isFree(needle({ id: "b", occupiedByProjectId: "p1" }))).toBe(false);
  });

  it("같은 프로젝트에 물려 있는 건 충돌이 아니다", () => {
    const n = needle({ id: "a", occupiedByProjectId: "p1" });
    expect(isTakenByOther(n, "p1")).toBe(false);
    expect(isTakenByOther(n, "p2")).toBe(true);
  });
});

describe("sortNeedles", () => {
  it("기법 → 종류 → 굵기 → 길이 순으로 정렬한다", () => {
    const sorted = sortNeedles([
      needle({ id: "hook", craft: "crochet", type: "hook", sizeMm: 3 }),
      needle({ id: "dpn", type: "dpn", sizeMm: 3 }),
      needle({ id: "circ80", type: "circular", sizeMm: 4, lengthCm: 80 }),
      needle({ id: "circ40", type: "circular", sizeMm: 4, lengthCm: 40 }),
      needle({ id: "circ3", type: "circular", sizeMm: 3 }),
      needle({ id: "straight", type: "straight", sizeMm: 3 }),
    ]);
    expect(sorted.map((n) => n.id)).toEqual([
      "circ3",
      "circ40",
      "circ80",
      "straight",
      "dpn",
      "hook",
    ]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const input = [needle({ id: "b", sizeMm: 5 }), needle({ id: "a" })];
    sortNeedles(input);
    expect(input.map((n) => n.id)).toEqual(["b", "a"]);
  });
});

describe("같은 바늘 판정", () => {
  it("표기 체계 차이(0.05mm 안쪽)는 같은 굵기로 본다", () => {
    // 일본 0호 2.1mm와 US 0 2.0mm는 다른 바늘이다
    expect(sameSize(2.0, 2.1)).toBe(false);
    // 반올림 표기 차이는 같은 바늘이다
    expect(sameSize(4.0, 4.02)).toBe(true);
  });

  it("굵기·종류·기법·길이가 모두 같으면 이미 가진 바늘이다", () => {
    const stash = [
      needle({ id: "a", sizeMm: 4, lengthCm: 80 }),
      needle({ id: "b", sizeMm: 4, lengthCm: 40 }),
      needle({ id: "c", sizeMm: 4, type: "dpn" }),
    ];
    expect(
      findSameNeedle(stash, {
        craft: "knit",
        type: "circular",
        sizeMm: 4,
        lengthCm: 80,
      })?.id
    ).toBe("a");
  });

  it("길이가 다르면 다른 바늘이다 — 40cm는 80cm를 대체하지 못한다", () => {
    const stash = [needle({ id: "a", sizeMm: 4, lengthCm: 80 })];
    expect(
      findSameNeedle(stash, {
        craft: "knit",
        type: "circular",
        sizeMm: 4,
        lengthCm: 40,
      })
    ).toBeUndefined();
  });

  it("대바늘과 코바늘은 굵기가 같아도 다른 바늘이다", () => {
    const stash = [needle({ id: "a", craft: "knit", type: "circular" })];
    expect(
      findSameNeedle(stash, { craft: "crochet", type: "hook", sizeMm: 4 })
    ).toBeUndefined();
  });
});

describe("needlesForSize", () => {
  const stash = [
    needle({ id: "taken", sizeMm: 4, occupiedByProjectId: "p1" }),
    needle({ id: "free", sizeMm: 4 }),
    needle({ id: "other", sizeMm: 5 }),
    needle({ id: "hook", craft: "crochet", type: "hook", sizeMm: 4 }),
  ];

  it("같은 기법·굵기만 고르고 여유 있는 것을 앞에 둔다", () => {
    expect(needlesForSize(stash, "knit", 4).map((n) => n.id)).toEqual([
      "free",
      "taken",
    ]);
  });

  it("물린 바늘도 목록에서 지우지 않는다 — 그게 바늘 충돌이다", () => {
    expect(needlesForSize(stash, "knit", 4).some((n) => !isFree(n))).toBe(true);
  });
});

describe("tally", () => {
  it("여유와 물린 개수를 센다", () => {
    expect(
      tally([
        needle({ id: "a" }),
        needle({ id: "b", occupiedByProjectId: "p1" }),
        needle({ id: "c", occupiedByProjectId: "p2" }),
      ])
    ).toEqual({ total: 3, free: 1, occupied: 2 });
  });
});
