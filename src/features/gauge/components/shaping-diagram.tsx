import { useStrings } from "@/i18n";
import type { ShapingPlan } from "@/domain/shaping";

/**
 * 증감이 어디에 놓이는지 보여주는 띠.
 *
 * 숫자만 주면 "6코 뜨고 늘림 ×10"이 고르게 퍼진 건지 한쪽에 몰린 건지 알 수
 * 없다. 이 그림의 좌표는 **지금 뜨는 단의 코**다 — 줄임 표시가 2코 너비인 것도
 * 그래서다. 줄임은 실제로 2코를 먹는다.
 */
export function ShapingDiagram({ plan }: { plan: ShapingPlan }) {
  const t = useStrings();

  const positions: number[] = [];
  let cursor = plan.edgeStitches;
  for (const run of plan.runs) {
    for (let i = 0; i < run.times; i += 1) {
      cursor += run.plain;
      positions.push(cursor);
      // 줄임은 두 코를 잡아먹으므로 다음 구간은 그만큼 뒤에서 시작한다
      if (plan.kind === "decrease") cursor += 2;
    }
  }

  const total = cursor + plan.tail + plan.edgeStitches;
  if (total <= 0) return null;

  const markWidth = plan.kind === "decrease" ? 2 : 0.9;

  return (
    <svg
      viewBox={`0 0 ${total} 12`}
      preserveAspectRatio="none"
      role="img"
      aria-label={t.shaping.diagram}
      className="border-line bg-sunken h-8 w-full rounded-sm border"
    >
      {/* 가장자리 — 손대지 않는 코 */}
      {plan.edgeStitches > 0 && (
        <g className="text-line-strong" fill="currentColor">
          <rect x={0} y={0} width={plan.edgeStitches} height={12} />
          <rect
            x={total - plan.edgeStitches}
            y={0}
            width={plan.edgeStitches}
            height={12}
          />
        </g>
      )}

      <g className="text-accent" fill="currentColor">
        {positions.map((x) => (
          <rect key={x} x={x} y={0} width={markWidth} height={12} />
        ))}
      </g>
    </svg>
  );
}
