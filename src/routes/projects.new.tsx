import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Page } from "@/components/ui/page";
import { ProjectForm } from "@/features/project/components/project-form";
import { createProject } from "@/features/project/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/projects/new")({
  component: NewProject,
});

function NewProject() {
  const t = useStrings();
  const navigate = useNavigate();

  return (
    <Page title={t.project.new}>
      <ProjectForm
        submitLabel={t.action.create}
        onCancel={() => navigate({ to: "/projects" })}
        onSubmit={async (values) => {
          const id = await createProject(values);
          // 만들자마자 상세로 보낸다 — 다음 행동(뜨기 시작)이 거기 있다
          await navigate({
            to: "/projects/$projectId",
            params: { projectId: id },
          });
        }}
      />
    </Page>
  );
}
