import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { BackLink, Page } from "@/components/ui/page";
import { YarnTile } from "@/features/yarn/components/yarn-swatch";
import {
  deleteYarn,
  getYarn,
  listAllocationsForYarn,
} from "@/features/yarn/repository";
import { listGaugesForYarn } from "@/features/gauge/repository";
import { freeSkeins, stashTotal } from "@/domain/yarn";
import { guessWeightFromLabel, yarnWeight } from "@/domain/units";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import type { ReactNode } from "react";

export const Route = createFileRoute("/yarn/$yarnId/")({
  component: YarnDetail,
});

/** 이 화면의 정보 블록은 전부 같은 카드다. 그림자 없이 선으로만 나눈다. */
const CARD = "border-line bg-surface mb-5 rounded-md border p-4";

/** 카드 안쪽 라벨. 대문자 라벨 자리라 micro + 넓은 자간을 쓴다. */
const SECTION_LABEL = "text-micro text-text-3 mb-2";

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
  const swatches = useLiveQuery(() => listGaugesForYarn(yarnId), [yarnId]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!yarn) return null;

  const total = stashTotal(yarn);
  const free = freeSkeins(yarn, allocations ?? []);
  /* 굵기를 직접 고르지 않았어도 라벨의 무게·길이로 되짚는다. 등록 폼이
     추정해 보여주지만 "이 굵기로 설정"을 누르지 않으면 저장되지 않는데,
     그 버튼을 안 눌렀다는 이유로 권장 바늘을 감출 이유가 없다 —
     알 수 있는 값은 알려준다(디자인 원칙 5). 추정임은 밝힌다. */
  const stored =
    yarn.weightClass !== undefined ? yarnWeight(yarn.weightClass) : null;
  const guessed =
    stored ?? guessWeightFromLabel(yarn.skeinGrams, yarn.skeinMeters) ?? null;
  const weight = guessed;

  async function handleDelete() {
    await deleteYarn(yarnId);
    await navigate({ to: "/yarn" });
  }

  return (
    <Page
      title={yarn.name}
      back={
        <Link to="/yarn">
          <BackLink>
            <ChevronLeft size={16} />
            {t.yarn.title}
          </BackLink>
        </Link>
      }
      action={<YarnTile color={yarn.colorHex} />}
    >
      <dl className="mb-5 space-y-2">
        {yarn.brand && <Row label={t.yarn.brand}>{yarn.brand}</Row>}
        {yarn.colorName && <Row label={t.yarn.colorName}>{yarn.colorName}</Row>}
        {yarn.colorCode && <Row label={t.yarn.colorCode}>{yarn.colorCode}</Row>}
        {yarn.dyeLot && <Row label={t.yarn.dyeLot}>{yarn.dyeLot}</Row>}
        {yarn.fiber && <Row label={t.yarn.fiber}>{yarn.fiber}</Row>}
        {yarn.shop && <Row label={t.yarn.shop}>{yarn.shop}</Row>}
      </dl>

      {/* 보유량 — 이 화면에서 가장 또렷해야 하는 숫자 */}
      <section className={CARD}>
        <p className={SECTION_LABEL}>{t.yarn.stash}</p>
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
        <section className={CARD}>
          <p className={SECTION_LABEL}>
            {t.yarn.weightClass} · CYC {weight.cyc}
            {!stored && ` · ${t.yarn.weightEstimated}`}
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

      {/* 다음 걸음. 굵기 카드가 "권장 바늘 4mm"까지 알려주고 끝나면 그걸 보고
          무엇을 하면 되는지가 없다 — 스와치를 떠야 하는데 거기로 가는 길이
          없었다(디자인 원칙 5). 이미 재둔 스와치가 있으면 그쪽을 보여준다. */}
      <section className={CARD}>
        <p className={SECTION_LABEL}>{t.yarn.swatchNext}</p>
        {swatches && swatches.length > 0 ? (
          <ul className="space-y-1.5">
            {swatches.map((swatch) => (
              <li key={swatch.id}>
                <Link
                  to="/gauge/$gaugeId/edit"
                  params={{ gaugeId: swatch.id }}
                  className="border-line flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="text-small font-medium">
                    {t.gauge.summary
                      .replace("{sts}", String(swatch.stitchesPer10cm))
                      .replace("{rows}", String(swatch.rowsPer10cm))}
                  </span>
                  {swatch.needleMm && (
                    <span className="text-text-2 text-caption shrink-0">
                      {swatch.needleMm}mm
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-text-2 text-small mb-3">
              {t.yarn.swatchNextHint}
            </p>
            <Link to="/gauge/new" search={{ yarnId }}>
              <Button variant="secondary">
                <Ruler size={16} />
                {t.swatch.start}
              </Button>
            </Link>
          </>
        )}
      </section>

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

      {/* 삭제는 수정과 붙여두지 않는다. 되돌릴 수 없는 행동이 주 행동 옆에
          있으면 손이 미끄러진다. */}
      <div className="border-line flex items-center justify-between gap-2 border-t pt-4">
        <Link to="/yarn/$yarnId/edit" params={{ yarnId }}>
          <Button variant="secondary">{t.action.edit}</Button>
        </Link>
        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
          {t.action.delete}
        </Button>
      </div>

      {confirmingDelete && (
        <ConfirmSheet
          title={t.yarn.deleteConfirm}
          confirmLabel={t.action.delete}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
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
