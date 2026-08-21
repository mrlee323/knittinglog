import { useStrings } from "@/i18n";

/**
 * 무엇을 세는지 보여주는 그림.
 *
 * 게이지 화면이 초보를 막는 자리는 게이지의 **뜻**이 아니라 "코를 세라"는
 * 말이다. 메리야스 겉면에서 한 코는 아래에서 두 가닥이 모이고 위로 벌어지는
 * V자인데, 그걸 글로 설명하면 읽고도 편물을 못 알아본다.
 *
 * 사실적인 스프라이트(`stitch-sprite.ts`)를 쓰지 않는다. 그건 "내 천이 어떻게
 * 보일까"에 답하는 그림이고, 여기 필요한 것은 **무엇을 세는가**다. 가르치는
 * 그림은 선화가 낫다 — 명암이 있으면 세야 할 경계가 오히려 묻힌다.
 *
 * 괄호에 10cm를 적지 않는다. 8코를 그려놓고 10cm라고 적으면 "10cm에 8코"라는
 * 게이지를 주장하는 셈이고, 그건 아주 두꺼운 실의 값이다. 그림은 세는 법만
 * 가르치고 거리는 문장이 말한다.
 */
export function StitchCountDiagram({
  stitches = 8,
  rows = 6,
}: {
  stitches?: number;
  rows?: number;
}) {
  const t = useStrings();

  /* 코는 정사각형이 아니다 — 대개 단이 더 촘촘하다(22코 : 30단). 그 비율을
     지키지 않으면 그림이 실제 편물과 달라 보인다. */
  const W = 24;
  const H = Math.round((W * 22) / 30);

  const LEFT = 52;
  /* 위 괄호와 그 글자가 들어갈 자리. 글자는 기준선 위로 올라가므로
     여유를 두지 않으면 viewBox 밖으로 잘린다. */
  const TOP = 30;
  const BOTTOM = 34;
  const gridW = stitches * W;
  const gridH = rows * H;

  /* 짚어 보일 코 — 가운데에서 살짝 왼쪽. 가장자리를 짚으면 "가장자리는
     빼고 센다"는 규칙과 헷갈린다. */
  const markX = Math.max(0, Math.floor(stitches / 2) - 1);
  const markY = Math.floor(rows / 2);

  /**
   * 코 하나.
   *
   * 두 가지가 중요하다. **코 사이에 골을 남기는 것** — 칸을 꽉 채워 그리면 옆
   * 코와 꼭짓점이 맞닿아 지그재그 선 한 줄로 읽히고, 그러면 "한 코가 어디서
   * 끝나는지"가 안 보여 이 그림의 목적이 사라진다. 그리고 **팔을 살짝 휘게
   * 하는 것** — 직선 V는 도형이고, 실은 휜다.
   */
  const GAP = 3;
  const stitchPath = (c: number, r: number) => {
    const x = LEFT + c * W;
    const y = TOP + r * H;
    const mid = x + W / 2;
    const foot = y + H;
    return [
      `M${x + GAP} ${y}`,
      `Q${x + W * 0.4} ${y + H * 0.6} ${mid} ${foot}`,
      `M${x + W - GAP} ${y}`,
      `Q${x + W * 0.6} ${y + H * 0.6} ${mid} ${foot}`,
    ].join(" ");
  };

  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: stitches }, (_, c) => ({ r, c }))
  ).flat();

  const viewW = LEFT + gridW + 10;
  const viewH = TOP + gridH + BOTTOM;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label={t.swatch.diagramAlt}
      className="h-auto w-full"
    >
      {/* 천 — 옅은 선화 */}
      <g
        className="text-line-strong"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      >
        {cells.map(({ r, c }) => (
          <path key={`${r}-${c}`} d={stitchPath(c, r)} />
        ))}
      </g>

      {/* 짚어 보이는 한 코 */}
      <g
        className="text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      >
        <path d={stitchPath(markX, markY)} />
      </g>

      {/* 그 코를 가리키는 선과 이름 */}
      <g className="text-accent" stroke="currentColor" strokeWidth={1}>
        <line
          x1={LEFT + markX * W + W / 2}
          y1={TOP + markY * H + H + 2}
          x2={LEFT + markX * W + W / 2}
          y2={TOP + gridH + 10}
        />
      </g>
      <text
        x={LEFT + markX * W + W / 2}
        y={TOP + gridH + 22}
        textAnchor="middle"
        fontSize={11}
        className="fill-accent"
      >
        {t.swatch.oneStitch}
      </text>

      {/* 세로 괄호 — 단을 센다 */}
      <g
        className="text-text-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          d={`M${LEFT - 12} ${TOP} h-5 v${gridH} h5`}
          strokeLinejoin="round"
        />
      </g>
      <text
        x={LEFT - 26}
        y={TOP + gridH / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        className="fill-text-2"
        transform={`rotate(-90 ${LEFT - 26} ${TOP + gridH / 2})`}
      >
        {t.swatch.rowCount.replace("{n}", String(rows))}
      </text>

      {/* 가로 괄호 — 코를 센다 */}
      <g
        className="text-text-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path d={`M${LEFT} 24 v-5 h${gridW} v5`} strokeLinejoin="round" />
      </g>
      <text
        x={LEFT + gridW / 2}
        y={14}
        textAnchor="middle"
        fontSize={11}
        className="fill-text-2"
      >
        {t.swatch.stitchCount.replace("{n}", String(stitches))}
      </text>
    </svg>
  );
}
