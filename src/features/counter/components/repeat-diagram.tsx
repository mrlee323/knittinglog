import { useStrings } from "@/i18n";

/**
 * 무늬 반복이 무엇인지 보여주는 그림.
 *
 * "무늬 반복 단수"는 글로 설명해도 잘 안 와닿는다. 도안이 "8단 1무늬"라고
 * 적어두는 그 8이라는 걸 알려면, 도안이 세로로 같은 덩어리를 쌓는다는 것을
 * 먼저 봐야 한다.
 *
 * `stitch-count-diagram`과 같은 태도로 그린다 — 사실적인 편물이 아니라 **선화**다.
 * 여기서 가르칠 것은 "천이 어떻게 보이나"가 아니라 "어디서 끊어 세나"이고,
 * 명암이 있으면 그 경계가 오히려 묻힌다.
 *
 * 격자에 무늬를 그리지 않는다. 무늬 모양은 도안마다 다르고, 특정 무늬를
 * 그려두면 "내 도안은 이렇게 안 생겼는데"가 된다. 대신 단을 세는 눈금과
 * 반복 덩어리를 묶는 괄호만 둔다 — 그게 이 값의 뜻이다.
 */
export function RepeatDiagram({
  /** 한 무늬가 몇 단인지 */
  length = 4,
}: {
  length?: number;
}) {
  const t = useStrings();

  /*
    칸 크기를 값에서 거꾸로 잡는다. 고정 크기로 그리면 "8단 1무늬"에서
    16단짜리 그림이 되어 시트를 잡아먹고, 옆 칸과 높이가 어긋난다. 전체
    높이를 정해두고 칸을 나누면 값이 커져도 자리가 그대로다.
  */
  const H_TARGET = 132;
  const COLS = 6;
  /* 가로 칸은 **고정**이다. 칸을 정사각으로 두고 세로만 줄이면 값이 커질수록
     그림이 홀쭉해지는데, 폭에 맞춰 그리므로 홀쭉한 만큼 세로로 늘어난다.
     코 방향은 여기서 가르칠 것이 아니라 "도안 격자"라는 표시일 뿐이라
     고정해도 잃는 것이 없다. */
  const CELL_W = 13;
  const LEFT = 30; // 단 번호 자리
  const RIGHT = 74; // 괄호와 "1무늬" 글자 자리
  const TOP = 6;

  /*
    몇 덩어리를 쌓아 보일지는 무늬 길이가 정한다.

    둘이면 "쌓인다"는 게 보이지만, 20단짜리 무늬를 둘 쌓으면 40단이 되어
    그림이 시트보다 길어진다. 칸을 더 줄이면 격자가 뭉개진다. 무늬가 긴
    도안을 쓰는 사람은 반복이 뭔지 이미 알 가능성이 높으니, 그때는 한
    덩어리만 그리고 괄호와 단 번호로 뜻을 전한다.
  */
  const repeats = length * 2 <= 16 ? 2 : 1;
  const rows = length * repeats;
  const CELL = Math.min(13, Math.max(5, H_TARGET / rows));
  const gridW = COLS * CELL_W;
  const gridH = rows * CELL;

  return (
    <svg
      viewBox={`0 0 ${LEFT + gridW + RIGHT} ${TOP * 2 + gridH}`}
      className="h-auto w-full max-w-[16rem]"
      role="img"
      aria-label={t.counter.repeatDiagramAlt}
    >
      <g
        stroke="var(--color-line-strong)"
        strokeWidth="1"
        fill="none"
        shapeRendering="crispEdges"
      >
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={LEFT}
            y1={TOP + i * CELL}
            x2={LEFT + gridW}
            y2={TOP + i * CELL}
          />
        ))}
        {Array.from({ length: COLS + 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={LEFT + i * CELL_W}
            y1={TOP}
            x2={LEFT + i * CELL_W}
            y2={TOP + gridH}
          />
        ))}
      </g>

      {/* 반복 덩어리 — 한 무늬마다 색을 번갈아 옅게 깐다. 경계가 어디인지
          괄호만으로는 세로로 긴 그림에서 잘 안 보인다. */}
      {Array.from({ length: repeats }, (_, r) => (
        <rect
          key={`band${r}`}
          x={LEFT}
          y={TOP + r * length * CELL}
          width={gridW}
          height={length * CELL}
          fill={r % 2 === 0 ? "var(--color-accent)" : "transparent"}
          opacity={r % 2 === 0 ? 0.12 : 0}
        />
      ))}

      {/* 단 번호. 뜨개는 아래에서 위로 올라가므로 1단이 맨 아래다. */}
      {Array.from({ length: rows }, (_, i) => {
        const rowNo = i + 1;
        const isBoundary = rowNo % length === 0 || rowNo === 1;
        if (!isBoundary) return null;
        return (
          <text
            key={`n${i}`}
            x={LEFT - 6}
            y={TOP + gridH - i * CELL - CELL / 2 + 3.5}
            textAnchor="end"
            fontSize={Math.max(7, Math.min(9, CELL * 0.7))}
            fill="var(--color-text-3)"
          >
            {rowNo}
          </text>
        );
      })}

      {/* 맨 아래 한 덩어리를 괄호로 묶어 "이만큼이 1무늬"라고 말한다 */}
      <g stroke="var(--color-accent)" strokeWidth="1.5" fill="none">
        <path
          d={`M ${LEFT + gridW + 6} ${TOP + gridH} h 5 v ${-length * CELL} h -5`}
        />
      </g>
      <text
        x={LEFT + gridW + 16}
        y={TOP + gridH - (length * CELL) / 2 + 3.5}
        fontSize="9.5"
        fill="var(--color-text)"
      >
        {t.counter.repeatDiagramLabel.replace("{n}", String(length))}
      </text>
    </svg>
  );
}
