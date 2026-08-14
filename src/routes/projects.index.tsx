import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { z } from "zod";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/project/components/status-badge";
import { listProjects } from "@/features/project/repository";
import { pausedLabel } from "@/features/project/format";
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

  return (
    <Page
      title={t.nav.projects}
      action={
        <Button
          aria-label={t.project.new}
          className="!min-h-10 !px-3"
          onClick={() => navigate({ to: "/projects/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            onClick={() =>
              navigate({ to: "/projects", search: { status: value } })
            }
            aria-pressed={status === value}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm transition",
              status === value
                ? "bg-accent text-accent-fg font-medium"
                : "bg-surface-muted text-text-muted"
            )}
          >
            {value ? t.status[value] : t.project.all}
          </button>
        ))}
      </div>

      {projects === undefined ? null : projects.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="text-text-muted">{t.project.empty}</p>
          <p className="text-text-muted/70 mt-1 text-sm">
            {t.project.emptyHint}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const t = useStrings();
  const pausedDays = daysSincePaused(project);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="border-border bg-surface hover:border-accent block rounded-xl border p-4 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-medium">{project.name}</h2>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-text-muted mt-1 text-sm">
        {t.craft[project.craft]} · {t.category[project.category]}
      </p>
      {pausedDays !== null && (
        // 방치 기간을 목록에서 바로 보여준다. 가시성 없음이 중단의 원인이었다.
        <p className="text-hibernating mt-2 text-xs">
          {pausedLabel(t, pausedDays)}
        </p>
      )}
    </Link>
  );
}
