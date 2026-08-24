import { lastLifelineBelow, rowsToUnravel } from "@/domain/counter";
import { cn } from "@/lib/utils";
import { useStrings } from "@/i18n";

/**
 * 라이프라인 한 줄.
 *
 * 이 서비스가 가장 앞세우는 문장이다 — "틀려도 처음부터 안 풀어요". 그래서
 * 뜨는 중에도, 프로젝트를 다시 열었을 때도 같은 말을 해야 한다.
 *
 * 전에는 뜨기 모드만 "마지막 라이프라인 100단 · 20단만 풀면 돼요"라고 말하고,
 * 진행도 카드는 "마지막 라이프라인 100단"까지만 말했다. 앞 절반은 사실이고 뒷
 * 절반이 안심인데, 정작 안심이 필요한 자리(두 달 뒤에 다시 열어본 순간)에서
 * 빠져 있었다. **읽는 사람이 120 − 100을 직접 빼야 했다.**
 *
 * 두 곳이 같은 식을 각자 쓰면 한 곳만 고쳐진다. 그래서 조각으로 묶는다.
 */
export function LifelineNote({
  value,
  lifelines,
  className,
}: {
  /** 지금 단수 */
  value: number;
  /** 이 카운터에 찍힌 라이프라인 단수들 */
  lifelines: number[];
  className?: string;
}) {
  const t = useStrings();
  const lifeline = lastLifelineBelow(value, lifelines);

  const text = (() => {
    if (lifeline === null) return t.counter.lifelineNone;

    const rows = rowsToUnravel(value, lifeline);
    /* 라이프라인에 딱 서 있으면 풀 것이 없다. 전에는 "0단만 풀면 돼요"라고
       말했는데, 풀 것이 없다는 말을 "0단 풀어라"로 하면 읽는 사람이
       한 번 더 생각해야 한다. */
    if (rows === 0) return t.counter.lifelineAt;

    return `${t.counter.lifelineLast.replace(
      "{row}",
      String(lifeline)
    )} · ${t.counter.lifelineUnravel.replace("{n}", String(rows))}`;
  })();

  return (
    <p className={cn("text-hibernating text-caption", className)}>{text}</p>
  );
}
