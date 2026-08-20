/**
 * 색상 차트(픽셀 도안).
 *
 * 페어아일·인타르시아처럼 색으로 무늬를 만드는 도안이다. 심볼 차트(무늬)는
 * 언어 중립 IR(§4)로 다룰 것이고, 색상 차트는 그보다 단순해서 먼저 만든다.
 *
 * **행 순서가 이 파일의 핵심이다.** 뜨개는 아래에서 위로 뜨므로 1단은 차트의
 * 맨 아래다. 그래서 저장은 `y = 0`이 첫 단(아래)이고, 그릴 때 뒤집는다.
 * 일반 픽셀 에디터를 그대로 쓰면 위아래가 뒤집힌 도안이 나오는데, 좌우
 * 비대칭 무늬에서는 완성품이 실제로 뒤집혀 나온다.
 */

export interface ColorChart {
  /** 코수 */
  width: number;
  /** 단수 */
  height: number;
  /** 팔레트. 셀은 이 배열의 인덱스를 가리킨다. */
  palette: string[];
  /** `y * width + x`. y=0이 첫 단(맨 아래), x=0이 왼쪽. */
  cells: number[];
}

export const DEFAULT_PALETTE = ["#f2efe9", "#2b2a28"];

export function createChart(
  width: number,
  height: number,
  palette: string[] = DEFAULT_PALETTE
): ColorChart {
  if (width <= 0 || height <= 0) {
    throw new RangeError("차트 크기는 1 이상이어야 합니다");
  }
  if (palette.length === 0) throw new RangeError("팔레트가 비어 있습니다");
  return {
    width,
    height,
    palette,
    cells: new Array(width * height).fill(0),
  };
}

const inside = (chart: ColorChart, x: number, y: number) =>
  x >= 0 && y >= 0 && x < chart.width && y < chart.height;

export function getCell(chart: ColorChart, x: number, y: number): number {
  return inside(chart, x, y) ? chart.cells[y * chart.width + x] : 0;
}

/** 셀 하나를 칠한다. 원본을 바꾸지 않는다. */
export function setCell(
  chart: ColorChart,
  x: number,
  y: number,
  color: number
): ColorChart {
  if (!inside(chart, x, y)) return chart;
  if (color < 0 || color >= chart.palette.length) return chart;
  const index = y * chart.width + x;
  if (chart.cells[index] === color) return chart;
  const cells = chart.cells.slice();
  cells[index] = color;
  return { ...chart, cells };
}

/**
 * 크기를 바꾼다. 겹치는 부분은 그대로 남긴다.
 *
 * 아래를 기준으로 유지한다 — 위로 늘리는 것이 무늬를 이어 뜨는 자연스러운
 * 방향이고, 아래를 기준으로 두면 이미 뜬 부분의 좌표가 바뀌지 않는다.
 */
export function resizeChart(
  chart: ColorChart,
  width: number,
  height: number
): ColorChart {
  if (width <= 0 || height <= 0) {
    throw new RangeError("차트 크기는 1 이상이어야 합니다");
  }
  const cells = new Array(width * height).fill(0);
  const w = Math.min(width, chart.width);
  const h = Math.min(height, chart.height);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      cells[y * width + x] = chart.cells[y * chart.width + x];
    }
  }
  return { ...chart, width, height, cells };
}

/**
 * 좌우 반전.
 *
 * 왼손잡이용, 그리고 반대쪽 소매를 대칭으로 뜰 때 쓴다(§3.7).
 */
export function mirrorChart(chart: ColorChart): ColorChart {
  const cells = new Array(chart.cells.length);
  for (let y = 0; y < chart.height; y += 1) {
    for (let x = 0; x < chart.width; x += 1) {
      cells[y * chart.width + x] =
        chart.cells[y * chart.width + (chart.width - 1 - x)];
    }
  }
  return { ...chart, cells };
}

/* --- 게이지 비율 ---------------------------------------------------------- */

export interface ChartGauge {
  stitchesPer10cm: number;
  rowsPer10cm: number;
}

/**
 * 셀 하나의 가로:세로 비.
 *
 * **뜨개 코는 정사각형이 아니다.** 메리야스는 대개 폭이 높이보다 넓어서
 * (22코 × 30단이면 4.55mm × 3.33mm) 정사각 격자로 그린 도안은 완성 모양을
 * 실제와 다르게 보여준다 — 기존 차트 앱들이 공통으로 틀리는 지점이고,
 * 우리는 게이지를 이미 알고 있으므로 공짜로 맞출 수 있다.
 */
export function cellAspect(gauge: ChartGauge): number {
  if (gauge.stitchesPer10cm <= 0 || gauge.rowsPer10cm <= 0) {
    throw new RangeError("게이지는 0보다 커야 합니다");
  }
  // 코 폭 = 100/코수, 단 높이 = 100/단수 → 폭/높이 = 단수/코수
  return gauge.rowsPer10cm / gauge.stitchesPer10cm;
}

/** 이 문양을 다 뜨면 실제로 몇 cm가 되는지 */
export function chartSizeCm(chart: ColorChart, gauge: ChartGauge) {
  if (gauge.stitchesPer10cm <= 0 || gauge.rowsPer10cm <= 0) {
    throw new RangeError("게이지는 0보다 커야 합니다");
  }
  return {
    widthCm: (chart.width / gauge.stitchesPer10cm) * 10,
    heightCm: (chart.height / gauge.rowsPer10cm) * 10,
  };
}

/* --- 채우기 --------------------------------------------------------------- */

/**
 * 같은 색이 이어진 영역을 한 번에 바꾼다.
 *
 * 배경색을 갈아치우려면 400칸을 다 칠해야 하는 상황을 없애는 게 목적이다.
 *
 * **네 방향(상하좌우)만 잇는다.** 대각선까지 이으면 배색 무늬에서 대각으로
 * 스친 칸을 타고 의도하지 않은 영역까지 번진다 — 격자무늬에서 한 번 겪으면
 * 다시 쓰지 않게 되는 종류의 동작이다.
 *
 * 반복 경계는 경계가 아니다. 반복은 미리보기의 표시일 뿐이고 데이터는 한 장이다.
 */
export function fillArea(
  chart: ColorChart,
  startX: number,
  startY: number,
  color: number
): ColorChart {
  const target = getCell(chart, startX, startY);
  if (target === color) return chart;
  if (
    startX < 0 ||
    startY < 0 ||
    startX >= chart.width ||
    startY >= chart.height
  ) {
    return chart;
  }

  const cells = [...chart.cells];
  const index = (x: number, y: number) => y * chart.width + x;
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= chart.width || y >= chart.height) continue;
    if (cells[index(x, y)] !== target) continue;

    cells[index(x, y)] = color;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return { ...chart, cells };
}

/* --- 집계 ----------------------------------------------------------------- */

/** 색마다 몇 코가 필요한지. 실을 몇 타래 살지 가늠하는 근거가 된다. */
export function stitchCounts(chart: ColorChart): number[] {
  const counts = new Array(chart.palette.length).fill(0);
  for (const cell of chart.cells) {
    if (cell >= 0 && cell < counts.length) counts[cell] += 1;
  }
  return counts;
}

/* --- 단별 읽기 ------------------------------------------------------------ */

export interface Run {
  color: number;
  count: number;
}

/**
 * 한 단을 "같은 색 몇 코" 묶음으로 압축한다.
 *
 * 차트를 서술형으로 읽는 첫 단계다(§4). 뜨는 사람은 칸을 하나씩 보지 않고
 * "A 5코, B 3코"로 읽는다.
 *
 * `rightToLeft`가 기본인 이유는 겉면 단을 오른쪽에서 왼쪽으로 뜨기 때문이다.
 * 차트는 완성된 천의 모습으로 그려지므로, 읽는 순서는 그리는 순서와 반대다.
 */
export function rowRuns(
  chart: ColorChart,
  y: number,
  rightToLeft = true
): Run[] {
  if (y < 0 || y >= chart.height) return [];

  const row: number[] = [];
  for (let x = 0; x < chart.width; x += 1) row.push(getCell(chart, x, y));
  if (rightToLeft) row.reverse();

  const runs: Run[] = [];
  for (const color of row) {
    const last = runs[runs.length - 1];
    if (last && last.color === color) last.count += 1;
    else runs.push({ color, count: 1 });
  }
  return runs;
}
