import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/project/components/status-badge";
import { listProjects } from "@/features/project/repository";
import { pausedLabel } from "@/features/project/format";
import { projectColors } from "@/features/yarn/repository";
import { YarnStripe } from "@/features/yarn/components/yarn-swatch";
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

  return (
    <Page
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
            className={cn(
              "text-caption shrink-0 rounded-sm px-2 py-1.5 transition",
              status === value
                ? "bg-accent text-on-accent font-semibold"
                : "bg-sunken text-text-2"
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
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} color={colors?.get(project.id)} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function ProjectCard({ project, color }: { project: Project; color?: string }) {
  const t = useStrings();
  const pausedDays = daysSincePaused(project);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="border-line bg-surface hover:border-line-strong flex gap-3 rounded-md border p-4 transition"
    >
      {/* 이 카드에서 채도를 가진 유일한 요소. 실이 없으면 그리지 않는다. */}
      <YarnStripe color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-subhead font-semibold">{project.name}</h2>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-text-2 text-small mt-0.5">
          {t.craft[project.craft]} · {t.category[project.category]}
        </p>
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
