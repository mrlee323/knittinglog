import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { counterView, lastLifelineBelow } from "@/domain/counter";
import { FinishEstimate } from "./finish-estimate";
import {
  createCounter,
  lifelineRows,
  listCounters,
} from "@/features/counter/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 진행도.
 *
 * 프로젝트를 열었을 때 첫 질문은 "어디까지 떴지"다. 카운터 관리(추가·삭제·연동)는
 * 조작이므로 옆 단에 두고, 여기서는 읽기만 한다 — 메인 카운터의 단수, 남은 단수,
 * 마지막 생명줄, 그리고 뜨기로 들어가는 문.
 *
 * 메인 카운터는 연동이 아닌 첫 카운터다. 연동 카운터는 파생값이라 "지금 몇 단"의
 * 답이 될 수 없다.
 */
export function ProgressCard({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const [making, setMaking] = useState(false);
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const main = counters?.find((c) => !c.linkedCounterId) ?? counters?.[0];
  const lifelines = useLiveQuery(
    () => (main ? lifelineRows(main.id) : Promise.resolve([])),
    [main?.id]
  );

  if (!counters) return null;

  if (!main) {
    return (
      <section className="border-line mb-6 rounded-md border border-dashed p-5 text-center">
        <p className="text-text-2 text-small">{t.counter.empty}</p>
        <p className="text-text-3 text-caption mt-1">{t.counter.emptyHint}</p>
        {/* 만드는 화면은 옆 단에 있고 폰에서는 페이지 맨 아래다. 여기서
            바로 만들 수 있어야 이 카드가 막다른 길이 아니다. */}
        <Button
          className="mt-3"
          disabled={making}
          onClick={async () => {
            setMaking(true);
            try {
              await createCounter(projectId, { label: t.counter.defaultLabel });
            } finally {
              setMaking(false);
            }
          }}
        >
          {t.counter.createDefault}
        </Button>
      </section>
    );
  }

  const view = counterView(main);
  const lifeline = lastLifelineBelow(view.value, lifelines ?? []);

  return (
    <section className="border-line bg-surface mb-6 rounded-md border p-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text-3 text-micro">{main.label}</p>
          <p className="text-display font-semibold">
            {view.value}
            {view.target !== undefined && (
              <span className="text-text-3 text-heading font-normal">
                {" / "}
                {view.target}
              </span>
            )}
          </p>
        </div>
        {view.remaining !== undefined && (
          <p className="text-text-2 text-small">
            {t.counter.remaining.replace("{n}", String(view.remaining))}
          </p>
        )}
      </div>

      {view.progress !== undefined && (
        <div className="bg-sunken mt-3 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-accent h-full rounded-full"
            style={{ width: `${view.progress * 100}%` }}
          />
        </div>
      )}

      {/* 생명줄은 이 서비스의 시그니처다. 뜨기 화면에만 두면 "여기까지만 풀면
          된다"는 안심이 정작 프로젝트를 다시 열 때 보이지 않는다. */}
      <p className="text-text-2 text-small mt-3">
        {lifeline === null
          ? t.counter.lifelineNone
          : t.counter.lifelineLast.replace("{row}", String(lifeline))}
      </p>

      {/* 완성 예상은 진행도의 일부다 — "어디까지 왔나" 다음 질문이 "언제
          끝나나"이고, 마감이 있는 사람에게는 그게 계획의 근거가 된다. */}
      <FinishEstimate projectId={projectId} remainingRows={view.remaining} />

      <Link
        to="/projects/$projectId/knit"
        params={{ projectId }}
        className="mt-4 block"
      >
        <Button block>{t.counter.knit}</Button>
      </Link>
    </section>
  );
}
