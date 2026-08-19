import { useRef, useState } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import {
  measureGauge,
  REFERENCES,
  roundGauge,
  toleranceRatio,
  pixelDistance,
  type Point,
} from "@/domain/photoGauge";
import { shrinkImage } from "@/lib/image";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

/** 점을 찍는 대상. 기준은 사진 하나에 한 번만 잡고 두 방향이 함께 쓴다. */
type Target = "ref" | "stitches" | "rows";

interface Pair {
  a?: Point;
  b?: Point;
}

const complete = (pair: Pair): pair is { a: Point; b: Point } =>
  Boolean(pair.a && pair.b);

/** 오차가 이보다 크면 더 넓게 재라고 권한다 */
const ROUGH_RATIO = 0.02;

/**
 * 사진으로 게이지 재기.
 *
 * 자동 인식이 아니다(기획 §13.2). 크기를 아는 물체의 양 끝과 편물에서 센 구간의
 * 양 끝을 탭하면 픽셀↔mm 환산이 결정되고, 코수는 사용자가 이미 세었다.
 *
 * 기준은 한 번만 잡는다. 같은 사진 안에서 가로와 세로가 같은 배율을 쓰므로
 * 두 번 잡게 하면 같은 일을 두 번 시키면서 오차만 늘린다.
 */
export function PhotoMeasure({
  onApply,
}: {
  onApply: (gauge: { stitchesPer10cm: number; rowsPer10cm: number }) => void;
}) {
  const t = useStrings();
  const input = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [src, setSrc] = useState<string>();
  /** 원본 이미지 크기. 좌표를 이 기준으로 저장한다. */
  const [natural, setNatural] = useState<{ w: number; h: number }>();

  const [target, setTarget] = useState<Target>("ref");
  const [ref, setRef] = useState<Pair>({});
  const [stitchSpan, setStitchSpan] = useState<Pair>({});
  const [rowSpan, setRowSpan] = useState<Pair>({});

  const [refKey, setRefKey] = useState("card-long");
  const [customMm, setCustomMm] = useState("");
  const [stitchCount, setStitchCount] = useState("20");
  const [rowCount, setRowCount] = useState("20");

  const refMm =
    refKey === "custom"
      ? Number(customMm) || 0
      : (REFERENCES.find((r) => r.key === refKey)?.mm ?? 0);

  async function handleFile(file: File) {
    // 원본 그대로 그리면 큰 사진에서 탭 좌표 변환이 무거워진다. 저장하지
    // 않는 사진이라 압축본만 화면에 쓴다 — 비율이 같으므로 계산은 그대로다.
    const shrunk = await shrinkImage(file);
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(shrunk.blob));
    setNatural(undefined);
    reset();
  }

  function reset() {
    setRef({});
    setStitchSpan({});
    setRowSpan({});
    setTarget("ref");
  }

  /**
   * 탭 좌표를 원본 이미지 픽셀로 바꾼다.
   *
   * 화면에 축소해 그린 좌표를 그대로 넘기면 기준과 편물이 같은 비율로 줄어
   * 결과는 우연히 맞지만, 확대나 회전이 섞이면 조용히 틀어진다.
   */
  function toImagePoint(event: React.MouseEvent<HTMLElement>): Point | null {
    const el = imgRef.current;
    if (!el || !natural) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * natural.w,
      y: ((event.clientY - rect.top) / rect.height) * natural.h,
    };
  }

  function place(event: React.MouseEvent<HTMLElement>) {
    const point = toImagePoint(event);
    if (!point) return;

    const put = (pair: Pair): Pair =>
      // 둘 다 찍혀 있으면 처음부터 다시 — 잘못 찍었을 때 지우는 버튼을
      // 따로 찾지 않고 그냥 다시 탭하면 된다.
      complete(pair)
        ? { a: point }
        : pair.a
          ? { ...pair, b: point }
          : { a: point };

    if (target === "ref") {
      const next = put(ref);
      setRef(next);
      if (complete(next)) setTarget("stitches");
      return;
    }
    if (target === "stitches") {
      const next = put(stitchSpan);
      setStitchSpan(next);
      if (complete(next)) setTarget("rows");
      return;
    }
    setRowSpan(put(rowSpan));
  }

  const canMeasure = complete(ref) && refMm > 0;

  const measure = (span: Pair, count: string) => {
    if (!canMeasure || !complete(span)) return null;
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      return measureGauge({
        refA: ref.a!,
        refB: ref.b!,
        refMm,
        spanA: span.a,
        spanB: span.b,
        count: n,
      });
    } catch {
      // 두 점이 겹치는 등 잴 수 없는 상태. 화면을 멈추지 않고 결과만 비운다.
      return null;
    }
  };

  const stitches = measure(stitchSpan, stitchCount);
  const rows = measure(rowSpan, rowCount);

  const rough = (span: Pair) =>
    canMeasure &&
    complete(span) &&
    toleranceRatio(
      pixelDistance(ref.a!, ref.b!),
      pixelDistance(span.a, span.b)
    ) > ROUGH_RATIO;

  return (
    <div>
      <p className="text-text-2 text-small mb-3">{t.photoGauge.intro}</p>

      <label className="mb-4 block">
        <input
          ref={input}
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
          {src ? t.photoGauge.retake : t.photoGauge.pick}
        </span>
      </label>

      {src && (
        <>
          {/* 점 찍는 대상. 잘못 찍었으면 칩을 눌러 그 구간만 다시 잡는다. */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {(
              [
                ["ref", t.photoGauge.ref],
                ["stitches", t.photoGauge.measuring],
                ["rows", t.photoGauge.measuringRows],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={target === key}
                onClick={() => setTarget(key)}
                className={cn(
                  "text-caption rounded-sm px-2 py-1.5 transition",
                  target === key
                    ? "bg-accent text-on-accent font-semibold"
                    : "bg-sunken text-text-2"
                )}
              >
                {label}
              </button>
            ))}
            <Button
              variant="ghost"
              className="!text-caption !min-h-9 !px-2"
              onClick={reset}
            >
              <RotateCcw size={14} />
              {t.photoGauge.reset}
            </Button>
          </div>

          <p className="text-text-3 text-caption mb-2">
            {target === "ref" ? t.photoGauge.step1Hint : t.photoGauge.step2Hint}
          </p>

          <div className="border-line relative mb-4 overflow-hidden rounded-md border">
            <img
              ref={imgRef}
              src={src}
              alt=""
              className="block w-full cursor-crosshair select-none"
              draggable={false}
              onLoad={(e) =>
                setNatural({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              onClick={place}
            />
            {/* viewBox를 원본 크기로 두면 원본 좌표를 그대로 그릴 수 있다.
                img와 같은 상자를 덮으므로 배율이 저절로 맞는다. */}
            {natural && (
              <svg
                viewBox={`0 0 ${natural.w} ${natural.h}`}
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <Marks pair={ref} tone="var(--focus)" />
                <Marks pair={stitchSpan} tone="var(--accent)" />
                <Marks pair={rowSpan} tone="var(--status-hibernating)" />
              </svg>
            )}
          </div>

          <SelectField
            label={t.photoGauge.refKind}
            value={refKey}
            onChange={(e) => setRefKey(e.target.value)}
            options={REFERENCES.map((r) => ({
              value: r.key,
              label: t.refObject[r.key as keyof typeof t.refObject],
            }))}
          />

          {refKey === "custom" && (
            <TextField
              label={t.photoGauge.refCustom}
              inputMode="decimal"
              value={customMm}
              onChange={(e) => setCustomMm(e.target.value)}
            />
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <TextField
                label={t.photoGauge.countLabel}
                inputMode="numeric"
                value={stitchCount}
                onChange={(e) => setStitchCount(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <TextField
                label={t.photoGauge.countLabelRows}
                inputMode="numeric"
                value={rowCount}
                onChange={(e) => setRowCount(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <ResultCard
              label={t.photoGauge.measuring}
              result={stitches}
              template={t.photoGauge.result}
              rough={rough(stitchSpan)}
            />
            <ResultCard
              label={t.photoGauge.measuringRows}
              result={rows}
              template={t.photoGauge.resultRows}
              rough={rough(rowSpan)}
            />
          </div>

          <Button
            block
            disabled={!stitches || !rows}
            onClick={() =>
              stitches &&
              rows &&
              onApply({
                stitchesPer10cm: roundGauge(stitches.per10cm),
                rowsPer10cm: roundGauge(rows.per10cm),
              })
            }
          >
            {t.photoGauge.apply}
          </Button>
          {(!stitches || !rows) && (
            <p className="text-text-3 text-caption mt-2 text-center">
              {t.photoGauge.needBoth}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** 찍은 두 점과 그 사이 선 */
function Marks({ pair, tone }: { pair: Pair; tone: string }) {
  return (
    <>
      {complete(pair) && (
        <line
          x1={pair.a.x}
          y1={pair.a.y}
          x2={pair.b.x}
          y2={pair.b.y}
          stroke={tone}
          strokeWidth={6}
          strokeLinecap="round"
        />
      )}
      {[pair.a, pair.b].map(
        (point, i) =>
          point && (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={12}
              fill="none"
              stroke={tone}
              strokeWidth={6}
            />
          )
      )}
    </>
  );
}

function ResultCard({
  label,
  result,
  template,
  rough,
}: {
  label: string;
  result: { per10cm: number; spanMm: number; tolerance: number } | null;
  template: string;
  rough: boolean;
}) {
  const t = useStrings();

  return (
    <div className="border-line bg-surface rounded-md border p-3">
      <p className="text-micro text-text-3">{label}</p>
      {result ? (
        <>
          <p className="text-title font-semibold">
            {template.replace("{n}", String(roundGauge(result.per10cm)))}
          </p>
          <p className="text-text-2 text-small">
            {t.photoGauge.tolerance.replace("{n}", String(result.tolerance))} ·{" "}
            {t.photoGauge.spanIs.replace(
              "{n}",
              String(Math.round(result.spanMm))
            )}
          </p>
          {/* 오차가 크면 알려준다. 숫자가 줄어드는 걸 보여주는 게 설명보다 빠르다. */}
          {rough && (
            <p className="text-hibernating text-caption mt-1">
              {t.photoGauge.tooRough}
            </p>
          )}
        </>
      ) : (
        <p className="text-text-3 text-small">—</p>
      )}
    </div>
  );
}
