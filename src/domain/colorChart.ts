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

import { contrastRatio } from "./color";

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

/* --- 단·코 삽입 · 삭제 ---------------------------------------------------- */

/**
 * `y` 자리에 빈 단 하나를 끼워넣는다. 원래 그 자리의 단은 위로 올라간다.
 *
 * `resizeChart`와 별도 함수인 이유는 하는 일이 다르기 때문이다. 크기 변경은
 * 끝에서 자라고, 이건 **중간에 끼워넣는다** — 무늬를 그려놓고 "여기 한 단이
 * 더 필요하다"는 것은 실제 작업이고, 끝에서만 자라면 그 위를 전부 다시 그려야
 * 한다.
 *
 * `y === height`면 맨 위에 붙인다. 범위를 넘으면 그대로 둔다.
 */
export function insertRow(chart: ColorChart, y: number): ColorChart {
  if (y < 0 || y > chart.height) return chart;
  const at = y * chart.width;
  return {
    ...chart,
    height: chart.height + 1,
    cells: [
      ...chart.cells.slice(0, at),
      ...new Array(chart.width).fill(0),
      ...chart.cells.slice(at),
    ],
  };
}

/** `y` 단을 뺀다. 마지막 한 단은 뺄 수 없다 — 빈 차트는 차트가 아니다. */
export function removeRow(chart: ColorChart, y: number): ColorChart {
  if (chart.height <= 1 || y < 0 || y >= chart.height) return chart;
  return {
    ...chart,
    height: chart.height - 1,
    cells: [
      ...chart.cells.slice(0, y * chart.width),
      ...chart.cells.slice((y + 1) * chart.width),
    ],
  };
}

/**
 * `x` 자리에 빈 코 하나를 끼워넣는다. 원래 그 자리의 코는 왼쪽으로 밀린다.
 *
 * `x === width`면 맨 오른쪽(1번 코 자리)에 붙인다.
 */
export function insertColumn(chart: ColorChart, x: number): ColorChart {
  if (x < 0 || x > chart.width) return chart;
  const width = chart.width + 1;
  const cells = new Array(width * chart.height).fill(0);
  for (let y = 0; y < chart.height; y += 1) {
    for (let sx = 0; sx < chart.width; sx += 1) {
      cells[y * width + (sx < x ? sx : sx + 1)] =
        chart.cells[y * chart.width + sx];
    }
  }
  return { ...chart, width, cells };
}

/** `x` 코를 뺀다. 마지막 한 코는 뺄 수 없다. */
export function removeColumn(chart: ColorChart, x: number): ColorChart {
  if (chart.width <= 1 || x < 0 || x >= chart.width) return chart;
  const width = chart.width - 1;
  const cells: number[] = [];
  for (let y = 0; y < chart.height; y += 1) {
    for (let sx = 0; sx < chart.width; sx += 1) {
      if (sx !== x) cells.push(chart.cells[y * chart.width + sx]);
    }
  }
  return { ...chart, width, cells };
}

/* --- 색 일괄 교체 --------------------------------------------------------- */

/**
 * `from` 색으로 칠한 칸을 전부 `to` 색으로 바꾼다.
 *
 * 스태시 실이 모자랄 때 색을 갈아치우는 작업이다. 팔레트를 고치는 것(그 색의
 * hex를 바꾸는 것)과는 다르다 — 이건 **칸이 가리키는 색을 옮긴다.**
 *
 * 팔레트에서 `from`을 빼지 않는다. 빼면 그 뒤 색들의 인덱스가 하나씩 밀려서
 * 도안 전체가 엉뚱한 색으로 바뀐다. 비워진 색은 색별 코수에서 0코로 남는다.
 */
export function remapColor(
  chart: ColorChart,
  from: number,
  to: number
): ColorChart {
  if (from === to) return chart;
  if (to < 0 || to >= chart.palette.length) return chart;
  if (!chart.cells.includes(from)) return chart;
  return { ...chart, cells: chart.cells.map((c) => (c === from ? to : c)) };
}

/* --- 직선 · 사각형 -------------------------------------------------------- */

export interface Point {
  x: number;
  y: number;
}

/**
 * 두 칸을 잇는 격자 위의 직선.
 *
 * 브레젠험이다. 소수 좌표를 반올림하면 기울기가 완만할 때 같은 칸이 두 번
 * 나오거나 한 칸이 비는데, 코는 이산적이라 빈 칸이 눈에 보인다.
 *
 * 칸 목록을 돌려주고 칠하기는 `paintPoints`가 한다. 미리보기(화면)와 실제
 * 칠하기가 같은 목록을 봐야 손을 떼기 전에 본 것과 결과가 같다.
 */
export function linePoints(from: Point, to: Point): Point[] {
  let x = Math.round(from.x);
  let y = Math.round(from.y);
  const endX = Math.round(to.x);
  const endY = Math.round(to.y);
  const dx = Math.abs(endX - x);
  const dy = Math.abs(endY - y);
  const stepX = x < endX ? 1 : -1;
  const stepY = y < endY ? 1 : -1;
  let error = dx - dy;
  const points: Point[] = [];

  for (;;) {
    points.push({ x, y });
    if (x === endX && y === endY) break;
    const doubled = error * 2;
    if (doubled > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      y += stepY;
    }
  }
  return points;
}

/**
 * 두 칸을 대각으로 하는 사각형의 **테두리**.
 *
 * 속을 채우지 않는다. 배색에서 사각형은 대개 테두리(가장자리 줄무늬, 액자
 * 무늬)이고, 속이 필요하면 테두리를 두른 뒤 채우기를 한 번 하면 된다 —
 * 테두리가 영역을 감싸므로 채우기가 정확히 그 안에서 멈춘다.
 */
export function rectPoints(from: Point, to: Point): Point[] {
  const x0 = Math.min(from.x, to.x);
  const x1 = Math.max(from.x, to.x);
  const y0 = Math.min(from.y, to.y);
  const y1 = Math.max(from.y, to.y);
  const points: Point[] = [];

  for (let x = x0; x <= x1; x += 1) {
    points.push({ x, y: y0 });
    if (y1 !== y0) points.push({ x, y: y1 });
  }
  for (let y = y0 + 1; y < y1; y += 1) {
    points.push({ x: x0, y });
    if (x1 !== x0) points.push({ x: x1, y });
  }
  return points;
}

/** 칸 목록을 한 색으로 칠한다. 바뀔 것이 없으면 같은 객체를 돌려준다. */
export function paintPoints(
  chart: ColorChart,
  points: Point[],
  color: number
): ColorChart {
  if (color < 0 || color >= chart.palette.length) return chart;
  let cells: number[] | null = null;
  for (const point of points) {
    if (!inside(chart, point.x, point.y)) continue;
    const index = point.y * chart.width + point.x;
    if (chart.cells[index] === color) continue;
    if (!cells) cells = chart.cells.slice();
    cells[index] = color;
  }
  return cells ? { ...chart, cells } : chart;
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

/* --- 대칭 그리기 ---------------------------------------------------------- */

/**
 * 세로축 대칭 좌표.
 *
 * 배색·레이스 무늬는 대부분 좌우 대칭이라, 칠할 때 반대 칸을 함께 칠하면
 * 작업량이 절반이 된다. 전체를 뒤집는 `mirrorChart`와는 다른 기능이다.
 *
 * **폭이 홀수면 가운데 열은 자기 자신이 짝이다.** 식이 그걸 자연히 만족하므로
 * 부르는 쪽에서 홀짝을 따질 필요가 없다 — 같은 칸을 두 번 칠해도 결과는 같다.
 */
export function mirrorCell(chart: ColorChart, x: number): number {
  return chart.width - 1 - x;
}

/* --- 뒷실(부동사) --------------------------------------------------------- */

/**
 * 기준을 넘는 뒷실 구간.
 *
 * `y`·`x`는 구간의 시작 칸(x는 왼쪽 기준), `count`는 연속한 코 수다.
 */
export interface FloatRun {
  y: number;
  x: number;
  count: number;
  color: number;
  /** 원형에서 단의 끝과 시작을 이어 센 구간인지 */
  wraps: boolean;
}

/**
 * 뒷실 기준 기본값(코).
 *
 * 실 굵기와 취향에 따라 다르므로 3~9로 조절할 수 있게 두고, 흔히 쓰는 값을
 * 기본으로 둔다.
 */
export const DEFAULT_FLOAT_LIMIT = 5;

/**
 * 뒷실이 긴 구간을 찾는다.
 *
 * 페어아일에서 같은 색이 여러 코 연속되면 그 뒤로 다른 색 실이 그만큼 길게
 * 지나간다. 그 실이 길면 손가락에 걸리고 편물이 당긴다. **다 뜨고 뒤집어 봐야**
 * 아는 실수라서, 그리는 중에 말해주는 것이 이 함수의 존재 이유다.
 *
 * 기준을 **넘는**(초과) 구간만 모은다 — 기준이 5코면 5코는 괜찮고 6코부터다.
 *
 * **한 색뿐인 단은 세지 않는다.** 그 단은 실을 하나만 들고 뜨므로 뒤로 지나갈
 * 실이 없다. 이걸 빼지 않으면 배경만 있는 단이 전부 경고로 잡혀서, 정작 봐야
 * 할 구간이 묻힌다.
 */
export function longFloats(
  chart: ColorChart,
  options: { threshold?: number; inRound?: boolean } = {}
): FloatRun[] {
  const threshold = options.threshold ?? DEFAULT_FLOAT_LIMIT;
  const inRound = options.inRound ?? false;
  const found: FloatRun[] = [];

  for (let y = 0; y < chart.height; y += 1) {
    // 왼쪽에서 오른쪽으로 센다. 뒷실 길이는 읽는 방향과 무관하고, 좌표를
    // 그대로 쓸 수 있어야 화면에 덮어 그릴 수 있다.
    const runs = rowRuns(chart, y, false);
    // 실을 하나만 들고 뜨는 단
    if (runs.length <= 1) continue;

    let x = 0;
    const placed: FloatRun[] = runs.map((run) => {
      const at = x;
      x += run.count;
      return { y, x: at, count: run.count, color: run.color, wraps: false };
    });

    let row = placed;
    const first = placed[0];
    const last = placed[placed.length - 1];
    // 원형은 단의 끝과 시작이 이어진다. 합치지 않으면 원형 도안에서 가장 긴
    // 뒷실을 놓친다 — 끝 3코 + 시작 4코가 실제로는 7코 하나다.
    // (구간은 색이 번갈아 나오므로 둘뿐일 때는 색이 같을 수 없다.)
    if (inRound && first.color === last.color && placed.length > 2) {
      row = placed.slice(1, -1);
      row.push({
        y,
        x: last.x,
        count: last.count + first.count,
        color: last.color,
        wraps: true,
      });
    }

    for (const run of row) {
      if (run.count > threshold) found.push(run);
    }
  }

  // 좌표 순으로 돌려준다. 원형에서 합친 구간이 단의 끝으로 밀리므로 다시 세운다.
  return found.sort((a, b) => a.y - b.y || a.x - b.x);
}

/* --- 명도 대비 ------------------------------------------------------------ */

/** 명도가 비슷해 무늬가 뭉쳐 보이는 색 조합. `a`·`b`는 팔레트 인덱스. */
export interface ContrastWarning {
  a: number;
  b: number;
  ratio: number;
}

/**
 * 명도비 임계값.
 *
 * 경험값이다. 실제 편물 사진과 비교해 보정해야 한다(docs/CHART-EDITOR.md §8).
 * 글자 가독성 기준(4.5:1)을 쓰면 안 된다 — 배색은 글자가 아니라 면이라 그보다
 * 훨씬 낮은 차이에서도 무늬가 읽힌다.
 */
export const DEFAULT_CONTRAST_RATIO = 1.5;

/**
 * 명도차가 부족한 색 조합.
 *
 * **색이 달라도 명도가 비슷하면 무늬가 사라진다.** 색상(hue) 차이는 보지 않는다 —
 * 빨강과 초록은 색상이 정반대지만 명도가 같으면 편물에서 뭉친다.
 *
 * 팔레트의 모든 조합을 본다. 어느 색이 어디에 인접하는지는 그리는 중에 계속
 * 바뀌므로, 지금 붙어 있지 않다고 안심시키는 건 도움이 되지 않는다.
 *
 * 나쁜 조합이 먼저 오도록 정렬한다.
 */
export function contrastWarnings(
  palette: string[],
  threshold = DEFAULT_CONTRAST_RATIO
): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  for (let a = 0; a < palette.length; a += 1) {
    for (let b = a + 1; b < palette.length; b += 1) {
      const ratio = contrastRatio(palette[a], palette[b]);
      if (ratio < threshold) warnings.push({ a, b, ratio });
    }
  }
  return warnings.sort((x, y) => x.ratio - y.ratio);
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
