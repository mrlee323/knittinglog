import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ChartCanvas } from "./chart-canvas";
import { convertImage, type Pixels } from "@/domain/imageToChart";
import { type ColorChart } from "@/domain/colorChart";
import { listYarns } from "@/features/yarn/repository";
import { shrinkImage } from "@/lib/image";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

type Source = "photo" | "stash";

/** 미리보기 칸 크기. 결과를 한눈에 보되 화면을 넘지 않게. */
const PREVIEW_CELL = 8;

/**
 * 사진에서 문양 옮기기.
 *
 * 팔레트 출처가 이 화면의 갈림길이다. 사진에서 뽑으면 원본에 가깝지만 그 색
 * 실이 없을 수 있고, 스태시에서 가져오면 색이 뭉개지지만 바로 뜰 수 있다.
 * 일반 이미지→픽셀아트 도구는 앞쪽만 하는데, 뜨개에서 필요한 건 뒤쪽이다.
 *
 * 픽셀을 꺼내는 일은 여기서 한다. 도메인은 평평한 배열만 받는다.
 */
export function PhotoToChart({
  width,
  height,
  onApply,
}: {
  /** 지금 차트의 칸 수. 기본값으로 쓴다. */
  width: number;
  height: number;
  /**
   * 칸 수까지 함께 넘긴다.
   *
   * 여기서 칸 수를 바꿀 수 있으므로 palette·cells만 넘기면 받는 쪽의
   * width×height와 cells.length가 어긋나 차트가 깨진다.
   */
  onApply: (chart: ColorChart) => void;
}) {
  const t = useStrings();
  const yarns = useLiveQuery(() => listYarns(), []);

  const [pixels, setPixels] = useState<Pixels>();
  const [src, setSrc] = useState<string>();
  const [source, setSource] = useState<Source>("photo");
  const [colorCount, setColorCount] = useState("4");
  const [cols, setCols] = useState(String(width));
  const [rows, setRows] = useState(String(height));

  // 화면 색을 넣어둔 실만 팔레트가 될 수 있다. 색이 없는 실은 칠할 수 없다.
  const stashColors = (yarns ?? [])
    .map((y) => y.colorHex)
    .filter((hex): hex is string => Boolean(hex));

  useEffect(() => {
    // 미리보기용 objectURL을 화면에서 뗄 때 놓아준다
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  async function handleFile(file: File) {
    // 큰 사진을 그대로 훑으면 수백만 픽셀을 읽는다. 칸 평균을 내는 데는
    // 축소본으로 충분하고, 축소가 이미 평균을 한 번 낸 셈이다.
    const shrunk = await shrinkImage(file);
    const bitmap = await createImageBitmap(shrunk.blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    bitmap.close();

    setPixels({ data: image.data, width: image.width, height: image.height });
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(shrunk.blob));
  }

  const w = Math.max(1, Math.min(120, Number(cols) || 1));
  const h = Math.max(1, Math.min(200, Number(rows) || 1));
  const count = Math.max(2, Math.min(12, Number(colorCount) || 2));

  const usingStash = source === "stash" && stashColors.length > 0;

  let result: { palette: string[]; cells: number[] } | null = null;
  if (pixels) {
    try {
      result = convertImage(pixels, w, h, {
        palette: usingStash ? stashColors : undefined,
        colorCount: count,
      });
    } catch {
      // 변환할 수 없는 입력. 화면을 멈추지 않고 미리보기만 비운다.
      result = null;
    }
  }

  const preview: ColorChart | null = result
    ? { width: w, height: h, palette: result.palette, cells: result.cells }
    : null;

  return (
    <div>
      <label className="mb-4 block">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <span className="text-small bg-sunken text-text inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4 font-medium">
          <ImagePlus size={16} />
          {src ? t.photoChart.retake : t.photoChart.pick}
        </span>
      </label>

      {src && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <img
              src={src}
              alt=""
              className="border-line max-h-52 w-full rounded-md border object-contain"
            />
            <div className="border-line bg-surface flex items-center justify-center overflow-auto rounded-md border p-2">
              {preview ? (
                <ChartCanvas
                  chart={preview}
                  cellWidth={PREVIEW_CELL}
                  cellHeight={PREVIEW_CELL}
                  grid={false}
                />
              ) : (
                <p className="text-text-3 text-small">{t.photoChart.preview}</p>
              )}
            </div>
          </div>

          {/* 팔레트 출처 — 이 선택이 결과의 성격을 바꾼다 */}
          <div className="mb-4">
            <span className="text-text-2 text-small mb-1.5 block">
              {t.photoChart.source}
            </span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["photo", t.photoChart.fromPhoto],
                  ["stash", t.photoChart.fromStash],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={source === key}
                  disabled={key === "stash" && stashColors.length === 0}
                  onClick={() => setSource(key)}
                  className={cn(
                    "text-caption rounded-sm px-2 py-1.5 transition disabled:opacity-40",
                    source === key
                      ? "bg-accent text-on-accent font-semibold"
                      : "bg-sunken text-text-2"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-text-3 text-caption">
              {stashColors.length === 0 && source === "stash"
                ? t.photoChart.noStash
                : source === "stash"
                  ? t.photoChart.fromStashHint
                  : t.photoChart.fromPhotoHint}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="w-24">
              <TextField
                label={t.chart.widthLabel}
                inputMode="numeric"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
              />
            </div>
            <div className="w-24">
              <TextField
                label={t.chart.heightLabel}
                inputMode="numeric"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
              />
            </div>
            {/* 스태시 색을 쓸 때는 개수를 우리가 정하지 않는다 */}
            {!usingStash && (
              <div className="w-24">
                <TextField
                  label={t.photoChart.colorCount}
                  inputMode="numeric"
                  value={colorCount}
                  onChange={(e) => setColorCount(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button
            block
            disabled={!result}
            onClick={() =>
              result &&
              onApply({
                width: w,
                height: h,
                palette: result.palette,
                cells: result.cells,
              })
            }
          >
            {t.photoChart.apply}
          </Button>
          <p className="text-text-3 text-caption mt-2 text-center">
            {t.photoChart.willReplace}
          </p>
        </>
      )}
    </div>
  );
}
