/**
 * pdf.js 지연 로딩.
 *
 * pdf.js는 본체 약 420KB에 워커 약 1MB다. PDF 도안을 넣지 않는 사람에게
 * 이걸 미리 받게 할 이유가 없으므로 **프리캐시에서 빼고 처음 쓸 때 받는다.**
 * Pretendard 서브셋에 같은 판단을 한 것과 같은 이유다(vite.config.ts).
 *
 * 오프라인은 그래도 성립한다. PDF를 읽으려면 먼저 넣어야 하고, 넣는 순간
 * 페이지 수를 세려고 pdf.js가 로드되면서 캐시에 남는다. 그 뒤로는 비행기
 * 모드에서도 열린다.
 *
 * 워커를 CDN에서 받지 않는다 — 오프라인에서 죽고, CSP에도 걸린다.
 */

import type * as PdfjsModule from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Pdfjs = typeof PdfjsModule;

/** 빌드에 복사해둔 pdf.js 정적 자료 (vite.config.ts의 복사 플러그인) */
const ASSETS = `${import.meta.env.BASE_URL}pdfjs/`;

let loading: Promise<Pdfjs> | undefined;

export function loadPdfjs(): Promise<Pdfjs> {
  // 두 번째 호출부터는 같은 약속을 돌려준다. 페이지를 넘길 때마다 다시
  // 불러오면 워커가 여러 개 뜬다.
  loading ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  })();
  return loading;
}

/**
 * 문서를 연다. 여는 곳이 두 군데(페이지 수 세기·렌더)라 옵션을 한 곳에 모은다.
 *
 * Helvetica·Times처럼 PDF 표준 14폰트는 파일에 내장되지 않는 경우가 많다. 그때
 * pdf.js는 `standardFontDataUrl`에서 폰트 데이터를 받아 쓴다 — 실제로 비내장
 * Helvetica 도안 하나가 FoxitSans.pfb와 LiberationSans-Regular.ttf를 받아갔다.
 * 주지 않으면 시스템 서체로 어림잡아 대체되어 자간·줄바꿈이 원본과 달라진다.
 * 도안에서는 그게 "몇 코"가 몇 번째 줄에 있는지를 바꿀 수 있다.
 *
 * `cMapUrl`은 CJK 인코딩용이다. 한국어 도안에서 폰트가 내장되지 않았을 때
 * 글자가 깨지지 않게 한다. 둘 다 pdf.js가 필요한 파일만 골라 받으므로 실제로
 * 오가는 양은 작다(폰트 하나 ~50KB).
 */
export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({
    data,
    standardFontDataUrl: `${ASSETS}standard_fonts/`,
    cMapUrl: `${ASSETS}cmaps/`,
    cMapPacked: true,
  }).promise;
}
