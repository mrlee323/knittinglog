import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Page } from "@/components/ui/page";
import { useUnits } from "@/app/units";
import { filledCount, nearestEasePreset } from "@/domain/body";
import { deleteProfile, listProfiles } from "@/features/profile/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

export const Route = createFileRoute("/profiles/")({ component: Profiles });

function Profiles() {
  const t = useStrings();
  const units = useUnits();
  const navigate = useNavigate();
  const profiles = useLiveQuery(() => listProfiles(), []);
  const [pendingDelete, setPendingDelete] = useState<Id | null>(null);

  const pending = profiles?.find((p) => p.id === pendingDelete);

  return (
    <Page
      title={t.profile.title}
      action={
        <Button
          icon
          aria-label={t.profile.add}
          onClick={() => navigate({ to: "/profiles/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      <Link
        to="/settings"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.nav.settings}
      </Link>

      {profiles === undefined ? null : profiles.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.profile.empty}</p>
          <p className="text-text-3 text-small mt-1">{t.profile.emptyHint}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {profiles.map((profile) => {
            const ease = profile.preferredEaseCm ?? 0;
            return (
              <li
                key={profile.id}
                className="border-line bg-surface flex items-center gap-3 rounded-md border p-3"
              >
                <Link
                  to="/profiles/$profileId/edit"
                  params={{ profileId: profile.id }}
                  className="min-w-0 flex-1"
                >
                  <p className="text-subhead font-semibold">{profile.name}</p>
                  <p className="text-text-2 text-small">
                    {t.profile.filled.replace(
                      "{n}",
                      String(filledCount(profile.measurements))
                    )}
                    {profile.preferredEaseCm !== undefined &&
                      ` · ${t.profile.easePreset[nearestEasePreset(ease)]} ${units.formatLength(ease, 0)}`}
                  </p>
                </Link>
                <Button
                  variant="danger"
                  className="!text-caption !min-h-9 !px-2"
                  onClick={() => setPendingDelete(profile.id)}
                >
                  {t.action.delete}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {pending && (
        <ConfirmSheet
          title={t.profile.deleteConfirm}
          description={pending.name}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void deleteProfile(pending.id);
            setPendingDelete(null);
          }}
        />
      )}
    </Page>
  );
}
