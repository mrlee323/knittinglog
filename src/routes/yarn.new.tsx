import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Page } from "@/components/ui/page";
import { YarnForm } from "@/features/yarn/components/yarn-form";
import { createYarn } from "@/features/yarn/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/yarn/new")({ component: NewYarn });

function NewYarn() {
  const t = useStrings();
  const navigate = useNavigate();

  return (
    <Page title={t.yarn.add}>
      <YarnForm
        submitLabel={t.action.create}
        onCancel={() => navigate({ to: "/yarn" })}
        onSubmit={async (values) => {
          const id = await createYarn(values);
          await navigate({ to: "/yarn/$yarnId", params: { yarnId: id } });
        }}
      />
    </Page>
  );
}
