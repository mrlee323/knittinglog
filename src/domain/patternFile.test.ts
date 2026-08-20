import { describe, expect, it } from "vitest";
import { checkBackup } from "./backup";
import {
  isPatternFile,
  PATTERN_TABLE,
  patternEnvelope,
  patternFileName,
  patternsIn,
  readSharedChart,
  receivedName,
  stripContext,
} from "./patternFile";

const at = new Date("2026-08-20T00:00:00.000Z");

describe("봉투", () => {
  it("백업 파일과 같은 형식이라 형식 확인을 그대로 통과한다", () => {
    // 인코딩·형식 확인·병합 계획을 재사용하는 것이 봉투를 공유하는 이유다
    const file = patternEnvelope({ id: "a", name: "물결" }, at);
    expect(checkBackup(file).ok).toBe(true);
  });

  it("도안 파일임을 표시한다", () => {
    expect(isPatternFile(patternEnvelope({}, at))).toBe(true);
  });

  it("kind가 없으면 백업으로 본다 — 이 필드가 생기기 전 백업이 그렇다", () => {
    const oldBackup = {
      app: "knittinglog" as const,
      format: 1,
      dbVersion: 8,
      createdAt: at.toISOString(),
      includesMedia: true,
      tables: { stitchCharts: [{ id: "a" }] },
    };
    expect(isPatternFile(oldBackup)).toBe(false);
  });

  it("도안을 꺼낸다", () => {
    const file = patternEnvelope({ id: "a" }, at);
    expect(patternsIn(file)).toEqual([{ id: "a" }]);
    expect(file.tables[PATTERN_TABLE]).toHaveLength(1);
  });

  it("도안이 없는 봉투에서도 터지지 않는다", () => {
    expect(patternsIn({ ...patternEnvelope({}, at), tables: {} })).toEqual([]);
    expect(
      patternsIn({
        ...patternEnvelope({}, at),
        tables: { stitchCharts: "배열이 아님" as never },
      })
    ).toEqual([]);
  });

  it("사진을 담지 않는다고 표시한다 — 도안에는 이미지가 없다", () => {
    expect(patternEnvelope({}, at).includesMedia).toBe(false);
  });
});

describe("보낸 사람 맥락 떼기", () => {
  const shared = {
    id: "chart-1",
    name: "물결 레이스",
    width: 12,
    height: 8,
    ops: ["knit", "yo"],
    flat: true,
    firstRowSide: "ws",
    castOn: 144,
    gaugeId: "보낸사람게이지",
    projectId: "보낸사람프로젝트",
  };

  it("끊긴 참조가 되는 것을 뗀다", () => {
    // 내 기기에는 그 게이지도 프로젝트도 없다. 그대로 넣으면 완성 모양이
    // 계산되지 않거나 없는 프로젝트에 매달린다.
    const out = stripContext(shared) as Record<string, unknown>;
    expect(out.gaugeId).toBeUndefined();
    expect(out.projectId).toBeUndefined();
  });

  it("시작 코수도 뗀다 — 보낸 사람의 옷 치수다", () => {
    expect((stripContext(shared) as Record<string, unknown>).castOn).toBeUndefined();
  });

  it("무늬 자체는 그대로 남는다", () => {
    expect(stripContext(shared)).toEqual({
      id: "chart-1",
      name: "물결 레이스",
      width: 12,
      height: 8,
      ops: ["knit", "yo"],
      flat: true,
      firstRowSide: "ws",
    });
  });

  it("원본을 바꾸지 않는다", () => {
    stripContext(shared);
    expect(shared.gaugeId).toBe("보낸사람게이지");
  });

  it("뗄 것이 없어도 동작한다", () => {
    expect(stripContext({ id: "a", name: "b" })).toEqual({ id: "a", name: "b" });
  });
});

describe("받은 도안 확인 — 파일은 신뢰할 수 없다", () => {
  const good = {
    name: "물결",
    width: 3,
    height: 2,
    ops: ["knit", "yo", "ssk", "purl", "purl", "purl"],
  };

  it("모양이 맞으면 받아들인다", () => {
    expect(readSharedChart(good)).toMatchObject({ width: 3, height: 2 });
  });

  it("칸 수가 코수×단수와 다르면 거부한다", () => {
    // 어긋나면 격자 렌더러가 없는 칸을 읽는다 — 사진→차트에서 같은 실수를
    // 이미 한 번 했다
    expect(readSharedChart({ ...good, ops: good.ops.slice(0, 5) })).toBeNull();
    expect(readSharedChart({ ...good, width: 4 })).toBeNull();
  });

  it("칸 값이 문자가 아니면 거부한다", () => {
    expect(readSharedChart({ ...good, ops: [1, 2, 3, 4, 5, 6] })).toBeNull();
  });

  it("크기가 없거나 이상하면 거부한다", () => {
    expect(readSharedChart({ ...good, width: 0 })).toBeNull();
    expect(readSharedChart({ ...good, width: -3 })).toBeNull();
    expect(readSharedChart({ ...good, width: "셋" })).toBeNull();
    expect(readSharedChart({ name: "이름만" })).toBeNull();
  });

  it("터무니없이 큰 도안은 거부한다 — 화면이 멈춘다", () => {
    expect(
      readSharedChart({ name: "큰것", width: 500, height: 500, ops: [] })
    ).toBeNull();
  });

  it("도안이 아닌 값에서 터지지 않는다", () => {
    expect(readSharedChart(null)).toBeNull();
    expect(readSharedChart("문자열")).toBeNull();
    expect(readSharedChart(42)).toBeNull();
    expect(readSharedChart([])).toBeNull();
  });

  it("이름이 없으면 채운다 — 이름이 없는 건 못 쓸 이유가 아니다", () => {
    expect(readSharedChart({ ...good, name: "   " })?.name).toBe("받은 도안");
    expect(readSharedChart({ ...good, name: undefined })?.name).toBe("받은 도안");
  });

  it("모르는 값의 평면/시작면은 버린다", () => {
    const out = readSharedChart({ ...good, flat: "네", firstRowSide: "위" });
    expect(out?.flat).toBeUndefined();
    expect(out?.firstRowSide).toBeUndefined();
  });

  it("맞는 평면/시작면은 남긴다", () => {
    const out = readSharedChart({ ...good, flat: true, firstRowSide: "ws" });
    expect(out).toMatchObject({ flat: true, firstRowSide: "ws" });
  });
});

describe("받은 도안 이름", () => {
  it("받았다는 표시를 붙인다", () => {
    expect(receivedName("물결 레이스", [], "받음")).toBe("물결 레이스 (받음)");
  });

  it("같은 것을 또 받으면 번호를 붙인다", () => {
    // 단체방에 같은 파일이 다시 올라오는 일은 실제로 생긴다
    expect(receivedName("물결", ["물결 (받음)"], "받음")).toBe("물결 (받음 2)");
    expect(
      receivedName("물결", ["물결 (받음)", "물결 (받음 2)"], "받음")
    ).toBe("물결 (받음 3)");
  });

  it("이름이 비어도 이름이 나온다", () => {
    expect(receivedName("  ", [], "받음")).toBe("도안 (받음)");
  });
});

describe("파일 이름", () => {
  it("도안 이름과 확장자로 만든다", () => {
    expect(patternFileName("물결 레이스")).toBe("물결 레이스.knit.json");
  });

  it("파일 이름에 못 쓰는 글자를 뺀다", () => {
    expect(patternFileName('소매 3/4 "긴"')).toBe("소매 3 4 긴.knit.json");
  });

  it("아주 긴 이름을 자른다", () => {
    expect(patternFileName("가".repeat(200)).length).toBeLessThan(60);
  });

  it("이름이 비어도 파일 이름이 나온다", () => {
    expect(patternFileName("   ")).toBe("도안.knit.json");
  });
});
