import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { z } from "zod";
import { CardGrid, Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/project/components/status-badge";
import { PauseReasons } from "@/features/project/components/pause-reasons";
import { listProjects } from "@/features/project/repository";
import { pausedLabel } from "@/features/project/format";
import { projectColors } from "@/features/yarn/repository";
import { coverPhotos } from "@/features/photo/repository";
import { CardCover } from "@/features/photo/components/card-cover";
import { YarnDot } from "@/features/yarn/components/yarn-swatch";
import { daysSincePaused } from "@/domain/projectStatus";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/entities";

/**
 * 상태 필터를 URL search param에 둔다.
 * 뒤로가기로 필터가 복원되고, 링크로 공유·북마크할 수 있다.
 * TanStack Router를 고른 이유가 이 타입 안전 search param이다.
 */
const searchSchema = z.object({
  status: z
    .enum(["planning", "active", "hibernating", "finished", "frogged"])
    .optional(),
});

export const Route = createFileRoute("/projects/")({
  component: Projects,
  validateSearch: searchSchema,
});

const FILTERS: (ProjectStatus | undefined)[] = [
  undefined,
  "active",
  "hibernating",
  "planning",
  "finished",
  "frogged",
];

function Projects() {
  const t = useStrings();
  const navigate = useNavigate();
  const { status } = Route.useSearch();

  const projects = useLiveQuery(() => listProjects(status), [status]);
  // 프로젝트마다 실을 따로 조회하면 N+1이 된다. 한 번에 색만 받아온다.
  const colors = useLiveQuery(() => projectColors(), []);
  const covers = useLiveQuery(() => coverPhotos(), []);

  return (
    <Page
      wide
      title={t.nav.projects}
      action={
        <Button
          icon
          aria-label={t.project.new}
          onClick={() => navigate({ to: "/projects/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4">
        {FILTERS.map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            onClick={() =>
              navigate({ to: "/projects", search: { status: value } })
            }
            aria-pressed={status === value}
            // 카드가 사진을 갖게 되면서 이 줄이 화면에서 가장 센 색이 됐다.
            // 강조색은 `StatusBadge`의 "진행중" 하나에만 남긴다 — 지금 손대는
            // 것 하나만 두드러지면 된다(docs/DESIGN.md). 여기서는 무채색으로
            // 고르고, 고른 것만 바탕과 테두리를 갖는다.
            className={cn(
              "text-caption shrink-0 rounded-sm px-2 py-1.5 transition",
              status === value
                ? "bg-sunken text-text ring-line-strong font-semibold ring-1 ring-inset"
                : "text-text-3 hover:text-text-2"
            )}
          >
            {value ? t.status[value] : t.project.all}
          </button>
        ))}
      </div>

      {projects === undefined ? null : projects.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.project.empty}</p>
          <p className="text-text-3 text-small mt-1">{t.project.emptyHint}</p>
        </div>
      ) : (
        <CardGrid columns={3}>
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                color={colors?.get(project.id)}
                cover={covers?.get(project.id)}
              />
            </li>
          ))}
        </CardGrid>
      )}
      {/* 멈춘 작품들을 보고 있을 때가 "나는 왜 멈추나"를 물을 자리다.
          전용 화면을 두면 매일 보지도 않는 통계에 탭 하나를 쓰게 된다. */}
      {status === "hibernating" && <PauseReasons />}
    </Page>
  );
}

function ProjectCard({
  project,
  color,
  cover,
}: {
  project: Project;
  color?: string;
  cover?: Blob;
}) {
  const t = useStrings();
  const pausedDays = daysSincePaused(project);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      // 세로형. 목록은 아직 **고르는 화면**이라 사진이 먼저 읽혀야 한다(001).
      // overflow-hidden이 있어야 사진 위 모서리가 카드 반경에 맞춰 잘린다.
      className="border-line bg-surface hover:border-line-strong block overflow-hidden rounded-md border transition"
    >
      <CardCover blob={cover} color={color} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 이름은 자르지 않는다. 세로형이라 두 줄까지 감길 자리가 있고,
              작품 이름은 고를 때 보는 것이라 뒤가 잘리면 고를 수 없다. */}
          <h2 className="text-subhead min-w-0 font-semibold">{project.name}</h2>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {/* 실 색은 세로선에서 여기로 왔다 — 세로선은 사진 모서리를 자른다. */}
          <YarnDot color={color} />
          <p className="text-text-2 text-small">
            {t.craft[project.craft]} · {t.category[project.category]}
          </p>
        </div>
        {pausedDays !== null && (
          // 방치 기간을 목록에서 바로 보여준다. 가시성 없음이 중단의 원인이었다.
          <p className="text-hibernating text-caption mt-1.5">
            {pausedLabel(t, pausedDays)}
          </p>
        )}
      </div>
    </Link>
  );
}
