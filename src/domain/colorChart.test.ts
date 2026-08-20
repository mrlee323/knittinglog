import { describe, expect, it } from "vitest";
import {
  cellAspect,
  chartSizeCm,
  createChart,
  fillArea,
  getCell,
  mirrorChart,
  resizeChart,
  rowRuns,
  setCell,
  stitchCounts,
  type ColorChart,
} from "./colorChart";

const DK = { stitchesPer10cm: 22, rowsPer10cm: 30 };

describe("차트 만들기", () => {
  it("전부 0번 색으로 채운다", () => {
    const c = createChart(4, 3);
    expect(c.cells.length).toBe(12);
    expect(c.cells.every((v) => v === 0)).toBe(true);
  });

  it("크기가 0 이하면 거부한다", () => {
    expect(() => createChart(0, 3)).toThrow(RangeError);
    expect(() => createChart(3, -1)).toThrow(RangeError);
  });

  it("빈 팔레트를 거부한다", () => {
    expect(() => createChart(3, 3, [])).toThrow(RangeError);
  });
});

describe("행 순서 — 뜨개는 아래에서 위로 뜬다", () => {
  it("y=0이 첫 단(맨 아래)이다", () => {
    // 일반 픽셀 에디터처럼 y=0을 위로 두면 좌우 비대칭 무늬가 뒤집혀 나온다
    let c = createChart(3, 2);
    c = setCell(c, 0, 0, 1);
    // 첫 단이 cells의 앞쪽에 있어야 한다
    expect(c.cells[0]).toBe(1);
    expect(getCell(c, 0, 0)).toBe(1);
    expect(getCell(c, 0, 1)).toBe(0);
  });
});

describe("셀 칠하기", () => {
  it("원본을 바꾸지 않는다", () => {
    const a = createChart(2, 2);
    const b = setCell(a, 1, 1, 1);
    expect(a.cells[3]).toBe(0);
    expect(b.cells[3]).toBe(1);
  });

  it("같은 색을 다시 칠하면 같은 객체를 돌려준다", () => {
    // 드래그 중 같은 칸을 계속 지나가도 렌더가 도지 않게
    const a = createChart(2, 2);
    expect(setCell(a, 0, 0, 0)).toBe(a);
  });

  it("범위 밖은 무시한다", () => {
    const a = createChart(2, 2);
    expect(setCell(a, 5, 0, 1)).toBe(a);
    expect(setCell(a, -1, 0, 1)).toBe(a);
  });

  it("팔레트에 없는 색은 무시한다", () => {
    const a = createChart(2, 2);
    expect(setCell(a, 0, 0, 9)).toBe(a);
  });
});

describe("크기 바꾸기", () => {
  it("겹치는 부분을 남긴다", () => {
    let c = createChart(3, 3);
    c = setCell(c, 0, 0, 1);
    c = setCell(c, 2, 2, 1);
    const bigger = resizeChart(c, 5, 5);
    expect(getCell(bigger, 0, 0)).toBe(1);
    expect(getCell(bigger, 2, 2)).toBe(1);
    expect(bigger.cells.length).toBe(25);
  });

  it("아래를 기준으로 유지한다 — 이미 뜬 부분의 좌표가 바뀌지 않아야 한다", () => {
    let c = createChart(2, 2);
    c = setCell(c, 0, 0, 1); // 첫 단
    const taller = resizeChart(c, 2, 4);
    expect(getCell(taller, 0, 0)).toBe(1);
  });

  it("줄이면 넘치는 부분이 잘린다", () => {
    let c = createChart(3, 3);
    c = setCell(c, 2, 2, 1);
    const smaller = resizeChart(c, 2, 2);
    expect(smaller.cells.length).toBe(4);
    expect(smaller.cells.every((v) => v === 0)).toBe(true);
  });
});

describe("좌우 반전", () => {
  it("가로로 뒤집는다", () => {
    let c = createChart(3, 1);
    c = setCell(c, 0, 0, 1);
    const m = mirrorChart(c);
    expect(getCell(m, 0, 0)).toBe(0);
    expect(getCell(m, 2, 0)).toBe(1);
  });

  it("두 번 뒤집으면 원래대로", () => {
    let c = createChart(4, 3);
    c = setCell(c, 1, 2, 1);
    expect(mirrorChart(mirrorChart(c)).cells).toEqual(c.cells);
  });

  it("단 순서는 건드리지 않는다", () => {
    let c = createChart(2, 2);
    c = setCell(c, 0, 0, 1); // 첫 단
    expect(getCell(mirrorChart(c), 1, 0)).toBe(1);
  });
});

describe("게이지 비율 — 코는 정사각형이 아니다", () => {
  it("셀의 가로:세로 비는 단수/코수다", () => {
    // 22코 30단이면 코 폭 4.55mm, 단 높이 3.33mm → 폭이 더 넓다
    expect(cellAspect(DK)).toBeCloseTo(30 / 22);
    expect(cellAspect(DK)).toBeGreaterThan(1);
  });

  it("코수와 단수가 같으면 정사각형이다", () => {
    expect(cellAspect({ stitchesPer10cm: 20, rowsPer10cm: 20 })).toBe(1);
  });

  it("게이지가 0 이하면 거부한다", () => {
    expect(() => cellAspect({ stitchesPer10cm: 0, rowsPer10cm: 30 })).toThrow(
      RangeError
    );
  });

  it("완성 크기를 cm로 낸다", () => {
    // 22코 = 10cm, 30단 = 10cm
    const size = chartSizeCm(createChart(22, 30), DK);
    expect(size.widthCm).toBeCloseTo(10);
    expect(size.heightCm).toBeCloseTo(10);
  });

  it("정사각 격자로 그리면 틀리는 것을 크기로 확인한다", () => {
    // 20 × 20 칸 문양은 칸 수가 같아도 완성품은 정사각형이 아니다
    const size = chartSizeCm(createChart(20, 20), DK);
    expect(size.widthCm).toBeGreaterThan(size.heightCm);
  });
});

describe("색별 코수", () => {
  it("색마다 몇 코인지 센다", () => {
    let c = createChart(3, 2);
    c = setCell(c, 0, 0, 1);
    c = setCell(c, 1, 0, 1);
    expect(stitchCounts(c)).toEqual([4, 2]);
  });

  it("팔레트 길이만큼 돌려준다 — 안 쓴 색도 0으로", () => {
    expect(stitchCounts(createChart(2, 2, ["#a", "#b", "#c"]))).toEqual([
      4, 0, 0,
    ]);
  });
});

describe("단별 읽기", () => {
  it("같은 색을 묶는다", () => {
    let c = createChart(5, 1);
    c = setCell(c, 0, 0, 1);
    c = setCell(c, 1, 0, 1);
    // 왼쪽부터: 1,1,0,0,0
    expect(rowRuns(c, 0, false)).toEqual([
      { color: 1, count: 2 },
      { color: 0, count: 3 },
    ]);
  });

  it("겉면 단은 오른쪽에서 왼쪽으로 읽는다", () => {
    let c = createChart(5, 1);
    c = setCell(c, 0, 0, 1);
    c = setCell(c, 1, 0, 1);
    // 오른쪽부터: 0,0,0,1,1
    expect(rowRuns(c, 0)).toEqual([
      { color: 0, count: 3 },
      { color: 1, count: 2 },
    ]);
  });

  it("한 색뿐이면 묶음도 하나다", () => {
    expect(rowRuns(createChart(8, 1), 0)).toEqual([{ color: 0, count: 8 }]);
  });

  it("범위 밖 단은 빈 목록", () => {
    expect(rowRuns(createChart(3, 2), 5)).toEqual([]);
    expect(rowRuns(createChart(3, 2), -1)).toEqual([]);
  });
});

describe("fillArea", () => {
  /** 문자열로 도안을 만든다 — 눈으로 확인하기 쉽게 */
  const from = (rows: string[]): ColorChart => ({
    width: rows[0].length,
    height: rows.length,
    palette: ["#fff", "#000", "#f00"],
    // 저장은 y=0이 첫 단(아래)이므로 뒤집어 넣는다
    cells: [...rows]
      .reverse()
      .flatMap((row) => [...row].map((ch) => Number(ch))),
  });

  const draw = (chart: ColorChart) =>
    Array.from({ length: chart.height }, (_, y) =>
      Array.from({ length: chart.width }, (_, x) =>
        String(getCell(chart, x, chart.height - 1 - y))
      ).join("")
    );

  it("이어진 같은 색을 한 번에 바꾼다", () => {
    const chart = from(["0000", "0110", "0110", "0000"]);
    expect(draw(fillArea(chart, 0, 0, 2))).toEqual([
      "2222",
      "2112",
      "2112",
      "2222",
    ]);
  });

  it("대각선 건너로는 번지지 않는다", () => {
    // 1이 대각선 벽이다. 아래 왼쪽 영역과 위 오른쪽 영역은 대각으로만 닿는다.
    const chart = from(["100", "010", "001"]);
    const filled = fillArea(chart, 0, 0, 2);
    // 아래 왼쪽 영역(세로로도 이어진 칸까지)만 채워지고, 대각선 위쪽은 그대로다
    expect(draw(filled)).toEqual(["100", "210", "221"]);
  });

  it("같은 색으로 채우면 아무 일도 하지 않는다", () => {
    const chart = from(["11", "11"]);
    expect(fillArea(chart, 0, 0, 1)).toBe(chart);
  });

  it("격자 밖을 찍으면 그대로 둔다", () => {
    const chart = from(["11", "11"]);
    expect(fillArea(chart, 5, 5, 0)).toBe(chart);
  });

  it("원본을 바꾸지 않는다", () => {
    const chart = from(["00", "00"]);
    const before = [...chart.cells];
    fillArea(chart, 0, 0, 1);
    expect(chart.cells).toEqual(before);
  });
});
