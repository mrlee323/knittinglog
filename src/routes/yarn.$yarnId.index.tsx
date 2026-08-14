import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { YarnTile } from "@/features/yarn/components/yarn-swatch";
import {
  deleteYarn,
  getYarn,
  listAllocationsForYarn,
} from "@/features/yarn/repository";
import { freeSkeins, stashTotal } from "@/domain/yarn";
import { yarnWeight } from "@/domain/units";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import type { ReactNode } from "react";

export const Route = createFileRoute("/yarn/$yarnId/")({
  component: YarnDetail,
});

function YarnDetail() {
  const t = useStrings();
  const navigate = useNavigate();
  const { yarnId } = Route.useParams();

  const yarn = useLiveQuery(() => getYarn(yarnId), [yarnId]);
  const allocations = useLiveQuery(
    () => listAllocationsForYarn(yarnId),
    [yarnId]
  );
  const projects = useLiveQuery(() => db.projects.toArray(), []);

  if (!yarn) return null;

  const total = stashTotal(yarn);
  const free = freeSkeins(yarn, allocations ?? []);
  const weight =
    yarn.weightClass !== undefined ? yarnWeight(yarn.weightClass) : null;

  async function handleDelete() {
    if (!window.confirm(t.yarn.deleteConfirm)) return;
    await deleteYarn(yarnId);
    await navigate({ to: "/yarn" });
  }

  return (
    <Page title={yarn.name} action={<YarnTile color={yarn.colorHex} />}>
      <Link
        to="/yarn"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.yarn.title}
      </Link>

      <dl className="mb-5 space-y-2">
        {yarn.brand && <Row label={t.yarn.brand}>{yarn.brand}</Row>}
        {yarn.colorName && <Row label={t.yarn.colorName}>{yarn.colorName}</Row>}
        {yarn.colorCode && <Row label={t.yarn.colorCode}>{yarn.colorCode}</Row>}
        {yarn.dyeLot && <Row label={t.yarn.dyeLot}>{yarn.dyeLot}</Row>}
        {yarn.fiber && <Row label={t.yarn.fiber}>{yarn.fiber}</Row>}
        {yarn.shop && <Row label={t.yarn.shop}>{yarn.shop}</Row>}
      </dl>

      {/* 보유량 */}
      <section className="border-line bg-surface mb-5 rounded-md border p-4">
        <p className="text-title font-semibold">
          {t.yarn.skeins.replace("{n}", String(total.skeins))}
        </p>
        {total.grams !== undefined && total.meters !== undefined && (
          <p className="text-text-2 text-small mt-0.5">
            {t.yarn.totals
              .replace("{grams}", String(total.grams))
              .replace("{meters}", String(total.meters))}
          </p>
        )}
        {(allocations?.length ?? 0) > 0 && (
          <p
            className={
              free < 0
                ? "text-frogged text-small mt-2"
                : "text-text-2 text-small mt-2"
            }
          >
            {free < 0
              ? t.yarn.overAllocated.replace("{n}", String(-free))
              : `${t.yarn.allocated.replace(
                  "{n}",
                  String(total.skeins - free)
                )} · ${t.yarn.free.replace("{n}", String(free))}`}
          </p>
        )}
      </section>

      {/* 굵기 — 국가별 대조가 핵심이다. 이게 없으면 해외 도안을 국내 실로 못 뜬다. */}
      {weight && (
        <section className="border-line mb-5 rounded-md border p-4">
          <p className="text-micro text-text-3 mb-2">
            {t.yarn.weightClass} · CYC {weight.cyc}
          </p>
          <p className="text-subhead font-semibold">{weight.names.ko}</p>
          <p className="text-text-2 text-small mt-1">
            {t.yarn.aliases} — {weight.names.en} · {weight.names.uk} ·{" "}
            {weight.names.ja}
          </p>
          <p className="text-text-2 text-small mt-2">
            {t.yarn.gaugeRange
              .replace("{min}", String(weight.gaugeRange[0]))
              .replace("{max}", String(weight.gaugeRange[1]))}
          </p>
          <p className="text-text-2 text-small">
            {t.yarn.needleRange
              .replace("{min}", String(weight.needleRangeMm[0]))
              .replace("{max}", String(weight.needleRangeMm[1]))}
          </p>
        </section>
      )}

      {/* 어느 프로젝트에 물려 있는지 */}
      {(allocations?.length ?? 0) > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 font-medium">{t.allocation.title}</h2>
          <ul className="space-y-1.5">
            {allocations?.map((allocation) => {
              const project = projects?.find(
                (p) => p.id === allocation.projectId
              );
              if (!project) return null;
              return (
                <li key={allocation.id}>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="border-line bg-surface flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="text-small truncate">{project.name}</span>
                    <span className="text-text-2 text-caption shrink-0">
                      {t.yarn.skeins.replace(
                        "{n}",
                        String(allocation.skeinsAllocated)
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="border-line flex gap-2 border-t pt-4">
        <Link to="/yarn/$yarnId/edit" params={{ yarnId }}>
          <Button variant="ghost">{t.action.edit}</Button>
        </Link>
        <Button variant="danger" onClick={handleDelete}>
          {t.action.delete}
        </Button>
      </div>
    </Page>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="text-text-2 text-small w-20 shrink-0">{label}</dt>
      <dd className="text-small min-w-0">{children}</dd>
    </div>
  );
}
