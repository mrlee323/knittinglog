import { describe, expect, it } from "vitest";
import {
  clampPage,
  clampZoom,
  cycleZoom,
  fitScale,
  isPdf,
  MAX_CANVAS_PIXELS,
  pageProgress,
  renderScale,
  stepZoom,
  ZOOM_STEPS,
} from "./pdfView";

describe("페이지", () => {
  it("1부터 센다", () => {
    expect(clampPage(1, 10)).toBe(1);
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-3, 10)).toBe(1);
  });

  it("마지막 페이지를 넘지 않는다", () => {
    expect(clampPage(99, 10)).toBe(10);
  });

  it("저장된 자리가 문서 범위를 벗어나면 되돌린다", () => {
    // 같은 도안을 페이지가 적은 판본으로 바꿔 넣으면 생기는 상황이다.
    // 범위 밖 페이지를 그리려 하면 pdf.js가 던지고 뷰어가 빈 화면이 된다.
    expect(clampPage(12, 4)).toBe(4);
  });

  it("페이지 수가 없으면 1로 본다", () => {
    expect(clampPage(3, 0)).toBe(1);
  });

  it("소수는 버린다", () => {
    expect(clampPage(3.7, 10)).toBe(3);
  });

  it("한 장짜리 문서에는 표시할 진행이 없다", () => {
    expect(pageProgress(1, 1)).toBeNull();
    expect(pageProgress(2, 5)).toEqual({ page: 2, pageCount: 5 });
  });
});

describe("확대", () => {
  it("폭 맞춤에서 시작한다", () => {
    expect(ZOOM_STEPS[0]).toBe(1);
  });

  it("한 칸씩 옮긴다", () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1.5, -1)).toBe(1);
  });

  it("양끝에서는 그대로 머문다 — 되돌아가면 갑자기 축소된다", () => {
    expect(stepZoom(ZOOM_STEPS[0], -1)).toBe(ZOOM_STEPS[0]);
    expect(stepZoom(ZOOM_STEPS[ZOOM_STEPS.length - 1], 1)).toBe(
      ZOOM_STEPS[ZOOM_STEPS.length - 1]
    );
  });

  it("버튼 한 개로 돌린다 — 끝에서는 폭 맞춤으로 돌아온다", () => {
    expect(cycleZoom(1)).toBe(1.5);
    expect(cycleZoom(3)).toBe(4);
    expect(cycleZoom(4)).toBe(1);
  });

  it("저장된 확대율이 단계에 없어도 순환이 멈추지 않는다", () => {
    expect(ZOOM_STEPS).toContain(cycleZoom(1.4));
    expect(ZOOM_STEPS).toContain(cycleZoom(0.1));
    expect(ZOOM_STEPS).toContain(cycleZoom(50));
  });

  it("단계에 없는 값은 가장 가까운 칸으로 본다", () => {
    // 저장된 확대율이 있는데 단계 목록을 나중에 바꾼 경우
    expect(clampZoom(1.4)).toBe(1.5);
    expect(clampZoom(99)).toBe(4);
    expect(clampZoom(0.2)).toBe(1);
  });
});

describe("맞춤 배율", () => {
  it("페이지 폭을 자리 폭에 맞춘다", () => {
    expect(fitScale(600, 300)).toBe(0.5);
    expect(fitScale(300, 600)).toBe(2);
  });

  it("자리 폭을 모를 때는 1을 준다", () => {
    // 0으로 그리면 캔버스가 사라지고, 폭이 정해져도 다시 그릴 계기가 없다
    expect(fitScale(600, 0)).toBe(1);
    expect(fitScale(0, 300)).toBe(1);
  });
});

describe("렌더 배율", () => {
  const a4 = { pageWidth: 595, pageHeight: 842 };

  it("화면 배율을 곱한다 — 곱하지 않으면 글씨가 번진다", () => {
    expect(renderScale({ fit: 1, zoom: 1, dpr: 2, ...a4 })).toBeCloseTo(2);
  });

  it("dpr이 1보다 작게 보고되어도 줄이지 않는다", () => {
    expect(renderScale({ fit: 1, zoom: 1, dpr: 0.5, ...a4 })).toBeCloseTo(1);
  });

  it("확대와 맞춤 배율이 함께 곱해진다", () => {
    expect(renderScale({ fit: 1.5, zoom: 2, dpr: 1, ...a4 })).toBeCloseTo(3);
  });

  it("캔버스 넓이 상한을 넘지 않는다", () => {
    // 넘으면 던지지 않고 빈 캔버스가 나오므로 "도안이 안 보인다"로만 드러난다
    const s = renderScale({ fit: 2, zoom: 4, dpr: 3, ...a4 });
    expect(a4.pageWidth * s * a4.pageHeight * s).toBeLessThanOrEqual(
      MAX_CANVAS_PIXELS + 1
    );
  });

  it("상한 안에서는 원하는 배율을 그대로 쓴다", () => {
    const s = renderScale({ fit: 1, zoom: 1, dpr: 2, ...a4 });
    expect(s).toBeCloseTo(2);
    expect(a4.pageWidth * s * a4.pageHeight * s).toBeLessThan(
      MAX_CANVAS_PIXELS
    );
  });

  it("큰 페이지는 작은 페이지보다 먼저 상한에 걸린다", () => {
    const opts = { fit: 1, zoom: 4, dpr: 3 };
    const small = renderScale({ ...opts, pageWidth: 300, pageHeight: 400 });
    const huge = renderScale({ ...opts, pageWidth: 2000, pageHeight: 3000 });
    expect(huge).toBeLessThan(small);
  });
});

describe("파일 판별", () => {
  it("MIME 타입으로 본다", () => {
    expect(isPdf({ type: "application/pdf", name: "도안" })).toBe(true);
  });

  it("타입이 없으면 확장자로 본다", () => {
    // 안드로이드 파일 선택기가 빈 타입을 주는 경우가 있다
    expect(isPdf({ type: "", name: "sweater.pdf" })).toBe(true);
    expect(isPdf({ type: "application/octet-stream", name: "a.PDF" })).toBe(
      true
    );
  });

  it("PDF가 아니면 거른다", () => {
    expect(isPdf({ type: "image/png", name: "a.png" })).toBe(false);
    expect(isPdf({ type: "", name: "notes.txt" })).toBe(false);
    expect(isPdf({})).toBe(false);
  });
});
