import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { counterView } from "@/domain/counter";
import { CoverThumb } from "@/features/photo/components/cover-thumb";
import { YarnDot } from "@/features/yarn/components/yarn-swatch";
import { lastWorkedLabel } from "@/features/project/format";
import { listNeedlesForProject } from "@/features/needle/repository";
import {
  remainingGramsForProject,
  yarnsForProject,
} from "@/features/yarn/repository";
import { LifelineNote } from "@/features/counter/components/lifeline-note";
import { RepeatLine } from "@/features/counter/components/repeat-line";
import { FinishEstimate } from "./finish-estimate";
import { lifelineRows, listCounters } from "@/features/counter/repository";
import { useStrings } from "@/i18n";
import type { Id, Project } from "@/types/entities";

/**
 * 진행도.
 *
 * 프로젝트를 열었을 때 첫 질문은 "어디까지 떴지"다. 카운터 관리(추가·삭제·연동)는
 * 조작이므로 옆 단에 두고, 여기서는 읽기만 한다 — 메인 카운터의 단수, 남은 단수,
 * 마지막 라이프라인, 그리고 뜨기로 들어가는 문.
 *
 * **008에서 복귀 브리핑이 됐다.** 다시 열었을 때 5초 안에 "어디서 이어 뜨면 되는지"
 * 알려면 단수만으로는 모자란다 — **언제 떴는지**와 **무엇으로 뜨고 있었는지**가
 * 같은 카드 안에 있어야 한다. 그게 없으면 실·바늘을 확인하러 아래로 내려갔다가
 * 돌아와야 한다.
 *
 * **사진은 작다.** 008의 방향은 "상단에서 크게"였는데, 재보니 카드 폭 4:3 사진이
 * 13 mini에서 233px이고 `뜨기`까지 남은 예산이 235px이다 — 사진 하나가 예산을
 * 통째로 먹어 완료 기준 1("`뜨기`까지 스크롤 없음")과 정면으로 부딪힌다. 그래서
 * 006의 복귀 카드와 같은 64px 썸네일로 둔다. 여기는 고르는 자리가 아니라 이어
 * 뜨는 자리다(001).
 *
 * 메인 카운터는 연동이 아닌 첫 카운터다. 연동 카운터는 파생값이라 "지금 몇 단"의
 * 답이 될 수 없다.
 */
export function ProgressCard({
  projectId,
  project,
  cover,
  materialCount = 0,
}: {
  projectId: Id;
  /** 브리핑 줄(언제 떴나)에 쓴다. 없으면 그 줄을 그리지 않는다. */
  project?: Project;
  /** 목록 카드와 같은 장. 없으면 자리도 만들지 않는다(`CoverThumb`의 규칙). */
  cover?: Blob;
  /** 도안·참고 자료 수. 0이면 말하지 않는다 — 007의 "없다를 다섯 번" 자리다. */
  materialCount?: number;
}) {
  const t = useStrings();
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const yarns = useLiveQuery(() => yarnsForProject(projectId), [projectId]);
  const needles = useLiveQuery(
    () => listNeedlesForProject(projectId),
    [projectId]
  );
  const yarnLeft = useLiveQuery(
    () => remainingGramsForProject(projectId),
    [projectId]
  );
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

  const when = project ? lastWorkedLabel(t, project) : undefined;

  /*
    재료 줄 — "무엇으로 뜨고 있었나".

    가진 것만 말한다. 실도 바늘도 자료도 없는 프로젝트에서 "없어요"를 세 번
    반복하면 007이 없앤 그 화면이 다시 생긴다. 조각이 하나도 없으면 줄 자체를
    그리지 않는다.

    바늘은 굵기만, 중복은 접는다. 같은 4mm를 두 개 물렸다는 사실은 여기서
    답해야 할 질문("무슨 바늘로 뜨고 있었지")이 아니다.
  */
  const needleSizes = [...new Set((needles ?? []).map((n) => n.sizeMm))].sort(
    (a, b) => a - b
  );
  const brief = [
    yarns && yarns.length > 0 ? yarns.map((y) => y.name).join(", ") : undefined,
    needleSizes.length > 0
      ? needleSizes.map((mm) => `${mm}mm`).join(", ")
      : undefined,
    yarnLeft !== null && yarnLeft !== undefined
      ? t.project.briefYarnLeft.replace("{n}", String(yarnLeft))
      : undefined,
    materialCount > 0
      ? t.project.briefRefs.replace("{n}", String(materialCount))
      : undefined,
  ].filter((part): part is string => Boolean(part));

  return (
    <section
      // 008의 관문이 잡는 손잡이다. 없어지면 관문이 조용히 통과하는 게 아니라
      // 환경 문제(2)로 멈춘다 — 관문이 있는데 안 무는 실패를 막는다.
      data-briefing
      className="border-line bg-surface mb-6 rounded-md border p-5"
    >
      {/* 사진은 숫자 **옆**이다. 64px 썸네일은 그 옆의 단수 덩어리(라벨 +
          큰 숫자 + 마지막 작업일)보다 낮아서 카드 높이를 한 픽셀도 늘리지
          않는다 — 상단에서 크게 키우면 `뜨기`가 접힌 화면 밖으로 나간다. */}
      <div className="flex items-start gap-3">
        <CoverThumb blob={cover} />
        <div className="flex min-w-0 flex-1 items-end justify-between gap-3">
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
            {/* "언제 떴지"는 "어디까지 떴지" 바로 다음 질문이다. 홈 복귀
                카드와 같은 문구를 같은 자리에서 가져온다(format.ts). */}
            {when && <p className="text-text-3 text-caption">{when}</p>}
          </div>
          {view.remaining !== undefined && (
            /* 남은 단수는 **본문보다 크다**(010). 이 카드에서 큰 숫자 다음으로
               많이 읽히는 값인데 13px이라 옆의 34px에 눌려 보조 설명처럼
               읽혔다 — "얼마나 남았나"는 보조가 아니다. */
            <p className="text-text-2 text-subhead shrink-0">
              {t.counter.remaining.replace("{n}", String(view.remaining))}
            </p>
          )}
        </div>
      </div>

      {view.progress !== undefined && (
        <div className="bg-sunken mt-3 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-accent h-full rounded-full"
            style={{ width: `${view.progress * 100}%` }}
          />
        </div>
      )}

      {/* 반복을 넣어두고도 이 화면에는 흔적이 없었다. 값을 넣은 사람이
          그게 어디서 쓰이는지 볼 데가 없으면, 넣을 이유도 알 수 없다. */}
      {view.repeat && <RepeatLine repeat={view.repeat} className="mt-2" />}

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

      {/* 실·바늘·자료를 확인하러 아래로 내려갔다 돌아오는 길을 없앤다.
          각 섹션은 조작하는 자리로 남고, 여기서는 읽기만 한다. */}
      {brief.length > 0 && (
        <div
          data-brief-line
          className="text-text-2 text-caption mt-3 flex items-center gap-1.5"
        >
          <YarnDot color={yarns?.[0]?.colorHex} />
          <p className="truncate">{brief.join(" · ")}</p>
        </div>
      )}

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
