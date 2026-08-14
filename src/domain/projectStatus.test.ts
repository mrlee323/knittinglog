import { describe, expect, it } from "vitest";
import {
  allowedEvents,
  canTransition,
  daysSincePaused,
  isOpen,
  nextStatus,
  statusPatch,
} from "./projectStatus";

const NOW = new Date("2026-08-14T00:00:00Z");

describe("상태 전이", () => {
  it("계획중에서 시작하면 진행중이 된다", () => {
    expect(nextStatus("planning", { type: "START" })).toBe("active");
  });

  it("진행중에서 멈추면 잠시멈춤이 된다", () => {
    expect(nextStatus("active", { type: "PAUSE", reason: "out-of-yarn" })).toBe(
      "hibernating"
    );
  });

  it("잠시멈춤은 막다른 상태가 아니다 — 돌아올 수 있다", () => {
    expect(nextStatus("hibernating", { type: "RESUME" })).toBe("active");
    expect(canTransition("hibernating", "RESUME")).toBe(true);
  });

  it("잠시멈춤에서 바로 완성할 수도 있다", () => {
    // 멈춘 줄 알았는데 사실 다 뜬 경우가 있다
    expect(nextStatus("hibernating", { type: "FINISH" })).toBe("finished");
  });

  it("완성한 작품을 수선하려고 다시 열 수 있다", () => {
    expect(nextStatus("finished", { type: "REOPEN" })).toBe("active");
  });

  it("풀어버린 프로젝트는 계획중으로 되살린다", () => {
    expect(nextStatus("frogged", { type: "RESTART" })).toBe("planning");
  });

  it("허용되지 않는 전이는 현재 상태를 유지한다", () => {
    expect(nextStatus("planning", { type: "RESUME" })).toBe("planning");
    expect(nextStatus("finished", { type: "START" })).toBe("finished");
    expect(canTransition("planning", "FINISH")).toBe(false);
  });

  it("상태별로 가능한 이벤트만 노출한다", () => {
    expect(allowedEvents("planning").sort()).toEqual(["FROG", "START"]);
    expect(allowedEvents("active").sort()).toEqual(["FINISH", "FROG", "PAUSE"]);
    expect(allowedEvents("frogged")).toEqual(["RESTART"]);
  });
});

describe("전이 기록", () => {
  it("시작하면 시작일을 남긴다", () => {
    const patch = statusPatch({ status: "planning" }, { type: "START" }, NOW);
    expect(patch?.status).toBe("active");
    expect(patch?.startedAt).toEqual(NOW);
  });

  it("중단하면 중단일과 사유를 남긴다", () => {
    const patch = statusPatch(
      { status: "active", startedAt: new Date("2026-01-01") },
      { type: "PAUSE", reason: "gauge-failed", note: "소매가 너무 좁음" },
      NOW
    );
    expect(patch?.status).toBe("hibernating");
    expect(patch?.pausedAt).toEqual(NOW);
    expect(patch?.pauseReason).toBe("gauge-failed");
    expect(patch?.pauseNote).toBe("소매가 너무 좁음");
  });

  it("재개해도 최초 시작일을 덮어쓰지 않는다", () => {
    const started = new Date("2026-01-01");
    const patch = statusPatch(
      { status: "hibernating", startedAt: started },
      { type: "RESUME" },
      NOW
    );
    expect(patch?.startedAt).toEqual(started);
  });

  it("재개하면 중단 사유를 지운다", () => {
    const patch = statusPatch(
      { status: "hibernating", startedAt: new Date("2026-01-01") },
      { type: "RESUME" },
      NOW
    );
    expect(patch?.pauseReason).toBeUndefined();
  });

  it("풀어버린 뒤 다시 계획하면 날짜를 모두 비운다", () => {
    const patch = statusPatch(
      { status: "frogged", startedAt: new Date("2026-01-01") },
      { type: "RESTART" },
      NOW
    );
    expect(patch?.status).toBe("planning");
    expect(patch?.startedAt).toBeUndefined();
    expect(patch?.finishedAt).toBeUndefined();
  });

  it("불가능한 전이는 아무것도 남기지 않는다", () => {
    expect(
      statusPatch({ status: "planning" }, { type: "RESUME" }, NOW)
    ).toBeNull();
  });
});

describe("조회 보조", () => {
  it("손대고 있는 상태를 묶는다", () => {
    expect(isOpen("active")).toBe(true);
    expect(isOpen("hibernating")).toBe(true);
    expect(isOpen("finished")).toBe(false);
  });

  it("멈춘 지 며칠인지 센다", () => {
    const pausedAt = new Date("2026-08-04T00:00:00Z");
    expect(daysSincePaused({ status: "hibernating", pausedAt }, NOW)).toBe(10);
  });

  it("잠시멈춤이 아니면 세지 않는다", () => {
    expect(
      daysSincePaused({ status: "active", pausedAt: NOW }, NOW)
    ).toBeNull();
    expect(daysSincePaused({ status: "hibernating" }, NOW)).toBeNull();
  });
});
