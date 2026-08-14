import { describe, expect, it } from "vitest";
import {
  aggregateSessions,
  countByStatus,
  currentStreak,
  daysAgo,
  finishedInYear,
  localDateKey,
  longestPaused,
  resumeCandidate,
  rowsByDate,
  sessionsSince,
  splitDuration,
  type ProjectLike,
  type SessionLike,
} from "./stats";

const NOW = new Date(2026, 7, 14, 22, 0); // 2026-08-14 22:00 로컬

const session = (
  y: number,
  m: number,
  d: number,
  hour: number,
  rows: number,
  minutes = 60
): SessionLike => {
  const startedAt = new Date(y, m - 1, d, hour);
  return {
    startedAt,
    endedAt: new Date(startedAt.getTime() + minutes * 60_000),
    rowsAdded: rows,
  };
};

describe("날짜 키", () => {
  it("로컬 기준으로 자른다", () => {
    // 밤 11시에 뜬 것은 그날로 잡혀야 한다. UTC로 자르면 다음 날이 된다.
    expect(localDateKey(new Date(2026, 7, 14, 23, 30))).toBe("2026-08-14");
    // 새벽 1시도 그날이다. UTC로 자르면 전날로 밀린다.
    expect(localDateKey(new Date(2026, 7, 14, 1, 0))).toBe("2026-08-14");
  });

  it("한 자리 월·일을 0으로 채운다", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("n일 전 자정을 낸다", () => {
    const d = daysAgo(NOW, 3);
    expect(localDateKey(d)).toBe("2026-08-11");
    expect(d.getHours()).toBe(0);
  });

  it("월 경계를 넘는다", () => {
    expect(localDateKey(daysAgo(new Date(2026, 7, 2), 5))).toBe("2026-07-28");
  });
});

describe("세션 집계", () => {
  const sessions = [
    session(2026, 8, 14, 21, 30, 90),
    session(2026, 8, 14, 10, 12, 30),
    session(2026, 8, 12, 20, 18, 60),
  ];

  it("단수·시간·날짜 수를 센다", () => {
    const total = aggregateSessions(sessions);
    expect(total.rows).toBe(60);
    expect(total.durationMs).toBe(180 * 60_000);
    // 같은 날 두 번 떴으면 하루로 센다
    expect(total.days).toBe(2);
  });

  it("끝나지 않은 세션은 시간을 세지 않는다", () => {
    const total = aggregateSessions([
      { startedAt: new Date(2026, 7, 14, 20), rowsAdded: 5 },
    ]);
    expect(total.rows).toBe(5);
    expect(total.durationMs).toBe(0);
  });

  it("날짜별 단수를 합친다", () => {
    const map = rowsByDate(sessions);
    expect(map.get("2026-08-14")).toBe(42);
    expect(map.get("2026-08-12")).toBe(18);
  });

  it("기준 시각 이후만 고른다", () => {
    expect(sessionsSince(sessions, daysAgo(NOW, 1)).length).toBe(2);
  });

  it("빈 목록도 처리한다", () => {
    expect(aggregateSessions([])).toEqual({ rows: 0, durationMs: 0, days: 0 });
    expect(rowsByDate([]).size).toBe(0);
  });
});

describe("연속 일수", () => {
  it("오늘부터 거꾸로 센다", () => {
    const sessions = [
      session(2026, 8, 14, 20, 10),
      session(2026, 8, 13, 20, 10),
      session(2026, 8, 12, 20, 10),
    ];
    expect(currentStreak(sessions, NOW)).toBe(3);
  });

  it("오늘 안 떴어도 어제까지 이어졌으면 살아 있다", () => {
    // 아침에 앱을 열 때마다 기록이 0으로 보이면 안 된다
    const sessions = [
      session(2026, 8, 13, 20, 10),
      session(2026, 8, 12, 20, 10),
    ];
    expect(currentStreak(sessions, NOW)).toBe(2);
  });

  it("이틀 이상 비었으면 끊긴다", () => {
    expect(currentStreak([session(2026, 8, 11, 20, 10)], NOW)).toBe(0);
  });

  it("기록이 없으면 0이다", () => {
    expect(currentStreak([], NOW)).toBe(0);
  });

  it("중간에 빈 날이 있으면 거기서 멈춘다", () => {
    const sessions = [
      session(2026, 8, 14, 20, 10),
      session(2026, 8, 12, 20, 10), // 13일이 비었다
    ];
    expect(currentStreak(sessions, NOW)).toBe(1);
  });
});

describe("프로젝트 현황", () => {
  const projects: ProjectLike[] = [
    { id: "a", status: "active", updatedAt: new Date(2026, 7, 10) },
    { id: "b", status: "active", updatedAt: new Date(2026, 7, 13) },
    {
      id: "c",
      status: "hibernating",
      updatedAt: new Date(2026, 3, 1),
      pausedAt: new Date(2026, 3, 1),
    },
    {
      id: "d",
      status: "hibernating",
      updatedAt: new Date(2026, 1, 1),
      pausedAt: new Date(2026, 1, 1),
    },
    {
      id: "e",
      status: "finished",
      updatedAt: new Date(2026, 2, 12),
      finishedAt: new Date(2026, 2, 12),
    },
    {
      id: "f",
      status: "finished",
      updatedAt: new Date(2025, 11, 1),
      finishedAt: new Date(2025, 11, 1),
    },
  ];

  it("상태별로 센다", () => {
    expect(countByStatus(projects)).toEqual({
      planning: 0,
      active: 2,
      hibernating: 2,
      finished: 2,
      frogged: 0,
    });
  });

  it("올해 완성한 것만 센다", () => {
    expect(finishedInYear(projects, NOW)).toBe(1);
  });

  it("가장 최근에 손댄 진행중 프로젝트를 고른다", () => {
    expect(resumeCandidate(projects)?.id).toBe("b");
  });

  it("진행중이 없으면 억지로 고르지 않는다", () => {
    const paused = projects.filter((p) => p.status !== "active");
    expect(resumeCandidate(paused)).toBeNull();
    expect(resumeCandidate([])).toBeNull();
  });

  it("오래 멈춘 것부터 나열한다", () => {
    expect(longestPaused(projects).map((p) => p.id)).toEqual(["d", "c"]);
  });

  it("개수를 제한한다", () => {
    expect(longestPaused(projects, 1).map((p) => p.id)).toEqual(["d"]);
  });

  it("중단일이 없는 것은 뒤로 보낸다", () => {
    const list: ProjectLike[] = [
      { id: "x", status: "hibernating", updatedAt: new Date(2026, 0, 1) },
      {
        id: "y",
        status: "hibernating",
        updatedAt: new Date(2026, 5, 1),
        pausedAt: new Date(2026, 5, 1),
      },
    ];
    expect(longestPaused(list).map((p) => p.id)).toEqual(["y", "x"]);
  });
});

describe("표시 보조", () => {
  it("시간을 시·분으로 쪼갠다", () => {
    expect(splitDuration(90 * 60_000)).toEqual({ hours: 1, minutes: 30 });
    expect(splitDuration(45 * 60_000)).toEqual({ hours: 0, minutes: 45 });
    expect(splitDuration(0)).toEqual({ hours: 0, minutes: 0 });
  });

  it("초는 버린다", () => {
    expect(splitDuration(59_000)).toEqual({ hours: 0, minutes: 0 });
  });
});
