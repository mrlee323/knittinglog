import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { counterView } from "@/domain/counter";
import { LifelineNote } from "@/features/counter/components/lifeline-note";
import { FinishEstimate } from "./finish-estimate";
import { lifelineRows, listCounters } from "@/features/counter/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 진행도.
 *
 * 프로젝트를 열었을 때 첫 질문은 "어디까지 떴지"다. 카운터 관리(추가·삭제·연동)는
 * 조작이므로 옆 단에 두고, 여기서는 읽기만 한다 — 메인 카운터의 단수, 남은 단수,
 * 마지막 라이프라인, 그리고 뜨기로 들어가는 문.
 *
 * 메인 카운터는 연동이 아닌 첫 카운터다. 연동 카운터는 파생값이라 "지금 몇 단"의
 * 답이 될 수 없다.
 */
export function ProgressCard({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const main = counters?.find((c) => !c.linkedCounterId) ?? counters?.[0];
  const lifelines = useLiveQuery(
    () => (main ? lifelineRows(main.id) : Promise.resolve([])),
    [main?.id]
  );

  if (!counters) return null;

  /*
    카운터가 없으면 아무것도 그리지 않는다.

    전에는 여기서 "카운터가 없어요 + 만들기"를 띄웠다. 그런데 카운터가 0개인
    조건은 바로 위 `StartGuide`가 뜨는 조건과 정확히 같아서, 두 카드가 늘 함께
    나와 같은 일을 두 번 시켰다. 게다가 이쪽 버튼이 primary라 안내가 권하는
    단계보다 더 크게 소리쳤다 — 순서가 뒤집힌다.

    그래서 "다음에 뭘 하지"는 안내 하나가 맡고, 이 카드는 셀 것이 생긴 뒤부터
    자기 일(어디까지 떴나)만 한다. 안내는 카운터 섹션으로 데려가는데, 거기서는
    조각을 골라 계획 단수를 목표로 가져올 수 있다 — 여기서 기본 이름으로 바로
    만드는 것보다 쓸모 있는 카운터가 나온다.
  */
  if (!main) return null;

  const view = counterView(main);

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

      {/* 라이프라인은 이 서비스의 시그니처다. 뜨기 화면에만 두면 "여기까지만 풀면
          된다"는 안심이 정작 프로젝트를 다시 열 때 보이지 않는다.

          전에는 여기서 "마지막 라이프라인 100단"까지만 말했다. 그건 사실이고
          안심은 그 뒤(몇 단 풀면 되는지)인데, 읽는 사람이 뺄셈을 해야 했다.
          뜨기 모드와 같은 문장을 쓴다. */}
      <LifelineNote
        value={view.value}
        lifelines={lifelines ?? []}
        className="mt-3"
      />

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
