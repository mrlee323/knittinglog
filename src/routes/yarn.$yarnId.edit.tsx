import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Page } from "@/components/ui/page";
import { YarnForm } from "@/features/yarn/components/yarn-form";
import { getYarn, updateYarn } from "@/features/yarn/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/yarn/$yarnId/edit")({
  component: EditYarn,
});

function EditYarn() {
  const t = useStrings();
  const navigate = useNavigate();
  const { yarnId } = Route.useParams();
  const yarn = useLiveQuery(() => getYarn(yarnId), [yarnId]);

  const back = () => navigate({ to: "/yarn/$yarnId", params: { yarnId } });

  if (!yarn) return null;

  return (
    <Page title={t.yarn.edit}>
      <YarnForm
        submitLabel={t.action.save}
        initial={{
          name: yarn.name,
          brand: yarn.brand,
          colorName: yarn.colorName,
          colorCode: yarn.colorCode,
          colorHex: yarn.colorHex,
          dyeLot: yarn.dyeLot,
          fiber: yarn.fiber,
          weightClass: yarn.weightClass,
          skeinGrams: yarn.skeinGrams,
          skeinMeters: yarn.skeinMeters,
          skeinCount: yarn.skeinCount,
          shop: yarn.shop,
          careLabel: yarn.careLabel,
        }}
        onCancel={back}
        onSubmit={async (values) => {
          await updateYarn(yarnId, values);
          await back();
        }}
      />
    </Page>
  );
}
