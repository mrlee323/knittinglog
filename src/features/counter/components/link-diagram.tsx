import { useStrings } from "@/i18n";

/**
 * 연동이 무엇인지 보여주는 그림.
 *
 * 이 앱에서 가장 설명하기 어려운 기능이다. "다른 카운터를 셀 때 이것도 같이
 * 오르게 해요"라고 적어도, 오르는 게 뭔지 · 왜 필요한지가 안 잡힌다. 실제
 * 쓰임은 "몸판을 세면서 2단마다 1번 늘린 횟수를 따로 알고 싶다"인데, 그건
 * 두 숫자가 **다른 속도로** 움직인다는 뜻이고 그게 그림의 전부다.
 *
 * `repeat-diagram`과 같은 태도다 — 선화로, 가르칠 것만.
 *
 * 단 번호는 아래에서 위로 올라간다. 뜨개가 그 방향이고, 격자를 그리는 다른
 * 그림들도 그렇게 그린다(`repeat-diagram`).
 */
export function LinkDiagram({
  /** 따라갈 카운터가 몇 단 오를 때마다 1 오르는지 */
  ratio = 2,
}: {
  ratio?: number;
}) {
  const t = useStrings();

  /* 눈금이 세 번 오르는 것까지 보이면 규칙이 읽힌다. 두 번이면 우연처럼
     보이고, 네 번이면 길어지기만 한다. */
  const TICKS = 3;
  const rows = ratio * TICKS;

  const CELL = Math.min(18, Math.max(9, 120 / rows));
  const TOP = 16;
  const LEFT_LABEL = 46; // "따라갈 카운터" 쪽 숫자
  const RAIL = 30; // 가로줄 길이
  const RIGHT_LABEL = 46;
  const W = LEFT_LABEL + RAIL + RIGHT_LABEL;
  const H = TOP + rows * CELL + 8;

  const y = (row: number) => TOP + (rows - row) * CELL;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-[13rem]"
      role="img"
      aria-label={t.counter.linkDiagramAlt}
    >
      {/* 머리글 — 어느 쪽이 무엇인지 */}
      <text
        x={LEFT_LABEL - 4}
        y={TOP - 5}
        textAnchor="end"
        fontSize="8"
        fill="var(--color-text-3)"
      >
        {t.counter.linkDiagramFollowed}
      </text>
      <text
        x={LEFT_LABEL + RAIL + 4}
        y={TOP - 5}
        fontSize="8"
        fill="var(--color-accent)"
      >
        {t.counter.linkDiagramThis}
      </text>

      {Array.from({ length: rows }, (_, i) => {
        const row = i + 1;
        const ticks = Math.floor(row / ratio);
        const isTick = row % ratio === 0;

        return (
          <g key={row}>
            {/* 단 하나를 뜻하는 가로줄 */}
            <line
              x1={LEFT_LABEL}
              y1={y(row) + CELL / 2}
              x2={LEFT_LABEL + RAIL}
              y2={y(row) + CELL / 2}
              stroke="var(--color-line-strong)"
              strokeWidth="1"
            />
            <text
              x={LEFT_LABEL - 6}
              y={y(row) + CELL / 2 + 3}
              textAnchor="end"
              fontSize={Math.min(9, CELL * 0.62)}
              fill="var(--color-text-3)"
            >
              {row}
            </text>

            {/* 오른쪽은 눈금이 오르는 단에만 숫자가 생긴다. 빈 자리가 있어야
                "같이 오르지 않는다"가 보인다 — 그게 연동의 뜻이다. */}
            {isTick && (
              <>
                <circle
                  cx={LEFT_LABEL + RAIL}
                  cy={y(row) + CELL / 2}
                  r="2.2"
                  fill="var(--color-accent)"
                />
                <text
                  x={LEFT_LABEL + RAIL + 7}
                  y={y(row) + CELL / 2 + 3}
                  fontSize={Math.min(9, CELL * 0.62)}
                  fill="var(--color-text)"
                >
                  {ticks}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
