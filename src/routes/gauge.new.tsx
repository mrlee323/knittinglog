import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Page } from "@/components/ui/page";
import { GaugeForm } from "@/features/gauge/components/gauge-form";
import { createGauge } from "@/features/gauge/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/gauge/new")({ component: NewGauge });

function NewGauge() {
  const t = useStrings();
  const navigate = useNavigate();

  return (
    <Page title={t.gauge.add}>
      <GaugeForm
        submitLabel={t.action.create}
        onCancel={() => navigate({ to: "/gauge" })}
        onSubmit={async (values) => {
          await createGauge(values);
          await navigate({ to: "/gauge" });
        }}
      />
    </Page>
  );
}
