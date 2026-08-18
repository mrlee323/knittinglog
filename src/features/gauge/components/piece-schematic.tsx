import { useStrings } from "@/i18n";
import { useUnits } from "@/app/units";

/**
 * 조각 도식.
 *
 * 계산기가 숫자만 돌려주면 사용자는 그 숫자가 맞는지 판단할 근거가 없다.
 * 도안이 늘 선도(schematic)를 싣는 이유가 그것이고, 여기서도 같은 걸 그린다.
 *
 * 격자 한 칸은 10코 × 10단이다. **칸을 정사각형으로 그리지 않는 것이 핵심**
 * 이다. 뜨개 코는 대개 폭보다 높이가 짧아서(메리야스는 대략 2:3) 정사각형
 * 격자로 그린 도안은 완성 모양을 실제와 다르게 보여준다 — 기존 차트 앱들이
 * 공통으로 틀리는 지점이고, 우리는 게이지를 이미 알고 있으므로 공짜로 맞출
 * 수 있다.
 */
export function PieceSchematic({
  widthCm,
  lengthCm,
  stitches,
  rows,
  caption,
}: {
  widthCm: number;
  lengthCm: number;
  stitches: number;
  rows: number;
  /** 두 게이지를 나란히 비교할 때의 이름 */
  caption?: string;
}) {
  const t = useStrings();
  const units = useUnits();

  if (widthCm <= 0 || lengthCm <= 0 || stitches <= 0 || rows <= 0) return null;

  // viewBox 단위를 cm으로 둔다. 그러면 도형의 종횡비가 곧 완성 조각의
  // 종횡비이고, 축척을 따로 관리할 필요가 없다.
  const pad = 0.4;
  const vw = widthCm + pad * 2;
  const vh = lengthCm + pad * 2;

  const label = `${units.formatLength(widthCm, 1)} × ${units.formatLength(
    lengthCm,
    1
  )}`;

  return (
    <figure className="min-w-0">
      <div className="flex items-center gap-2">
        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${label} · ${stitches}/${rows}`}
          // 긴 목도리 같은 조각이 화면을 세로로 다 먹지 않게 높이를 묶는다.
          // meet이라 잘리지 않고 축소되며, 종횡비는 그대로 유지된다.
          className="h-auto max-h-52 w-full"
        >
          <g transform={`translate(${pad} ${pad})`}>
            <GaugeGrid
              widthCm={widthCm}
              lengthCm={lengthCm}
              stitches={stitches}
              rows={rows}
            />
            <rect
              x={0}
              y={0}
              width={widthCm}
              height={lengthCm}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              // 도형이 축소돼도 선은 1px로 유지된다. 단위가 cm이라
              // 이게 없으면 조각 크기에 따라 선 굵기가 널뛴다.
              vectorEffect="non-scaling-stroke"
              className="text-text"
            />
          </g>
        </svg>

        <div className="text-caption text-text-2 flex w-16 shrink-0 flex-col">
          <span className="text-text font-medium">
            {units.formatLength(lengthCm, 1)}
          </span>
          <span>{t.calc.resultRows.replace("{n}", String(rows))}</span>
        </div>
      </div>

      <figcaption className="text-caption text-text-2 mt-1 text-center">
        {caption && <span className="text-text-3 mr-1">{caption}</span>}
        <span className="text-text font-medium">
          {units.formatLength(widthCm, 1)}
        </span>{" "}
        · {t.calc.resultStitches.replace("{n}", String(stitches))}
      </figcaption>
    </figure>
  );
}

/**
 * 10코 × 10단 격자.
 *
 * 코를 한 칸씩 그리지 않는다. 118코짜리 몸판을 코마다 그으면 폰 화면에서
 * 선이 뭉쳐 회색 면이 된다. 도안 차트가 10코마다 굵은 선을 넣는 관습과 같은
 * 이유이며, 코수가 아주 많으면 간격을 20·30코로 넓힌다.
 */
function GaugeGrid({
  widthCm,
  lengthCm,
  stitches,
  rows,
}: {
  widthCm: number;
  lengthCm: number;
  stitches: number;
  rows: number;
}) {
  const stitchStep = gridStep(stitches);
  const rowStep = gridStep(rows);

  const xs: number[] = [];
  for (let s = stitchStep; s < stitches; s += stitchStep) {
    xs.push((s / stitches) * widthCm);
  }
  const ys: number[] = [];
  for (let r = rowStep; r < rows; r += rowStep) {
    ys.push((r / rows) * lengthCm);
  }

  return (
    <g
      className="text-line-strong"
      stroke="currentColor"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
    >
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} y1={0} x2={x} y2={lengthCm} />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} y1={y} x2={widthCm} y2={y} />
      ))}
    </g>
  );
}

/** 격자선이 30줄을 넘지 않게 간격을 10의 배수로 넓힌다 */
const gridStep = (count: number) => 10 * Math.max(1, Math.ceil(count / 300));
