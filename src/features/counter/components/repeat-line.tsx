import { counterView } from "@/domain/counter";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * 무늬 반복 한 줄.
 *
 * 전에는 "0회 완료 · 4/8단 · 0/20회"였다. 세 토막인데 첫째와 셋째가 **늘 같은
 * 숫자**였고(둘 다 `completed`를 쓴다), 숫자에 이름이 없어 무엇의 수인지 알 수
 * 없었다.
 *
 * 이제 두 가지만 말한다.
 * - 몇 번째 무늬인가 — 목표가 있으면 "무늬 3/20회", 없으면 "무늬 3회 떴어요"
 * - 지금 그 무늬의 몇 단째인가 — "이번 무늬 4/8단"
 *
 * 둘째가 뜨개에서 실제로 쓰는 값이다. 도안이 단마다 다른 것을 시키므로,
 * "지금 무늬의 4단째"를 알아야 무엇을 뜰지 안다.
 */
export function RepeatLine({
  repeat,
  className,
}: {
  repeat: NonNullable<ReturnType<typeof counterView>["repeat"]>;
  className?: string;
}) {
  const t = useStrings();

  const which = repeat.target
    ? t.counter.repeatOf
        .replace("{done}", String(repeat.completed))
        .replace("{target}", String(repeat.target))
    : t.counter.repeatDone.replace("{done}", String(repeat.completed));

  const where = t.counter.repeatProgress
    .replace("{row}", String(repeat.rowInRepeat))
    .replace("{len}", String(repeat.length));

  return (
    <p className={cn("text-text-2 text-small", className)}>
      {which} · {where}
    </p>
  );
}
