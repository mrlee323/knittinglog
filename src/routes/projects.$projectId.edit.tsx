import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Page } from "@/components/ui/page";
import { ProjectForm } from "@/features/project/components/project-form";
import { getProject, updateProject } from "@/features/project/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/projects/$projectId/edit")({
  component: EditProject,
});

function EditProject() {
  const t = useStrings();
  const navigate = useNavigate();
  const { projectId } = Route.useParams();
  const project = useLiveQuery(() => getProject(projectId), [projectId]);

  const back = () =>
    navigate({ to: "/projects/$projectId", params: { projectId } });

  if (!project) return null;

  return (
    <Page title={t.project.edit}>
      <ProjectForm
        submitLabel={t.action.save}
        initial={{
          name: project.name,
          craft: project.craft,
          category: project.category,
          notes: project.notes ?? "",
        }}
        onCancel={back}
        onSubmit={async (values) => {
          await updateProject(projectId, values);
          await back();
        }}
      />
    </Page>
  );
}
