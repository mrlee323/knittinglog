import { describe, expect, it } from "vitest";
import { finishForecast } from "./finish";
import type { SessionLike } from "./stats";

/** `y-m-d h:m`에 시작해 `min`분 동안 `rows`단 뜬 세션 */
const session = (
  y: number,
  m: number,
  d: number,
  min: number,
  rows: number
): SessionLike => {
  const startedAt = new Date(y, m - 1, d, 20, 0);
  return {
    startedAt,
    endedAt: new Date(startedAt.getTime() + min * 60_000),
    rowsAdded: rows,
  };
};

const NOW = new Date(2026, 7, 20, 12, 0); // 2026-08-20 정오

describe("finishForecast", () => {
  it("근거가 없으면 날짜를 만들지 않는다", () => {
    expect(finishForecast([], 100, NOW)).toBeNull();
    // 남은 단수가 없으면 예상할 것이 없다
    expect(finishForecast([session(2026, 8, 18, 60, 20)], 0, NOW)).toBeNull();
    // 1분 미만 세션은 속도의 근거가 못 된다
    expect(finishForecast([session(2026, 8, 18, 0.5, 5)], 100, NOW)).toBeNull();
    // 끝나지 않은 세션은 길이가 없다
    expect(
      finishForecast(
        [{ startedAt: new Date(2026, 7, 18, 20, 0), rowsAdded: 30 }],
        100,
        NOW
      )
    ).toBeNull();
  });

  it("시간당 단수와 남은 시간을 낸다", () => {
    // 60분에 20단 → 시간당 20단, 남은 100단 → 5시간
    const f = finishForecast([session(2026, 8, 18, 60, 20)], 100, NOW)!;
    expect(f.perHour).toBe(20);
    expect(f.hoursLeft).toBe(5);
  });

  it("쉬는 날을 속도에 포함한다", () => {
    // 8/10과 8/19에 각각 1시간씩 60단 → 관측 10일, 총 2시간
    // 하루 평균 0.2시간(12분). 남은 120단 = 2시간 → 10일
    const sessions = [
      session(2026, 8, 10, 60, 60),
      session(2026, 8, 19, 60, 60),
    ];
    const f = finishForecast(sessions, 120, NOW)!;
    expect(f.perHour).toBe(60);
    expect(f.hoursLeft).toBe(2);
    expect(f.hoursPerDay).toBeCloseTo(0.2);
    expect(f.daysLeft).toBe(10);
  });

  it("뜬 날 평균으로 나누지 않는다 — 그러면 10배 낙관이 된다", () => {
    // 위와 같은 기록. "뜬 날은 2일, 하루 1시간" 모델이면 2일이 나온다.
    const sessions = [
      session(2026, 8, 10, 60, 60),
      session(2026, 8, 19, 60, 60),
    ];
    const f = finishForecast(sessions, 120, NOW)!;
    expect(f.daysLeft).not.toBe(2);
  });

  it("예상일은 로컬 자정 기준으로 오늘에 더한다", () => {
    const sessions = [
      session(2026, 8, 10, 60, 60),
      session(2026, 8, 19, 60, 60),
    ];
    const f = finishForecast(sessions, 120, NOW)!;
    // 2026-08-20 + 10일
    expect(f.at.getFullYear()).toBe(2026);
    expect(f.at.getMonth()).toBe(7);
    expect(f.at.getDate()).toBe(30);
    expect(f.at.getHours()).toBe(0);
  });

  it("하루치도 안 남았으면 하루로 올린다", () => {
    // 하루 1시간씩 사흘, 남은 6단 → 0.1시간 → 1일
    const sessions = [
      session(2026, 8, 17, 60, 60),
      session(2026, 8, 18, 60, 60),
      session(2026, 8, 19, 60, 60),
    ];
    const f = finishForecast(sessions, 6, NOW)!;
    expect(f.daysLeft).toBe(1);
  });

  it("세션이 적거나 기간이 짧으면 얇다고 표시한다", () => {
    const one = finishForecast([session(2026, 8, 19, 60, 20)], 100, NOW)!;
    expect(one.thin).toBe(true);

    // 사흘에 걸친 세션 셋이면 근거로 쓸 만하다
    const three = finishForecast(
      [
        session(2026, 8, 17, 60, 20),
        session(2026, 8, 18, 60, 20),
        session(2026, 8, 19, 60, 20),
      ],
      100,
      NOW
    )!;
    expect(three.thin).toBe(false);
  });

  it("하루에 몰아서 뜬 기록도 기간이 짧으면 얇다", () => {
    const sameDay = finishForecast(
      [
        session(2026, 8, 19, 60, 20),
        session(2026, 8, 19, 60, 20),
        session(2026, 8, 19, 60, 20),
      ],
      100,
      NOW
    )!;
    expect(sameDay.hoursPerDay).toBe(3);
    expect(sameDay.thin).toBe(true);
  });
});
