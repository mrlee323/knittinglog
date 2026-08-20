import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Calculator, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardGrid, Page } from "@/components/ui/page";
import { MaterialTabs } from "@/features/needle/components/material-tabs";
import { YarnTile } from "@/features/yarn/components/yarn-swatch";
import { listYarns } from "@/features/yarn/repository";
import { freeSkeins, stashTotal } from "@/domain/yarn";
import { yarnWeight } from "@/domain/units";
import { db } from "@/lib/db";
import { useLocale, useStrings } from "@/i18n";
import type { Yarn, YarnAllocation } from "@/types/entities";

export const Route = createFileRoute("/yarn/")({ component: YarnIndex });

function YarnIndex() {
  const t = useStrings();
  const navigate = useNavigate();

  const yarns = useLiveQuery(() => listYarns(), []);
  // 실마다 따로 조회하면 N+1이 된다. 한 번 읽어서 나눠 쓴다.
  const allocations = useLiveQuery(() => db.yarnAllocations.toArray(), []);

  return (
    <Page
      wide
      title={t.yarn.title}
      action={
        <Button
          icon
          aria-label={t.yarn.add}
          onClick={() => navigate({ to: "/yarn/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      <MaterialTabs />

      {/* 실 계산기는 스태시가 비어 있어도 쓸 수 있다 — 오히려 실을 사기
          전에 필요한 계산이라 목록보다 먼저 닿아야 한다. */}
      <Link to="/yarn/calc" className="mb-5 block sm:max-w-xs">
        <Button block variant="secondary">
          <Calculator size={16} />
          {t.yarnCalc.title}
        </Button>
      </Link>

      {yarns === undefined ? null : yarns.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.yarn.empty}</p>
          <p className="text-text-3 text-small mx-auto mt-1 max-w-xs text-balance">
            {t.yarn.emptyHint}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate({ to: "/yarn/new" })}
          >
            {t.yarn.add}
          </Button>
        </div>
      ) : (
        <CardGrid>
          {yarns.map((yarn) => (
            <li key={yarn.id}>
              <YarnRow
                yarn={yarn}
                allocations={(allocations ?? []).filter(
                  (a) => a.yarnId === yarn.id
                )}
              />
            </li>
          ))}
        </CardGrid>
      )}
    </Page>
  );
}

function YarnRow({
  yarn,
  allocations,
}: {
  yarn: Yarn;
  allocations: YarnAllocation[];
}) {
  const t = useStrings();
  const locale = useLocale();
  const total = stashTotal(yarn);
  const free = freeSkeins(yarn, allocations);
  const weight =
    yarn.weightClass !== undefined ? yarnWeight(yarn.weightClass) : null;

  return (
    <Link
      to="/yarn/$yarnId"
      params={{ yarnId: yarn.id }}
      className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border p-3 transition"
    >
      <YarnTile color={yarn.colorHex} />
      <div className="min-w-0 flex-1">
        <p className="text-subhead truncate font-semibold">{yarn.name}</p>
        <p className="text-text-2 text-small truncate">
          {[
            yarn.brand,
            yarn.colorName,
            weight?.names[locale === "ko" ? "ko" : "en"],
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-small font-medium">
          {t.yarn.skeins.replace("{n}", String(total.skeins))}
        </p>
        {allocations.length > 0 && (
          <p
            className={
              free < 0
                ? "text-frogged text-caption"
                : "text-text-3 text-caption"
            }
          >
            {free < 0
              ? t.yarn.overAllocated.replace("{n}", String(-free))
              : t.yarn.free.replace("{n}", String(free))}
          </p>
        )}
      </div>
    </Link>
  );
}
