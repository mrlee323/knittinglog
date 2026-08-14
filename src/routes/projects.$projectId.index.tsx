import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { PauseSheet } from "@/features/project/components/pause-sheet";
import { StatusBadge } from "@/features/project/components/status-badge";
import {
  applyEvent,
  deleteProject,
  getProject,
} from "@/features/project/repository";
import { pausedLabel } from "@/features/project/format";
import { CounterSection } from "@/features/counter/components/counter-section";
import { allowedEvents, daysSincePaused } from "@/domain/projectStatus";
import { useLocale, useStrings } from "@/i18n";
import type { ProjectEvent, ProjectEventType } from "@/domain/projectStatus";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectDetail,
});

/** 상태를 앞으로 미는 행동은 주요 버튼, 되돌리는 행동은 보조 버튼 */
const PRIMARY_EVENTS: ProjectEventType[] = ["START", "RESUME", "FINISH"];

function ProjectDetail() {
  const t = useStrings();
  const locale = useLocale();
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useLiveQuery(() => getProject(projectId), [projectId]);
  const [pausing, setPausing] = useState(false);

  if (!project) return null;

  const events = allowedEvents(project.status);
  const pausedDays = daysSincePaused(project);
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);

  async function handleEvent(type: ProjectEventType) {
    if (type === "PAUSE") {
      setPausing(true);
      return;
    }
    // PAUSE만 payload가 있고 나머지는 type뿐이라, 위에서 걸러낸 뒤엔 안전하다
    await applyEvent(projectId, { type } as ProjectEvent);
  }

  async function handleDelete() {
    if (!window.confirm(t.project.deleteConfirm)) return;
    await deleteProject(projectId);
    await navigate({ to: "/projects" });
  }

  return (
    <Page title={project.name} action={<StatusBadge status={project.status} />}>
      <Link
        to="/projects"
        className="text-text-muted -mt-2 mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft size={16} />
        {t.nav.projects}
      </Link>

      <dl className="mb-5 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="text-text-muted">{t.project.craft}</dt>
          <dd>{t.craft[project.craft]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted">{t.project.category}</dt>
          <dd>{t.category[project.category]}</dd>
        </div>
        {project.startedAt && (
          <div className="text-text-muted">
            {t.project.startedOn.replace(
              "{date}",
              formatDate(project.startedAt)
            )}
          </div>
        )}
        {project.finishedAt && (
          <div className="text-text-muted">
            {t.project.finishedOn.replace(
              "{date}",
              formatDate(project.finishedAt)
            )}
          </div>
        )}
      </dl>

      {/* 잠시멈춤 상태의 복귀 단서. 나중에 복귀 브리핑으로 확장된다. */}
      {pausedDays !== null && (
        <div className="border-hibernating/30 bg-hibernating/8 mb-5 rounded-xl border p-4">
          <p className="text-hibernating text-sm font-medium">
            {pausedLabel(t, pausedDays)}
            {project.pauseReason && ` · ${t.pauseReason[project.pauseReason]}`}
          </p>
          {project.pauseNote && (
            <p className="text-text-muted mt-1.5 text-sm">
              {project.pauseNote}
            </p>
          )}
        </div>
      )}

      {project.notes && (
        <p className="bg-surface-muted mb-5 rounded-xl p-4 text-sm whitespace-pre-wrap">
          {project.notes}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {events.map((type) => (
          <Button
            key={type}
            variant={PRIMARY_EVENTS.includes(type) ? "primary" : "secondary"}
            onClick={() => handleEvent(type)}
          >
            {t.event[type]}
          </Button>
        ))}
      </div>

      <CounterSection projectId={projectId} />

      <div className="border-border flex gap-2 border-t pt-4">
        <Link to="/projects/$projectId/edit" params={{ projectId }}>
          <Button variant="ghost">{t.action.edit}</Button>
        </Link>
        <Button variant="danger" onClick={handleDelete}>
          {t.action.delete}
        </Button>
      </div>

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
