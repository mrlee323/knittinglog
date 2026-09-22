import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  nextStep,
  stepProgress,
  type ActionableStep,
  type ProjectReadiness,
} from "@/domain/projectStart";
import { listPieces } from "@/features/piece/repository";
import { listCounters } from "@/features/counter/repository";
import { listGaugesForProject } from "@/features/gauge/repository";
import {
  listAllocationsForProject,
  listYarns,
} from "@/features/yarn/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 다음 걸음 안내.
 *
 * 새 프로젝트의 상세는 한때 빈 상자 여덟 개였다. 각자 빈 상태 문구를 갖고
 * 있었지만 무엇을 먼저 하는지는 아무도 말하지 않아서, 순서를 모르는 사람은
 * 여기서 멈췄다(디자인 원칙 5).
 *
 * 하나만 말하고, 그 자리로 데려간다. 카운터가 생기면 접는다 — 세기 시작한
 * 뒤의 다음 할 일은 뜨는 것이고 그건 이미 큰 버튼으로 있다.
 *
 * **009부터 이 카드가 상세의 유일한 안내다.** 빈 섹션은 사라지고 들어가는
 * 문만 `FillRow`에 칩으로 남는다 — 칩은 이름과 `+`뿐이라 "무엇을 왜 먼저
 * 하는지"를 말하는 자리는 여전히 여기 하나다.
 */
export function StartGuide({
  projectId,
  onOpen,
}: {
  projectId: Id;
  /**
   * 접힌 섹션을 펼쳐 달라고 화면에 말한다(009).
   *
   * 실·카운터 단계는 이 화면 안의 섹션으로 데려가는데, 009부터 그 섹션은
   * 비어 있으면 아예 없다. 펼치지 않고 스크롤만 하면 **버튼이 아무 일도
   * 하지 않는 것처럼 보인다.**
   */
  onOpen?: (key: "yarn" | "counter") => void;
}) {
  const t = useStrings();

  const allocations = useLiveQuery(
    () => listAllocationsForProject(projectId),
    [projectId]
  );
  const gauges = useLiveQuery(
    () => listGaugesForProject(projectId),
    [projectId]
  );
  const pieces = useLiveQuery(() => listPieces(projectId), [projectId]);
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const yarns = useLiveQuery(() => listYarns(), []);

  if (!allocations || !gauges || !pieces || !counters || !yarns) return null;

  const readiness: ProjectReadiness = {
    hasYarn: allocations.length > 0,
    hasGauge: gauges.length > 0,
    hasPiece: pieces.length > 0,
    hasCounter: counters.length > 0,
  };

  const step = nextStep(readiness);
  // 세기 시작했으면 안내가 할 일은 끝났다
  if (step === "ready") return null;

  const { done, total } = stepProgress(readiness);
  // 배정할 실이 스태시에 없으면 먼저 등록해야 한다 — 다른 행동이다
  const stashEmpty = yarns.length === 0;

  const copy = {
    yarn: {
      what: t.start.yarn,
      why: t.start.yarnWhy,
      action: stashEmpty ? t.start.yarnActionEmpty : t.start.yarnAction,
    },
    swatch: {
      what: t.start.swatch,
      why: t.start.swatchWhy,
      action: t.start.swatchAction,
    },
    piece: {
      what: t.start.piece,
      why: t.start.pieceWhy,
      action: t.start.pieceAction,
    },
    counter: {
      what: t.start.counter,
      why: t.start.counterWhy,
      action: t.start.counterAction,
    },
  }[step];

  /* 배정된 실이 있으면 그 실로 스와치를 뜨러 간다 — 실을 아는데 안내에서
     굵기를 다시 고르게 하면 데려가는 길이 아니다. */
  const firstYarnId = allocations[0]?.yarnId;

  return (
    <section className="border-line bg-sunken mb-6 rounded-md border p-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-micro text-text-3">{t.start.title}</h2>
        <span className="text-text-3 text-caption">
          {t.start.progress
            .replace("{done}", String(done))
            .replace("{total}", String(total))}
        </span>
      </div>

      <p className="text-subhead mb-1 font-semibold">{copy.what}</p>
      <p className="text-text-2 text-small mb-3">{copy.why}</p>

      <StepAction
        step={step}
        projectId={projectId}
        yarnId={firstYarnId}
        onOpen={onOpen}
      >
        {copy.action}
      </StepAction>

      {/* 관문이 아니라는 걸 말한다. 게이지 없이 뜨는 것도 실제로 하는 일이다. */}
      <p className="text-text-3 text-caption mt-3">{t.start.skip}</p>
    </section>
  );
}

/**
 * 단계마다 목적지가 다르다.
 *
 * 실 배정과 카운터 만들기는 이 화면 안의 조작이라 링크가 아니다 — 옆 단(폰에서는
 * 아래)의 그 섹션으로 스크롤해 준다. 나머지는 다른 화면이다.
 */
function StepAction({
  step,
  projectId,
  yarnId,
  onOpen,
  children,
}: {
  step: ActionableStep;
  projectId: Id;
  yarnId?: Id;
  onOpen?: (key: "yarn" | "counter") => void;
  children: React.ReactNode;
}) {
  if (step === "swatch") {
    return (
      <Link to="/gauge/new" search={yarnId ? { yarnId } : {}}>
        <Button variant="secondary">
          {children}
          <ArrowRight size={16} />
        </Button>
      </Link>
    );
  }

  if (step === "piece") {
    return (
      <Link to="/gauge/calc" search={{ projectId }}>
        <Button variant="secondary">
          {children}
          <ArrowRight size={16} />
        </Button>
      </Link>
    );
  }

  /*
    이 화면 안에 있는 것 — 그 섹션으로 데려간다.

    `behavior: "smooth"`를 쓰지 않는다. 부드러운 스크롤이 동작하지 않는 환경이
    있는데(애니메이션이 억제되면 아무 일도 일어나지 않는다) 그러면 버튼이
    고장난 것처럼 보인다. 즉시 이동은 어디서나 동작하고, 여기서 잃는 건
    매끄러움뿐이다.
  */
  const target = step === "yarn" ? "allocation-section" : "counter-section";
  return (
    <Button
      variant="secondary"
      onClick={() => {
        // 009부터 빈 섹션은 화면에 없다. 먼저 펼치고, 그다음에 데려간다.
        onOpen?.(step === "yarn" ? "yarn" : "counter");
        scrollWhenReady(target);
      }}
    >
      {children}
      <ArrowRight size={16} />
    </Button>
  );
}

/**
 * 방금 펼친 섹션은 아직 DOM에 없다. 몇 프레임만 기다렸다가 데려간다.
 *
 * 상태를 바꾼 직후에 `getElementById`를 부르면 항상 null이다. 한 프레임만
 * 기다리는 것으로 충분한 경우가 많지만, 섹션이 제 데이터를 다시 읽는 동안
 * 늦어질 수 있어서 몇 번 더 본다. 끝내 못 찾으면 **조용히 포기한다** —
 * 여기서 화면을 흔드는 것보다 아무 일도 안 하는 편이 낫다.
 */
function scrollWhenReady(id: string, tries = 12) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ block: "center" });
    return;
  }
  if (tries > 0) requestAnimationFrame(() => scrollWhenReady(id, tries - 1));
}
