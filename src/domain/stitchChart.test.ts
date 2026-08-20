import { describe, expect, it } from "vitest";
import { formatRow, formatRun, hasStitchLabel } from "@/i18n/stitches";
import {
  chartOps,
  findStitch,
  mirrorOp,
  stitchDelta,
  stitchOps,
} from "./stitches";
import {
  createStitchChart,
  drawnRow,
  getOp,
  IN_ROUND,
  mirrorStitchChart,
  opCounts,
  opRuns,
  resizeStitchChart,
  rowOps,
  rowSide,
  setOp,
  stitchChartSizeCm,
  usedOps,
  verifyChart,
  type Reading,
  type StitchChart,
} from "./stitchChart";

/** 격자를 위에서 아래로 읽히는 순서로 적고 저장 순서(아래가 0단)로 바꾼다. */
const chartFromRows = (rows: string[][]): StitchChart => ({
  width: rows[0].length,
  height: rows.length,
  ops: rows.slice().reverse().flat(),
});

describe("기법 표", () => {
  it("모아뜨기는 여러 코를 먹고 한 코를 낸다", () => {
    expect(stitchDelta("k2tog")).toEqual({ consumes: 2, produces: 1 });
    expect(stitchDelta("cdd")).toEqual({ consumes: 3, produces: 1 });
  });

  it("바늘비우기는 아무것도 먹지 않고 한 코를 낸다", () => {
    expect(stitchDelta("yo")).toEqual({ consumes: 0, produces: 1 });
  });

  it("코 없음은 코수에 영향이 없다 — 격자를 채우기 위한 칸일 뿐이다", () => {
    expect(stitchDelta("none")).toEqual({ consumes: 0, produces: 0 });
  });

  it("모르는 기법은 검산에서 빠진다 — 기호 하나 때문에 통째로 틀리지 않게", () => {
    expect(stitchDelta("존재하지않는기법")).toEqual({
      consumes: 0,
      produces: 0,
    });
  });

  it("기울기가 있는 코는 반전 대응이 있다", () => {
    expect(mirrorOp("k2tog")).toBe("ssk");
    expect(mirrorOp("ssk")).toBe("k2tog");
    expect(mirrorOp("m1l")).toBe("m1r");
  });

  it("대칭인 코는 반전해도 그대로다", () => {
    expect(mirrorOp("knit")).toBe("knit");
    expect(mirrorOp("yo")).toBe("yo");
    expect(mirrorOp("cdd")).toBe("cdd");
  });

  it("반전 대응은 서로를 가리킨다 — 두 번 반전하면 원본", () => {
    for (const op of stitchOps("knit")) {
      expect(mirrorOp(mirrorOp(op))).toBe(op);
    }
  });

  it("대바늘 목록에 코바늘 기법이 섞이지 않는다", () => {
    expect(stitchOps("knit")).not.toContain("sc");
    expect(stitchOps("crochet")).toContain("sc");
  });
});

describe("격자", () => {
  it("기본은 메리야스로 채운다", () => {
    const c = createStitchChart(3, 2);
    expect(c.ops).toEqual(new Array(6).fill("knit"));
  });

  it("칸을 바꿔도 원본은 그대로다", () => {
    const a = createStitchChart(2, 2);
    const b = setOp(a, 0, 0, "purl");
    expect(getOp(a, 0, 0)).toBe("knit");
    expect(getOp(b, 0, 0)).toBe("purl");
  });

  it("같은 기법을 다시 찍으면 새 객체를 만들지 않는다", () => {
    const a = createStitchChart(2, 2);
    expect(setOp(a, 0, 0, "knit")).toBe(a);
  });

  it("격자 밖은 무시한다", () => {
    const a = createStitchChart(2, 2);
    expect(setOp(a, 5, 0, "purl")).toBe(a);
    expect(getOp(a, -1, 0)).toBe("knit");
  });

  it("y = 0이 첫 단(맨 아래)이다", () => {
    // 아래 단은 안뜨기, 위 단은 겉뜨기
    const c = chartFromRows([
      ["knit", "knit"],
      ["purl", "purl"],
    ]);
    expect(getOp(c, 0, 0)).toBe("purl");
    expect(getOp(c, 0, 1)).toBe("knit");
  });

  it("크기를 바꿔도 아래쪽 무늬는 좌표가 유지된다", () => {
    const c = setOp(createStitchChart(2, 2), 0, 0, "purl");
    const bigger = resizeStitchChart(c, 4, 4);
    expect(getOp(bigger, 0, 0)).toBe("purl");
    expect(bigger.width).toBe(4);
    expect(bigger.ops).toHaveLength(16);
  });
});

describe("단 읽기", () => {
  it("겉면 단은 오른쪽에서 왼쪽으로 읽는다", () => {
    const c = chartFromRows([["knit", "purl", "purl"]]);
    // 그림 순서는 겉·안·안, 읽는 순서는 안·안·겉
    expect(drawnRow(c, 0)).toEqual(["knit", "purl", "purl"]);
    expect(rowOps(c, 0)).toEqual(["purl", "purl", "knit"]);
  });

  it("안면 단은 왼쪽에서 오른쪽으로 읽는다 — 뒤집어서 뜨므로", () => {
    const c = chartFromRows([["knit", "purl", "purl"]]);
    expect(rowOps(c, 0, "ws")).toEqual(["knit", "purl", "purl"]);
  });

  it("같은 기법을 묶는다", () => {
    const c = chartFromRows([["knit", "knit", "knit", "purl", "purl"]]);
    // 읽는 순서(오른쪽부터)로 묶이므로 안뜨기가 먼저 나온다
    expect(opRuns(c, 0)).toEqual([
      { op: "purl", count: 2 },
      { op: "knit", count: 3 },
    ]);
  });

  it("코 없음 칸은 서술에서 빠진다 — 뜰 수 없는 지시이므로", () => {
    const c = chartFromRows([["none", "knit", "knit", "none"]]);
    expect(opRuns(c, 0)).toEqual([{ op: "knit", count: 2 }]);
  });

  it("코 없음을 사이에 둔 양쪽은 하나로 묶인다", () => {
    // 코 없음은 "이 열은 이 단에 존재하지 않는다"는 뜻이므로, 양옆 코는 바늘
    // 위에서 실제로 맞닿아 있다. 나눠서 "겉 1코, 겉 1코"로 적으면 도안을 읽는
    // 사람에게 없는 경계를 만들어 보여준다.
    const c = chartFromRows([["knit", "none", "knit"]]);
    expect(opRuns(c, 0)).toEqual([{ op: "knit", count: 2 }]);
  });

  it("격자 밖 단은 빈 배열이다", () => {
    const c = createStitchChart(2, 2);
    expect(rowOps(c, 9)).toEqual([]);
    expect(opRuns(c, -1)).toEqual([]);
  });
});

describe("좌우 반전", () => {
  it("기울기가 있는 코는 대응되는 코로 바뀐다", () => {
    // 격자만 뒤집으면 기울기가 반대인 무늬가 나온다
    const c = chartFromRows([["k2tog", "knit", "knit", "ssk"]]);
    const m = mirrorStitchChart(c);
    expect(drawnRow(m, 0)).toEqual(["k2tog", "knit", "knit", "ssk"]);
  });

  it("위치가 실제로 뒤집힌다", () => {
    const c = chartFromRows([["yo", "knit", "knit", "knit"]]);
    const m = mirrorStitchChart(c);
    expect(drawnRow(m, 0)).toEqual(["knit", "knit", "knit", "yo"]);
  });

  it("두 번 반전하면 원본으로 돌아온다", () => {
    const c = chartFromRows([
      ["k2tog", "yo", "m1l", "purl"],
      ["knit", "ssk", "knit", "m1r"],
    ]);
    expect(mirrorStitchChart(mirrorStitchChart(c))).toEqual(c);
  });

  it("단 순서(위아래)는 바뀌지 않는다", () => {
    const c = chartFromRows([
      ["purl", "purl"],
      ["knit", "knit"],
    ]);
    const m = mirrorStitchChart(c);
    expect(getOp(m, 0, 0)).toBe("knit");
    expect(getOp(m, 0, 1)).toBe("purl");
  });

  it("반전한 차트도 코수 검산을 통과한다", () => {
    const c = chartFromRows([
      ["knit", "yo", "k2tog", "knit"],
      ["knit", "knit", "knit", "knit"],
    ]);
    expect(verifyChart(c).ok).toBe(true);
    expect(verifyChart(mirrorStitchChart(c)).ok).toBe(true);
  });
});

describe("코수 검산", () => {
  it("메리야스는 코수가 유지된다", () => {
    const c = createStitchChart(10, 3);
    const b = verifyChart(c);
    expect(b.ok).toBe(true);
    expect(b.startStitches).toBe(10);
    expect(b.finalCount).toBe(10);
  });

  it("바늘비우기와 모아뜨기가 짝이면 코수가 유지된다", () => {
    // 레이스 무늬의 기본 구조 — yo 하나에 감소 하나
    const c = chartFromRows([
      ["knit", "yo", "k2tog", "knit", "knit"],
      ["knit", "knit", "knit", "knit", "knit"],
    ]);
    const b = verifyChart(c);
    expect(b.ok).toBe(true);
    expect(b.rows[1]).toMatchObject({ row: 2, consumes: 5, produces: 5 });
  });

  it("한쪽만 있으면 코수가 변한다", () => {
    const c = chartFromRows([["knit", "knit", "knit", "yo"]]);
    // 4칸 중 yo는 전단 코를 먹지 않으므로 3코를 먹고 4코를 낸다
    const b = verifyChart(c);
    expect(b.startStitches).toBe(3);
    expect(b.finalCount).toBe(4);
  });

  it("전단이 낸 코수와 다음 단이 먹는 코수가 어긋나면 잡아낸다", () => {
    // 1단이 4코를 내는데 2단이 5코를 먹으려 한다
    const c = chartFromRows([
      ["knit", "knit", "knit", "knit", "knit"],
      ["knit", "knit", "k2tog", "none", "none"],
    ]);
    const b = verifyChart(c);
    expect(b.rows[0]).toMatchObject({ row: 1, produces: 3, ok: true });
    expect(b.rows[1]).toMatchObject({ row: 2, consumes: 5, expected: 3 });
    expect(b.rows[1].ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it("코 없음으로 자리를 메우면 줄어드는 무늬가 검산을 통과한다", () => {
    // 아래 5코 → 위 3코. 격자는 5칸을 유지하고 남는 자리는 코 없음.
    const c = chartFromRows([
      ["none", "knit", "knit", "knit", "none"],
      ["k2tog", "knit", "k2tog", "none", "none"],
    ]);
    const b = verifyChart(c);
    expect(b.startStitches).toBe(5);
    expect(b.rows[0]).toMatchObject({ consumes: 5, produces: 3, ok: true });
    expect(b.rows[1]).toMatchObject({ consumes: 3, produces: 3, ok: true });
    expect(b.ok).toBe(true);
  });

  it("1단은 늘 기준이 된다 — 무늬 1회 안쪽만 보므로", () => {
    // 그리는 중인 차트에 "1단이 틀렸다"고 말하는 건 도움이 안 된다
    const c = createStitchChart(7, 1);
    expect(verifyChart(c).rows[0].ok).toBe(true);
    expect(verifyChart(c).startStitches).toBe(7);
  });

  it("실제 시작 코수는 검산의 관심사가 아니다", () => {
    // 격자는 대개 무늬 한 번이다. 7코 무늬에 60코를 들이대면 "60코가 있어야
    // 하는데 7코를 쓴다"는 틀린 경고가 난다. 그 질문은 construction이 맡는다.
    const c = createStitchChart(7, 1);
    expect(verifyChart(c).ok).toBe(true);
  });

  it("늘림도 코수에 반영된다", () => {
    const c = chartFromRows([["knit", "m1l", "knit", "m1r", "knit"]]);
    const b = verifyChart(c);
    expect(b.startStitches).toBe(3);
    expect(b.finalCount).toBe(5);
  });

  it("한 코에 두 코 뜨기는 먹는 코보다 내는 코가 많다", () => {
    const c = chartFromRows([["kfb", "knit"]]);
    const b = verifyChart(c);
    expect(b.startStitches).toBe(2);
    expect(b.finalCount).toBe(3);
  });

  it("단마다 1부터 세는 번호가 붙는다 — 맨 아래가 1단", () => {
    const c = createStitchChart(2, 3);
    expect(verifyChart(c).rows.map((r) => r.row)).toEqual([1, 2, 3]);
  });
});

describe("평면 · 원형", () => {
  it("원형은 모든 단이 겉면이다 — 뒤집는 일이 없으므로", () => {
    for (const y of [0, 1, 2, 7]) expect(rowSide(y, IN_ROUND)).toBe("rs");
  });

  it("기본값은 원형이다", () => {
    expect(rowSide(1)).toBe("rs");
  });

  it("평면은 겉·안면이 번갈아 나온다", () => {
    const flat: Reading = { flat: true, firstSide: "rs" };
    expect([0, 1, 2, 3].map((y) => rowSide(y, flat))).toEqual([
      "rs",
      "ws",
      "rs",
      "ws",
    ]);
  });

  it("안면부터 시작하는 도안도 있다", () => {
    const flat: Reading = { flat: true, firstSide: "ws" };
    expect([0, 1, 2].map((y) => rowSide(y, flat))).toEqual(["ws", "rs", "ws"]);
  });

  it("도안에 그릴 수 있는 기법에는 안면 전용이 섞이지 않는다", () => {
    // 도안은 겉에서 본 모습이므로 안면 기법이 격자에 들어갈 자리가 없다
    expect(chartOps("knit")).toContain("k2tog");
    expect(chartOps("knit")).not.toContain("p2tog");
  });

  it("그릴 수 있는 모든 기법에 안면 대응이 정해져 있다", () => {
    // 새 기호를 더할 때 안면 동작을 정하지 않으면 여기서 걸린다.
    // 정하지 않으면 평면 서술형이 조용히 겉면 기법을 내보낸다.
    for (const op of chartOps("knit")) {
      expect(findStitch(op)?.ws, op).toBeDefined();
    }
  });

  it("안면 대응은 코수가 기호와 같다", () => {
    // 안면에서 뜨는 방법이 다를 뿐 먹고 내는 코수는 같다. 여기가 어긋나면
    // 평면 도안의 코수 검산이 조용히 틀린 값을 낸다.
    for (const op of chartOps("knit")) {
      const def = findStitch(op);
      expect(stitchDelta(def!.ws!), op).toEqual(def!.delta);
    }
  });

  it("코수 검산은 뜨는 방식과 무관하다 — 코수는 면을 가리지 않는다", () => {
    const c = chartFromRows([
      ["knit", "yo", "k2tog", "knit"],
      ["knit", "knit", "knit", "knit"],
    ]);
    expect(verifyChart(c).ok).toBe(true);
  });
});

describe("집계", () => {
  it("기법마다 몇 칸인지 센다", () => {
    const c = chartFromRows([
      ["knit", "purl"],
      ["knit", "knit"],
    ]);
    expect(opCounts(c)).toEqual({ knit: 3, purl: 1 });
  });

  it("범례에는 실제로 쓴 기법만, 코 없음은 빼고 넣는다", () => {
    const c = chartFromRows([["knit", "yo", "k2tog", "none"]]);
    expect(usedOps(c).sort()).toEqual(["k2tog", "knit", "yo"]);
  });

  it("게이지로 완성 크기를 낸다", () => {
    const c = createStitchChart(22, 30);
    const size = stitchChartSizeCm(c, {
      stitchesPer10cm: 22,
      rowsPer10cm: 30,
    });
    expect(size.width).toBeCloseTo(10);
    expect(size.height).toBeCloseTo(10);
  });
});

describe("서술형 변환 (한 ↔ 영)", () => {
  const runs = [
    { op: "knit", count: 5 },
    { op: "k2tog", count: 1 },
    { op: "yo", count: 1 },
    { op: "knit", count: 5 },
  ];

  it("같은 IR에서 두 언어의 도안이 나온다", () => {
    expect(formatRow(runs, "ko")).toBe(
      "겉 5코, 오른코모아, 바늘비우기, 겉 5코"
    );
    expect(formatRow(runs, "en")).toBe("k5, k2tog, yo, k5");
  });

  it("기본 코는 코수를 붙여 쓴다", () => {
    expect(formatRun({ op: "knit", count: 5 }, "en")).toBe("k5");
    expect(formatRun({ op: "purl", count: 2 }, "ko")).toBe("안 2코");
  });

  it("모아뜨기는 반복 횟수로 적는다 — k2tog5라고 쓰지 않는다", () => {
    expect(formatRun({ op: "k2tog", count: 3 }, "en")).toBe("k2tog x3");
    expect(formatRun({ op: "k2tog", count: 3 }, "ko")).toBe("오른코모아 3번");
  });

  it("한 번이면 횟수를 붙이지 않는다", () => {
    expect(formatRun({ op: "ssk", count: 1 }, "en")).toBe("ssk");
    expect(formatRun({ op: "ssk", count: 1 }, "ko")).toBe("왼코모아");
  });

  it("차트에서 바로 두 언어를 낸다", () => {
    const c = chartFromRows([["knit", "knit", "yo", "ssk", "knit"]]);
    // 겉면 단은 오른쪽부터 읽으므로 순서가 뒤집힌다
    expect(formatRow(opRuns(c, 0), "en")).toBe("k1, ssk, yo, k2");
    expect(formatRow(opRuns(c, 0), "ko")).toBe(
      "겉 1코, 왼코모아, 바늘비우기, 겉 2코"
    );
  });

  it("전부 코 없음인 단은 빈 문장이다", () => {
    const c = chartFromRows([["none", "none"]]);
    expect(formatRow(opRuns(c, 0), "ko")).toBe("");
  });

  it("평면 뜨기 안면 단은 방향과 기법이 함께 바뀐다", () => {
    // 레이스 1단을 안면에서 뜨면: 왼쪽부터 읽고, 기호마다 안면 기법으로 바꾼다
    const c = chartFromRows([
      ["knit", "yo", "ssk", "knit", "knit", "knit", "k2tog", "yo", "knit"],
    ]);
    expect(formatRow(opRuns(c, 0, "rs"), "en")).toBe(
      "k1, yo, k2tog, k3, ssk, yo, k1"
    );
    expect(formatRow(opRuns(c, 0, "ws"), "en")).toBe(
      "p1, yo, ssp, p3, p2tog, yo, p1"
    );
  });

  it("안면 단에서 기울기가 뒤바뀌지 않는다", () => {
    // 겉면 오른코모아(k2tog)는 안면에서 p2tog다. ssp로 나오면 완성품의
    // 기울기가 반대가 되는데, delta가 같아서 코수 검산으로는 잡히지 않는다.
    const c = chartFromRows([["k2tog", "ssk"]]);
    // 읽는 순서: 안면은 왼쪽부터이므로 k2tog가 먼저다
    expect(opRuns(c, 0, "ws")).toEqual([
      { op: "p2tog", count: 1 },
      { op: "ssp", count: 1 },
    ]);
  });

  it("전부 겉뜨기 기호인 도안을 평면으로 뜨면 겉·안이 번갈아 나온다", () => {
    // 메리야스가 평면에서 만들어지는 방식이다
    const c = createStitchChart(6, 2);
    expect(formatRow(opRuns(c, 0, "rs"), "ko")).toBe("겉 6코");
    expect(formatRow(opRuns(c, 1, "ws"), "ko")).toBe("안 6코");
  });

  it("두 언어 모두 모든 기법에 이름이 있다", () => {
    // 로케일을 추가할 때 빠진 기법을 여기서 잡는다. 라벨이 op 이름과 같은
    // 경우도 정상이므로(en의 knit) 문자열 비교가 아니라 키 존재로 본다.
    for (const locale of ["ko", "en"] as const) {
      for (const op of [...stitchOps("knit"), ...stitchOps("crochet")]) {
        expect(hasStitchLabel(op, locale)).toBe(true);
      }
    }
  });
});
