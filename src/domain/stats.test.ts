import { describe, expect, it } from "vitest";
import {
  aggregateSessions,
  countByStatus,
  currentStreak,
  daysAgo,
  finishedInYear,
  localDateKey,
  longestPaused,
  medianPauseDays,
  reasonOutcomes,
  rowsHeatmap,
  resumeCandidate,
  rowsByDate,
  sessionsSince,
  splitDuration,
  sumYarnUse,
  type PauseRecord,
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

describe("잔디 히트맵", () => {
  it("요청한 일수만큼 오늘까지 채운다", () => {
    const cells = rowsHeatmap([], NOW, 7);
    expect(cells.length).toBe(7);
    expect(cells[cells.length - 1].key).toBe("2026-08-14");
    expect(cells[0].key).toBe("2026-08-08");
  });

  it("안 뜬 날은 0단계다", () => {
    expect(rowsHeatmap([], NOW, 7).every((c) => c.level === 0)).toBe(true);
  });

  it("강도는 자기 기록 안에서의 상대값이다", () => {
    // 같은 분포를 10배 키워도 단계는 그대로여야 한다 —
    // 격자가 말하는 건 "많이 떴나"가 아니라 "꾸준했나"다
    const small = [
      session(2026, 8, 14, 20, 4),
      session(2026, 8, 13, 20, 3),
      session(2026, 8, 12, 20, 2),
      session(2026, 8, 11, 20, 1),
    ];
    const big = [
      session(2026, 8, 14, 20, 40),
      session(2026, 8, 13, 20, 30),
      session(2026, 8, 12, 20, 20),
      session(2026, 8, 11, 20, 10),
    ];
    const levels = (s: SessionLike[]) =>
      rowsHeatmap(s, NOW, 7).map((c) => c.level);
    expect(levels(small)).toEqual(levels(big));
  });

  it("가장 많이 뜬 날이 가장 진하다", () => {
    const cells = rowsHeatmap(
      [session(2026, 8, 14, 20, 40), session(2026, 8, 13, 20, 1)],
      NOW,
      7
    );
    const byKey = new Map(cells.map((c) => [c.key, c.level]));
    expect(byKey.get("2026-08-14")).toBe(4);
    expect(byKey.get("2026-08-13")).toBeLessThan(4);
  });

  it("요일을 함께 준다 — 주 단위 격자의 첫 주를 밀어야 한다", () => {
    const cells = rowsHeatmap([], NOW, 1);
    // 2026-08-14는 금요일
    expect(cells[0].weekday).toBe(new Date(2026, 7, 14).getDay());
  });
});

describe("실 소비량", () => {
  it("타래 수와 무게·길이를 합산한다", () => {
    expect(
      sumYarnUse([
        { skeins: 4, skeinGrams: 50, skeinMeters: 125 },
        { skeins: 2, skeinGrams: 40, skeinMeters: 120 },
      ])
    ).toEqual({ skeins: 6, grams: 280, meters: 740 });
  });

  it("스펙을 모르는 실은 타래만 센다", () => {
    // 모르는 값을 0으로 넣으면 합계가 조용히 작아진다
    expect(sumYarnUse([{ skeins: 3 }])).toEqual({
      skeins: 3,
      grams: 0,
      meters: 0,
    });
  });

  it("빈 목록도 처리한다", () => {
    expect(sumYarnUse([])).toEqual({ skeins: 0, grams: 0, meters: 0 });
  });
});

describe("히트맵 단계 나누기", () => {
  it("매일 같은 양을 떴으면 모두 같은 중간 단계다", () => {
    // 흐린 단계로 두면 꾸준히 뜬 사람의 격자가 통째로 희미해진다
    const cells = rowsHeatmap(
      [session(2026, 8, 14, 20, 20), session(2026, 8, 13, 20, 20)],
      NOW,
      7
    );
    const worked = cells.filter((c) => c.rows > 0);
    expect(worked.every((c) => c.level === 3)).toBe(true);
  });

  it("하루만 떴어도 희미하게 두지 않는다", () => {
    const cells = rowsHeatmap([session(2026, 8, 14, 20, 5)], NOW, 7);
    expect(cells.find((c) => c.rows > 0)?.level).toBe(3);
  });

  it("특출난 하루가 나머지를 짓누르지 않는다", () => {
    const cells = rowsHeatmap(
      [
        session(2026, 8, 14, 20, 500),
        session(2026, 8, 13, 20, 30),
        session(2026, 8, 12, 20, 20),
        session(2026, 8, 11, 20, 10),
      ],
      NOW,
      7
    );
    const byKey = new Map(cells.map((c) => [c.key, c.level]));
    expect(byKey.get("2026-08-14")).toBe(4);
    // 평범한 날들이 전부 1단계로 몰리지 않는다
    expect(
      new Set([
        byKey.get("2026-08-13"),
        byKey.get("2026-08-12"),
        byKey.get("2026-08-11"),
      ]).size
    ).toBeGreaterThan(1);
  });
});

describe("중단 이력", () => {
  const D = (m: number, d: number) => new Date(2026, m - 1, d);
  const events: PauseRecord[] = [
    // 게이지실패 3번 — 그중 1번만 돌아왔다
    {
      reason: "gauge-failed",
      pausedAt: D(1, 1),
      endedAt: D(1, 11),
      endedBy: "resumed",
    },
    {
      reason: "gauge-failed",
      pausedAt: D(3, 1),
      endedAt: D(3, 6),
      endedBy: "frogged",
    },
    { reason: "gauge-failed", pausedAt: D(6, 1) },
    // 실부족 2번 — 둘 다 돌아왔다
    {
      reason: "out-of-yarn",
      pausedAt: D(2, 1),
      endedAt: D(2, 21),
      endedBy: "resumed",
    },
    {
      reason: "out-of-yarn",
      pausedAt: D(5, 1),
      endedAt: D(5, 3),
      endedBy: "resumed",
    },
    // 싫증 1번 — 완성으로 끝났다
    {
      reason: "bored",
      pausedAt: D(4, 1),
      endedAt: D(4, 5),
      endedBy: "finished",
    },
  ];

  it("평생 횟수를 사유별로 센다", () => {
    expect(reasonOutcomes(events).map((o) => [o.reason, o.total])).toEqual([
      ["gauge-failed", 3],
      ["out-of-yarn", 2],
      ["bored", 1],
    ]);
  });

  it("돌아온 횟수를 따로 센다 — 자주 멈추는 것과 안 돌아오는 것은 다르다", () => {
    const byReason = new Map(reasonOutcomes(events).map((o) => [o.reason, o]));
    expect(byReason.get("gauge-failed")).toMatchObject({
      total: 3,
      resumed: 1,
      open: 1,
    });
    expect(byReason.get("out-of-yarn")).toMatchObject({
      total: 2,
      resumed: 2,
      open: 0,
    });
    // 완성으로 끝난 것은 "돌아온" 것이 아니다
    expect(byReason.get("bored")).toMatchObject({
      total: 1,
      resumed: 0,
      open: 0,
    });
  });

  it("이력이 없으면 빈 목록", () => {
    expect(reasonOutcomes([])).toEqual([]);
  });

  it("멈춘 기간의 중앙값을 낸다", () => {
    // 기간: 10, 5, ?, 20, 2, 4
    const now = D(6, 11); // 열려 있는 건 10일째
    // 정렬하면 2, 4, 5, 10, 10, 20 → 중앙값 (5+10)/2 = 7.5 → 8
    expect(medianPauseDays(events, now)).toBe(8);
  });

  it("평균이 아니라 중앙값이다 — 한 번의 장기 방치에 끌려가지 않는다", () => {
    const withOutlier: PauseRecord[] = [
      { reason: "bored", pausedAt: D(1, 1), endedAt: D(1, 3) },
      { reason: "bored", pausedAt: D(2, 1), endedAt: D(2, 4) },
      { reason: "bored", pausedAt: D(3, 1), endedAt: D(3, 5) },
      // 700일 방치
      {
        reason: "bored",
        pausedAt: new Date(2024, 0, 1),
        endedAt: new Date(2025, 11, 1),
      },
    ];
    const median = medianPauseDays(withOutlier, D(6, 1))!;
    expect(median).toBeLessThan(10);
  });

  it("아직 멈춰 있는 것도 지금까지의 기간으로 센다", () => {
    // 진행 중인 방치를 빼면 가장 오래 멈춘 것들이 통계에서 사라진다
    const open: PauseRecord[] = [{ reason: "bored", pausedAt: D(1, 1) }];
    expect(medianPauseDays(open, D(1, 31))).toBe(30);
  });

  it("이력이 없으면 null", () => {
    expect(medianPauseDays([], D(1, 1))).toBeNull();
  });
});
