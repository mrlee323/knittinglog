import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Page } from "@/components/ui/page";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getProfile, updateProfile } from "@/features/profile/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/profiles/$profileId/edit")({
  component: EditProfile,
});

function EditProfile() {
  const t = useStrings();
  const navigate = useNavigate();
  const { profileId } = Route.useParams();
  const profile = useLiveQuery(() => getProfile(profileId), [profileId]);

  const back = () => navigate({ to: "/profiles" });

  if (!profile) return null;

  return (
    <Page title={t.profile.edit}>
      <ProfileForm
        submitLabel={t.action.save}
        initial={{
          name: profile.name,
          measurements: profile.measurements,
          preferredEaseCm: profile.preferredEaseCm,
        }}
        onCancel={back}
        onSubmit={async (values) => {
          await updateProfile(profileId, values);
          await back();
        }}
      />
    </Page>
  );
}
