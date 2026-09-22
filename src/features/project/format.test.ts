import { describe, expect, it } from "vitest";
import { ko } from "@/i18n/ui/ko";
import { daysSince, lastWorkedLabel } from "./format";

const NOW = new Date("2026-09-22T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("daysSince", () => {
  it("오늘이면 0이다", () => {
    expect(daysSince(NOW, NOW)).toBe(0);
  });

  it("지난 날수를 내림한다", () => {
    expect(daysSince(daysAgo(9), NOW)).toBe(9);
  });

  it("미래 날짜는 0으로 본다 — 시계가 어긋난 기기", () => {
    expect(daysSince(new Date(NOW.getTime() + 86_400_000), NOW)).toBe(0);
  });
});

describe("lastWorkedLabel", () => {
  it("계획중은 아직 뜬 적이 없다", () => {
    // "3일 전에 떴어요"라고 할 수 없는 자리다(006).
    expect(
      lastWorkedLabel(ko, { status: "planning", updatedAt: daysAgo(3) }, NOW)
    ).toBe(ko.dashboard.notStarted);
  });

  it("오늘 떴으면 날수를 말하지 않는다", () => {
    expect(lastWorkedLabel(ko, { status: "active", updatedAt: NOW }, NOW)).toBe(
      ko.dashboard.lastWorkedToday
    );
  });

  it("며칠 전이면 그 날수를 넣는다", () => {
    expect(
      lastWorkedLabel(ko, { status: "active", updatedAt: daysAgo(9) }, NOW)
    ).toBe("9일 전에 떴어요");
  });

  it("잠시멈춤도 마지막으로 뜬 때를 말한다", () => {
    // 멈춘 기간은 목록의 `pausedLabel`이 따로 말한다. 여기서 묻는 것은
    // "언제 떴나"이지 "얼마나 멈췄나"가 아니다.
    expect(
      lastWorkedLabel(
        ko,
        { status: "hibernating", updatedAt: daysAgo(41) },
        NOW
      )
    ).toBe("41일 전에 떴어요");
  });
});
