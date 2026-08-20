import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileWarning,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openPdf } from "@/features/patternDoc/pdfjs";
import { setPatternDocProgress } from "@/features/patternDoc/repository";
import {
  clampPage,
  clampZoom,
  cycleZoom,
  fitScale,
  renderScale,
  ZOOM_STEPS,
} from "@/domain/pdfView";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PatternDoc } from "@/types/entities";

/** 읽던 자리를 쓰기까지 기다리는 시간(ms). 페이지를 훑을 때 매번 쓰지 않는다. */
const SAVE_DELAY = 400;

/**
 * PDF 도안 보기.
 *
 * 이미지 도안(ImageStage)과 같은 자리에 쓰이고 조작도 같게 뒀다 — 확대는
 * 컨테이너를 스크롤 가능한 상태로 두고 내용을 키우는 방식이다. 브라우저의
 * 스크롤·터치 드래그를 그대로 쓸 수 있어서 직접 만든 팬 제스처보다 손에 익다.
 *
 * 다른 점은 **페이지**와 **읽던 자리**다. 40쪽짜리 도안에서 매번 찾아 들어가는
 * 것은 중단의 비용을 그대로 물리는 일이므로, 넘긴 페이지와 확대율을 남긴다.
 */
export function PdfStage({
  doc,
  maxHeight = "70vh",
}: {
  doc: PatternDoc;
  maxHeight?: string;
}) {
  const t = useStrings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 마운트할 때 읽던 자리에서 시작한다. 이후로는 화면의 상태가 진실이고
  // DB는 사본이다(차트 편집기와 같은 구조).
  const [page, setPage] = useState(() =>
    clampPage(doc.lastPage ?? 1, doc.pageCount)
  );
  const [zoom, setZoom] = useState(() =>
    clampZoom(doc.lastZoom ?? ZOOM_STEPS[0])
  );
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const [size, setSize] = useState<{ css: [number, number] }>();

  const pageCount = pdf?.numPages ?? doc.pageCount;

  /* 자리 폭 — 폭 맞춤 배율의 기준이다 */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // 붙는 즉시 한 번 재고, 관찰은 이후 변화만 맡는다.
    //
    // 관찰만 걸어두면 첫 콜백이 오기 전까지 폭이 0이고, 그러면 도안이 그려지지
    // 않는다. 대개는 다음 프레임에 오지만 **오지 않는 환경이 있다** — 가려진
    // 탭이나 백그라운드 렌더에서 ResizeObserver 콜백이 미뤄지면 도안이 계속
    // 빈 화면으로 남는다. 첫 값을 관찰 콜백에 맡기지 않으면 그 경우가 사라진다.
    const timer = setTimeout(() => setWidth(el.clientWidth), 0);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  /* 문서 열기 */
  useEffect(() => {
    const source = doc.blob;
    if (!source) return;
    let cancelled = false;
    let opened: PDFDocumentProxy | undefined;

    void (async () => {
      try {
        const buffer = await source.arrayBuffer();
        if (cancelled) return;
        const loaded = await openPdf(buffer);
        opened = loaded;
        if (cancelled) {
          void loaded.destroy();
          return;
        }
        setPdf(loaded);
      } catch {
        // 암호가 걸렸거나 깨진 파일. 뷰어가 빈 화면으로 남으면 앱이 고장난
        // 것처럼 보이므로 상태로 남겨 화면에 알린다.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      void opened?.destroy();
    };
  }, [doc.blob]);

  /* 페이지 그리기 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdf || !canvas || width <= 0) return;
    let cancelled = false;
    let task: { cancel: () => void } | undefined;

    void (async () => {
      try {
        const target = clampPage(page, pdf.numPages);
        const loaded = await pdf.getPage(target);
        if (cancelled) return;

        const base = loaded.getViewport({ scale: 1 });
        const fit = fitScale(base.width, width);
        const scale = renderScale({
          fit,
          zoom,
          dpr: window.devicePixelRatio || 1,
          pageWidth: base.width,
          pageHeight: base.height,
        });
        const viewport = loaded.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        // 캔버스 넓이 상한에 걸려 배율이 깎여도 화면 크기는 원하는 대로 둔다 —
        // 흐릿하게 보이는 것이 작게 보이는 것보다 낫다.
        setSize({ css: [base.width * fit * zoom, base.height * fit * zoom] });

        const render = loaded.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        task = render;
        await render.promise;
      } catch (cause) {
        // 페이지를 넘기면 앞선 렌더가 취소되는데, 그건 오류가 아니다. 나머지는
        // 진짜 실패이므로 화면에 알린다 — 둘을 함께 삼키면 도안이 안 보이는
        // 이유를 알 길이 없다.
        if (
          !cancelled &&
          (cause as { name?: string })?.name !== "RenderingCancelledException"
        ) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, page, zoom, width]);

  /* 읽던 자리 남기기 */
  useEffect(() => {
    const timer = setTimeout(
      () => void setPatternDocProgress(doc.id, { page, zoom }),
      SAVE_DELAY
    );
    return () => clearTimeout(timer);
  }, [doc.id, page, zoom]);

  if (failed || !doc.blob) {
    return (
      <div className="text-text-2 text-caption flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center">
        <FileWarning size={20} className="text-text-3" aria-hidden />
        {t.patternDoc.failed}
      </div>
    );
  }

  const turn = (delta: number) =>
    setPage((current) => clampPage(current + delta, pageCount));

  return (
    <div className="relative h-full">
      <div
        ref={wrapRef}
        style={{ maxHeight }}
        className={cn(
          // 가운데 정렬을 justify-center로 하면 안 된다. 내용이 자리보다 넓을 때
          // 넘친 부분이 시작 쪽으로 밀려나 스크롤로 닿지 않는다 — 확대해도
          // 도안 왼쪽을 볼 수 없게 된다. 자식의 auto 마진은 넘칠 때 0으로
          // 풀리므로 좁을 때만 가운데로 온다.
          "flex h-full min-h-40",
          zoom === ZOOM_STEPS[0] ? "overflow-hidden" : "overflow-auto"
        )}
      >
        <canvas
          ref={canvasRef}
          style={
            size
              ? { width: size.css[0], height: size.css[1], maxWidth: "none" }
              : undefined
          }
          className="m-auto block"
        />
      </div>

      <Button
        icon
        variant="secondary"
        aria-label={t.workbench.zoom}
        className="bg-surface/90 absolute top-2 right-2"
        onClick={() => setZoom(cycleZoom)}
      >
        <Maximize2 size={16} />
      </Button>
      {zoom !== ZOOM_STEPS[0] && (
        <span className="bg-surface/90 text-caption text-text-2 absolute top-3 left-2 rounded-sm px-1.5">
          {zoom}×
        </span>
      )}

      {/* 페이지 넘기기 — 한 장짜리 도안에는 둘 이유가 없다 */}
      {pageCount > 1 && (
        <div className="bg-surface/90 absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md px-1 py-0.5">
          <Button
            icon
            variant="ghost"
            aria-label={t.patternDoc.prevPage}
            disabled={page <= 1}
            onClick={() => turn(-1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-caption text-text-2 min-w-14 text-center tabular-nums">
            {t.patternDoc.pageOf
              .replace("{page}", String(page))
              .replace("{total}", String(pageCount))}
          </span>
          <Button
            icon
            variant="ghost"
            aria-label={t.patternDoc.nextPage}
            disabled={page >= pageCount}
            onClick={() => turn(1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
