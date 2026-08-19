import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Page } from "@/components/ui/page";
import { ShareCardButton } from "@/features/card/components/share-card-button";
import { GaugeForm } from "@/features/gauge/components/gauge-form";
import { getGauge, updateGauge } from "@/features/gauge/repository";
import { findNeedle } from "@/domain/units";
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

  const summary = (sts: number, rows: number) =>
    t.gauge.summary.replace("{sts}", String(sts)).replace("{rows}", String(rows));
  const needle = gauge.needleMm ? findNeedle(gauge.needleMm) : null;

  return (
    <Page
      title={t.gauge.edit}
      action={
        // 게이지는 남이 자기 작업에 그대로 옮겨 쓸 수 있는 값이다 — 카드로
        // 내보내기에 가장 잘 맞는 것이 이것이다.
        <ShareCardButton
          build={() => ({
            title:
              gauge.label ??
              summary(gauge.stitchesPer10cm, gauge.rowsPer10cm),
            subtitle: gauge.pattern,
            image: gauge.photoBlob,
            facts: [
              {
                label: t.card.gaugeLabel,
                value: summary(gauge.stitchesPer10cm, gauge.rowsPer10cm),
              },
              ...(gauge.blockedStitchesPer10cm && gauge.blockedRowsPer10cm
                ? [
                    {
                      label: t.gauge.blocked,
                      value: summary(
                        gauge.blockedStitchesPer10cm,
                        gauge.blockedRowsPer10cm
                      ),
                    },
                  ]
                : []),
              ...(gauge.needleMm
                ? [
                    {
                      label: t.card.needleLabel,
                      value: `${gauge.needleMm}mm${needle?.jp ? ` (${needle.jp})` : ""}`,
                    },
                  ]
                : []),
            ],
          })}
        />
      }
    >
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
