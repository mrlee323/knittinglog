import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Page } from "@/components/ui/page";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { createProfile } from "@/features/profile/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/profiles/new")({
  component: NewProfile,
});

function NewProfile() {
  const t = useStrings();
  const navigate = useNavigate();

  return (
    <Page wide title={t.profile.add}>
      <ProfileForm
        submitLabel={t.action.create}
        onCancel={() => navigate({ to: "/profiles" })}
        onSubmit={async (values) => {
          await createProfile(values);
          await navigate({ to: "/profiles" });
        }}
      />
    </Page>
  );
}
