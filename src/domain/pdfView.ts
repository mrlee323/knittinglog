/**
 * PDF 도안 보기 계산.
 *
 * 상용 도안은 대개 PDF로 온다. 뜨는 동안 읽는 문서이므로 이미지 도안과 같은
 * 요구가 붙는다 — 확대해서 코 기호와 숫자를 읽을 수 있어야 하고, 멈췄다
 * 돌아왔을 때 읽던 자리가 남아 있어야 한다.
 *
 * 렌더 배율 계산이 이 파일의 핵심이다. 캔버스에는 넓이 상한이 있어서 큰
 * 페이지를 고배율·고해상도로 그리면 **조용히 빈 화면이 된다**(예외가 아니라
 * 빈 캔버스가 나온다). 상한을 계산에 넣어두면 화질이 조금 떨어질 뿐 도안은
 * 계속 보인다.
 */

/**
 * 확대 단계. 1은 "폭 맞춤"이다.
 *
 * 도안 PDF는 대개 A4 세로이고, 폭을 맞추면 한 화면에 한 페이지가 들어온다.
 * 거기서 출발해 코 기호를 읽을 수 있을 때까지 키운다.
 */
export const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;

export type Zoom = number;

/**
 * 캔버스 넓이 상한(픽셀 수).
 *
 * iOS Safari가 16,777,216px에서 캔버스를 포기한다. 넘으면 던지지 않고 빈
 * 캔버스를 주므로, 상한을 넘기면 "도안이 안 보인다"는 증상으로만 드러난다.
 */
export const MAX_CANVAS_PIXELS = 16_777_216;

/** 저장된 페이지를 문서 범위 안으로 넣는다. 1부터 센다. */
export function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page) || pageCount < 1) return 1;
  return Math.min(Math.max(1, Math.floor(page)), Math.floor(pageCount));
}

/** 확대 단계를 한 칸 옮긴다. 양끝에서는 그대로 머문다. */
export function stepZoom(zoom: Zoom, direction: 1 | -1): Zoom {
  const i = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
  // 저장된 값이 단계에 없으면(단계를 나중에 바꿨다) 가장 가까운 칸에서 옮긴다
  const from =
    i >= 0
      ? i
      : ZOOM_STEPS.reduce(
          (best, value, index) =>
            Math.abs(value - zoom) < Math.abs(ZOOM_STEPS[best] - zoom)
              ? index
              : best,
          0
        );
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, from + direction))];
}

/**
 * 버튼 한 개로 확대를 돌린다. 끝에 닿으면 폭 맞춤으로 돌아온다.
 *
 * 이미지 도안 버튼과 같은 동작이다 — 확대·축소 버튼을 둘로 나누면 좁은 화면에서
 * 도안 위에 얹을 자리가 없다.
 */
export function cycleZoom(zoom: Zoom): Zoom {
  const next = stepZoom(clampZoom(zoom), 1);
  return next === clampZoom(zoom) ? ZOOM_STEPS[0] : next;
}

export const clampZoom = (zoom: Zoom): Zoom =>
  ZOOM_STEPS.includes(zoom as (typeof ZOOM_STEPS)[number])
    ? zoom
    : stepZoom(zoom, 0 as 1);

/**
 * 페이지 폭을 자리 폭에 맞추는 배율.
 *
 * 자리 폭을 아직 모를 때(첫 렌더 전 0)는 1을 준다 — 0으로 그리면 캔버스가
 * 사라지고, 그 뒤 폭이 정해져도 다시 그릴 계기가 없다.
 */
export function fitScale(pageWidth: number, containerWidth: number): number {
  if (pageWidth <= 0 || containerWidth <= 0) return 1;
  return containerWidth / pageWidth;
}

/**
 * 실제로 캔버스에 그릴 배율.
 *
 * 화면 배율(dpr)을 곱해야 글씨가 번지지 않는다. 다만 캔버스 넓이 상한에
 * 걸리면 배율을 낮춘다 — 흐릿한 도안이 안 보이는 도안보다 낫다.
 */
export function renderScale({
  fit,
  zoom,
  dpr,
  pageWidth,
  pageHeight,
  maxPixels = MAX_CANVAS_PIXELS,
}: {
  fit: number;
  zoom: Zoom;
  dpr: number;
  /** 배율 1에서의 페이지 크기 */
  pageWidth: number;
  pageHeight: number;
  maxPixels?: number;
}): number {
  const wanted = fit * zoom * Math.max(1, dpr);
  const area = pageWidth * pageHeight;
  if (area <= 0) return wanted;
  const cap = Math.sqrt(maxPixels / area);
  return Math.min(wanted, cap);
}

/**
 * 이 파일이 PDF인가.
 *
 * MIME 타입만 믿지 않는다 — 안드로이드 파일 선택기가 빈 타입이나
 * `application/octet-stream`을 주는 경우가 있다. 확장자로 한 번 더 본다.
 */
export function isPdf(file: { type?: string; name?: string }): boolean {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name ?? "");
}

/** 여러 장 중 몇 번째인지. 한 장짜리 문서에는 표시할 것이 없다. */
export const pageProgress = (page: number, pageCount: number) =>
  pageCount > 1 ? { page, pageCount } : null;
