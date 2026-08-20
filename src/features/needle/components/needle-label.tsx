import { findNeedle } from "@/domain/units";
import { useStrings } from "@/i18n";
import type { Needle } from "@/types/entities";

/**
 * 바늘 표기.
 *
 * mm이 정규 값이고 호수는 파생이다(domain/units.ts). 그런데 사람은 "4mm"보다
 * "8호"로 기억하는 경우가 많고, 해외 도안은 US 표기를 쓴다. 그래서 mm을 크게,
 * 나머지 체계를 옆에 작게 둔다 — 어느 쪽으로 찾아도 걸리게.
 */
export function NeedleSize({ needle }: { needle: Needle }) {
  const size = findNeedle(needle.sizeMm, needle.craft);
  const aliases = [
    size?.jp,
    size && size.us ? `US ${size.us}` : undefined,
  ].filter(Boolean);

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-subhead font-semibold">{needle.sizeMm}mm</span>
      {aliases.length > 0 && (
        <span className="text-text-3 text-caption">{aliases.join(" · ")}</span>
      )}
    </span>
  );
}

/** "줄 80cm · 대나무" — 굵기 다음에 오는 보조 정보 */
export function NeedleDetail({ needle }: { needle: Needle }) {
  const t = useStrings();
  const parts = [
    t.needle.type[needle.type],
    needle.lengthCm ? `${needle.lengthCm}cm` : undefined,
    needle.material,
  ].filter(Boolean);

  return <span className="text-text-2 text-small">{parts.join(" · ")}</span>;
}
