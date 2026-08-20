import { useStrings } from "@/i18n";
import type { CurvePlan } from "@/domain/curve";

/**
 * 곡선 모양.
 *
 * 코막음 배분은 숫자로 보면 "4-1-1 · 2-2-3 · 1-2-3"이지만, 그게 진동다운 곡선인지
 * 계단인지는 그려보면 바로 보인다. 좌표는 코와 단이다 — 오른쪽 가장자리에서
 * 코를 덜어내며 위로 올라간다.
 *
 * 코와 단을 1:1로 그린다. 게이지 비율(코는 정사각형이 아니다)을 적용하지 않는
 * 이유는 이 계산이 게이지를 쓰지 않기 때문이다. 여기서 보여줄 것은 실제 완성
 * 모양이 아니라 **배분이 고른지**다.
 */
export function CurveDiagram({ plan }: { plan: CurvePlan }) {
  const t = useStrings();

  const totalRows = plan.rowsUsed + plan.plainRows;
  if (plan.stitchesUsed === 0 || totalRows === 0) return null;

  // 왼쪽에 몸판이 이어진다는 걸 보이려고 여유를 둔다
  const body = Math.max(4, Math.round(plan.stitchesUsed * 0.35));
  const width = plan.stitchesUsed + body;

  // 아래에서 위로: 코를 막고(가로) 그만큼 뜬다(세로)
  const moves: string[] = [];
  plan.steps.forEach((step, index) => {
    for (let i = 0; i < step.times; i += 1) {
      const rows = index === 0 && i === 0 ? 1 : step.rowInterval;
      moves.push(`h${-step.stitches}`, `v${-rows}`);
    }
  });
  if (plan.plainRows > 0) moves.push(`v${-plan.plainRows}`);

  const path = `M${width} ${totalRows} ${moves.join(" ")} H0 V${totalRows} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${totalRows}`}
      role="img"
      aria-label={t.curve.diagram}
      className="border-line bg-surface h-32 w-full rounded-sm border"
      // 왼쪽에 붙인다. 가운데 정렬하면 양옆에 빈 자리가 생겨 편물이 거기서
      // 끝난 것처럼 보인다 — 실제로는 몸판이 왼쪽으로 계속 이어진다.
      preserveAspectRatio="xMinYMax meet"
    >
      {/* 편물은 곡선의 왼쪽이다 */}
      <path d={path} className="text-line-strong" fill="currentColor" />
      <path
        d={path}
        className="text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
