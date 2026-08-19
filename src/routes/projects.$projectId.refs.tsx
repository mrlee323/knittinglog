import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { Page } from "@/components/ui/page";
import { ProjectTabs } from "@/features/project/components/project-tabs";
import { getProject } from "@/features/project/repository";
import { Workbench } from "@/features/reference/components/workbench";
import { ProjectInspiration } from "@/features/inspiration/components/project-inspiration";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/projects/$projectId/refs")({
  component: ProjectWorkbench,
});

function ProjectWorkbench() {
  const t = useStrings();
  const { projectId } = Route.useParams();
  const project = useLiveQuery(() => getProject(projectId), [projectId]);

  if (!project) return null;

  return (
    <Page wide title={project.name}>
      <Link
        to="/projects"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.nav.projects}
      </Link>

      <ProjectTabs projectId={projectId} />
      <Workbench projectId={projectId} />
      {/* 뜨기 전에 모은 것은 작업대 트레이가 아니라 아래에 따로 둔다 */}
      <ProjectInspiration projectId={projectId} />
    </Page>
  );
}
