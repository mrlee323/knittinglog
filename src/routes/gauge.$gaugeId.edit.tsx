import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Page } from "@/components/ui/page";
import { GaugeForm } from "@/features/gauge/components/gauge-form";
import { getGauge, updateGauge } from "@/features/gauge/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/gauge/$gaugeId/edit")({
  component: EditGauge,
});

function EditGauge() {
  const t = useStrings();
  const navigate = useNavigate();
  const { gaugeId } = Route.useParams();
  const gauge = useLiveQuery(() => getGauge(gaugeId), [gaugeId]);

  const back = () => navigate({ to: "/gauge" });

  if (!gauge) return null;

  return (
    <Page title={t.gauge.edit}>
      <GaugeForm
        submitLabel={t.action.save}
        initial={{
          label: gauge.label,
          pattern: gauge.pattern,
          stitchesPer10cm: gauge.stitchesPer10cm,
          rowsPer10cm: gauge.rowsPer10cm,
          blockedStitchesPer10cm: gauge.blockedStitchesPer10cm,
          blockedRowsPer10cm: gauge.blockedRowsPer10cm,
          needleMm: gauge.needleMm,
          yarnId: gauge.yarnId,
          projectId: gauge.projectId,
        }}
        onCancel={back}
        onSubmit={async (values) => {
          await updateGauge(gaugeId, values);
          await back();
        }}
      />
    </Page>
  );
}
