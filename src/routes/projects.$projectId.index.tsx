import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Columns, Page } from "@/components/ui/page";
import { PauseSheet } from "@/features/project/components/pause-sheet";
import { StatusBadge } from "@/features/project/components/status-badge";
import { ShareCardButton } from "@/features/card/components/share-card-button";
import { listCounters } from "@/features/counter/repository";
import { getGauge } from "@/features/gauge/repository";
import { yarnsForProject } from "@/features/yarn/repository";
import { aggregateSessions } from "@/domain/stats";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { DerivedFrom } from "@/features/project/components/derived-from";
import { ProgressCard } from "@/features/project/components/progress-card";
import { FillRow, type FillKey } from "@/features/project/components/fill-row";
import { ProjectMenuSheet } from "@/features/project/components/project-menu-sheet";
import { StartGuide } from "@/features/project/components/start-guide";
import { ProjectTabs } from "@/features/project/components/project-tabs";
import {
  applyEvent,
  deleteProject,
  getProject,
  restartProject,
} from "@/features/project/repository";
import { pausedLabel } from "@/features/project/format";
import { CounterSection } from "@/features/counter/components/counter-section";
import { PhotoStrip } from "@/features/photo/components/photo-strip";
import {
  listPatternPhotos,
  listPhotos,
  listReferencePhotos,
} from "@/features/photo/repository";
import { ProjectGauge } from "@/features/gauge/components/project-gauge";
import { NeedleSection } from "@/features/needle/components/needle-section";
import { PieceSection } from "@/features/piece/components/piece-section";
import { AllocationSection } from "@/features/yarn/components/allocation-section";
import { allowedEvents, daysSincePaused } from "@/domain/projectStatus";
import { useLocale, useStrings } from "@/i18n";
import type { ProjectEvent, ProjectEventType } from "@/domain/projectStatus";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectOverview,
});

/** 상태를 앞으로 미는 행동은 주요 버튼, 되돌리는 행동은 보조 버튼 */
const PRIMARY_EVENTS: ProjectEventType[] = ["START", "RESUME", "FINISH"];

/**
 * 프로젝트 개요.
 *
 * 열었을 때 답해야 하는 건 두 가지다 — **어디까지 왔는지**(진행도)와 **무엇으로
 * 뜨는지**(구성). 사진·도안·기록을 여기 다 쌓으면 그 두 답이 스크롤 아래로
 * 밀려난다. 그래서 기록과 자료는 전용 화면으로 보내고 여기서는 입구만 둔다.
 */
function ProjectOverview() {
  const t = useStrings();
  const locale = useLocale();
  const navigate = useNavigate();
  const { projectId } = Route.useParams();

  const project = useLiveQuery(() => getProject(projectId), [projectId]);
  const photos = useLiveQuery(() => listPhotos(projectId), [projectId]);
  const references = useLiveQuery(
    () => listReferencePhotos(projectId),
    [projectId]
  );
  const patterns = useLiveQuery(
    () => listPatternPhotos(projectId),
    [projectId]
  );

  const [pausing, setPausing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /*
    펼쳐 둔 섹션(009).

    빈 섹션은 스스로 사라지고, 여는 열쇠는 이 화면이 갖는다. 각 섹션이
    자기 상태를 들고 있으면 `FillRow`가 어느 것이 이미 열렸는지 알 수 없어
    칩이 사라지지 않는다.

    **한 번 열면 닫지 않는다.** 열자마자 무언가를 넣는 자리이고, 넣고 나면
    그 섹션은 더 이상 비어 있지 않아 어차피 남는다. 닫는 버튼을 두면 비어
    있는 섹션을 접었다 폈다 하는 조작이 생기는데, 그건 009가 없애려던 것이다.
  */
  const [opened, setOpened] = useState<FillKey[]>([]);
  const open = (key: FillKey) =>
    setOpened((v) => (v.includes(key) ? v : [...v, key]));

  if (!project) return null;

  const events = allowedEvents(project.status);
  const pausedDays = daysSincePaused(project);
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);

  // 도안과 참고 이미지는 작업대에서 나란히 놓고 보는 한 묶음이다
  const material = [...(patterns ?? []), ...(references ?? [])];
  // 카드에 넣을 대표 사진 — 목록 카드와 같은 장이어야 한다
  const cover =
    photos?.find((photo) => photo.id === project.coverPhotoId) ?? photos?.[0];

  async function handleEvent(type: ProjectEventType) {
    if (type === "PAUSE") {
      setPausing(true);
      return;
    }
    // PAUSE만 payload가 있고 나머지는 type뿐이라, 위에서 걸러낸 뒤엔 안전하다
    await applyEvent(projectId, { type } as ProjectEvent);
  }

  async function handleRestart() {
    const copyId = await restartProject(projectId);
    await navigate({
      to: "/projects/$projectId",
      params: { projectId: copyId },
    });
  }

  async function handleDelete() {
    await deleteProject(projectId);
    await navigate({ to: "/projects" });
  }

  return (
    <Page
      wide
      title={project.name}
      action={
        <div className="flex items-center gap-2">
          {/* 완성한 작품을 보여주는 것이 카드의 첫 쓸모다. 진행 중에도
              "여기까지 떴다"를 내보낼 수 있게 상태를 가리지 않는다. */}
          <ShareCardButton
            compact
            build={async () => {
              const [sessions, counters, gauge, yarns] = await Promise.all([
                db.counterSessions
                  .where("projectId")
                  .equals(projectId)
                  .toArray(),
                listCounters(projectId),
                project.gaugeId ? getGauge(project.gaugeId) : undefined,
                yarnsForProject(projectId),
              ]);
              const worked = aggregateSessions(sessions);
              // 세션 기록이 없던 시절의 프로젝트도 있으므로 카운터 값으로 받친다
              const rows =
                worked.rows > 0
                  ? worked.rows
                  : counters.reduce((sum, c) => Math.max(sum, c.value), 0);
              const since = project.startedAt ?? project.createdAt;
              const days =
                Math.floor(
                  (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;

              return {
                title: project.name,
                subtitle: [
                  t.status[project.status],
                  t.category[project.category],
                ]
                  .filter(Boolean)
                  .join(" · "),
                image: cover?.blob,
                facts: [
                  { label: t.card.projectRows, value: String(rows) },
                  { label: t.card.projectDays, value: String(days) },
                  ...(gauge
                    ? [
                        {
                          label: t.card.gaugeLabel,
                          // 블로킹 후 값이 있으면 그쪽이다. 남이 옮겨 쓸 값은
                          // 완성품의 게이지이고, 문양 카드도 같은 기준을 쓴다.
                          value: t.gauge.summary
                            .replace(
                              "{sts}",
                              String(
                                gauge.blockedStitchesPer10cm ??
                                  gauge.stitchesPer10cm
                              )
                            )
                            .replace(
                              "{rows}",
                              String(
                                gauge.blockedRowsPer10cm ?? gauge.rowsPer10cm
                              )
                            ),
                        },
                      ]
                    : []),
                  ...(yarns.length > 0
                    ? [
                        {
                          label: t.card.yarnLabel,
                          value: yarns.map((y) => y.name).join(", "),
                        },
                      ]
                    : []),
                ],
                note: project.notes,
                footer: formatDate(since),
              };
            }}
          />
          <StatusBadge status={project.status} />
          {/* 수정·복제·삭제는 본문이 아니라 여기 있다(009). 프로젝트를 여는
              이유가 아니면서 본문 길이를 늘리던 셋이다. */}
          <Button
            icon
            variant="ghost"
            aria-label={t.project.menu}
            data-project-menu-button
            onClick={() => setMenuOpen(true)}
          >
            <MoreHorizontal size={20} />
          </Button>
        </div>
      }
    >
      <Link
        to="/projects"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.nav.projects}
      </Link>

      <ProjectTabs projectId={projectId} />

      <Columns
        main={
          <>
            {/* 순서를 모르는 사람에게 다음 걸음 하나를 말한다. 카운터가
                생기면 스스로 접힌다. */}
            <StartGuide projectId={projectId} onOpen={open} />
            {/* 복귀 브리핑(008). 사진·마지막 작업일·재료를 개요 상단의
                한 카드로 모은다 — 목록 카드와 같은 장을 넘겨서 두 화면이
                서로 다른 사진을 보여주는 일이 없게 한다. */}
            <ProgressCard
              projectId={projectId}
              project={project}
              cover={cover?.blob}
              materialCount={material.length}
            />

            <SectionLink
              title={t.project.recentLog}
              action={t.project.viewAllLog}
              to="/projects/$projectId/log"
              projectId={projectId}
              empty={photos?.length === 0 ? t.photo.empty : undefined}
            >
              {photos && <PhotoStrip photos={photos} limit={4} />}
            </SectionLink>

            <SectionLink
              title={t.project.references}
              action={t.project.viewWorkbench}
              to="/projects/$projectId/refs"
              projectId={projectId}
              empty={material.length === 0 ? t.workbench.empty : undefined}
            >
              <PhotoStrip photos={material} limit={4} />
            </SectionLink>

            {project.derivedFromProjectId && (
              <DerivedFrom sourceId={project.derivedFromProjectId} />
            )}

            {project.notes && (
              <p className="bg-sunken text-small mb-5 rounded-md p-4 whitespace-pre-wrap">
                {project.notes}
              </p>
            )}
          </>
        }
        side={
          <>
            {/* 잠시멈춤 상태의 복귀 단서. 나중에 복귀 브리핑으로 확장된다. */}
            {pausedDays !== null && (
              <div className="border-line bg-sunken mb-5 rounded-md border p-4">
                <p className="text-hibernating text-small font-medium">
                  {pausedLabel(t, pausedDays)}
                  {project.pauseReason &&
                    ` · ${t.pauseReason[project.pauseReason]}`}
                </p>
                {project.pauseNote && (
                  <p className="text-text-2 text-small mt-1.5">
                    {project.pauseNote}
                  </p>
                )}
              </div>
            )}

            <dl className="text-small mb-5 space-y-1.5">
              <div className="flex gap-2">
                <dt className="text-text-2">{t.project.craft}</dt>
                <dd>{t.craft[project.craft]}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-text-2">{t.project.category}</dt>
                <dd>{t.category[project.category]}</dd>
              </div>
              {project.startedAt && (
                <div className="text-text-2">
                  {t.project.startedOn.replace(
                    "{date}",
                    formatDate(project.startedAt)
                  )}
                </div>
              )}
              {project.finishedAt && (
                <div className="text-text-2">
                  {t.project.finishedOn.replace(
                    "{date}",
                    formatDate(project.finishedAt)
                  )}
                </div>
              )}
            </dl>

            <div className="mb-6 flex flex-wrap gap-2">
              {events.map((type) => (
                <Button
                  key={type}
                  variant={
                    PRIMARY_EVENTS.includes(type) ? "primary" : "secondary"
                  }
                  onClick={() => handleEvent(type)}
                >
                  {t.event[type]}
                </Button>
              ))}
            </div>

            {/* 카운터 관리(추가·연동·삭제)와 실 배정은 조작이므로 옆 단에 둔다.
                읽기용 진행도는 본문 위쪽 ProgressCard가 맡는다. */}
            <PieceSection
              projectId={projectId}
              open={opened.includes("piece")}
            />
            <CounterSection
              projectId={projectId}
              open={opened.includes("counter")}
            />
            <ProjectGauge
              projectId={projectId}
              open={opened.includes("gauge")}
            />
            <AllocationSection
              projectId={projectId}
              open={opened.includes("yarn")}
            />
            <NeedleSection
              projectId={projectId}
              open={opened.includes("needle")}
            />

            {/* 채우는 길은 섹션마다 흩어진 `+`가 아니라 여기 하나다(009).
                접힌 섹션 뒤에 두는 이유는, 가진 것을 먼저 읽고 나서 더 담을
                것을 보는 순서이기 때문이다. */}
            <FillRow projectId={projectId} opened={opened} onOpen={open} />
          </>
        }
      />

      {menuOpen && (
        <ProjectMenuSheet
          projectId={projectId}
          onEdit={() => setMenuOpen(false)}
          onRestart={() => {
            setMenuOpen(false);
            void handleRestart();
          }}
          onDelete={() => {
            setMenuOpen(false);
            setConfirmingDelete(true);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {confirmingDelete && (
        <ConfirmSheet
          title={t.project.deleteConfirm}
          description={project.name}
          confirmLabel={t.action.delete}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {pausing && (
        <PauseSheet
          onCancel={() => setPausing(false)}
          onConfirm={async (reason, note) => {
            await applyEvent(projectId, { type: "PAUSE", reason, note });
            setPausing(false);
          }}
        />
      )}
    </Page>
  );
}

/**
 * 개요의 미리보기 묶음.
 *
 * 제목 옆에 목적지를 붙인다. 썸네일만 두면 "여기를 누르면 어디로 가는지"가
 * 드러나지 않고, 비어 있을 때도 들어가는 길은 남아야 한다.
 */
function SectionLink({
  title,
  action,
  to,
  projectId,
  empty,
  children,
}: {
  title: string;
  action: string;
  to: "/projects/$projectId/log" | "/projects/$projectId/refs";
  projectId: string;
  empty?: string;
  children?: React.ReactNode;
}) {
  /*
    비었을 때 점선 상자를 그리지 않는다(009).

    "사진이 없어요" 같은 문장은 사실이지만, 빈 프로젝트에서는 그런 상자가
    넷이었다. 넷이 모이면 화면이 **가진 것이 아니라 없는 것의 목록**이 된다.
    들어가는 길(제목 옆 `전체 보기`)은 그대로 남으므로 잃는 것은 문장뿐이다.
  */
  return (
    <section className={cn(empty ? "mb-4" : "mb-6")}>
      <div
        className={cn(
          "flex items-baseline justify-between gap-3",
          !empty && "mb-2"
        )}
      >
        <h2 className="text-micro text-text-3">{title}</h2>
        <Link
          to={to}
          params={{ projectId }}
          className="text-text-2 text-caption hover:text-text inline-flex items-center gap-0.5"
        >
          {action}
          <ChevronRight size={13} />
        </Link>
      </div>
      {!empty && children}
    </section>
  );
}
