import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Calculator, Plus, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { CardGrid, Page } from "@/components/ui/page";
import { deleteGauge, listGauges } from "@/features/gauge/repository";
import { findNeedle } from "@/domain/units";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

export const Route = createFileRoute("/gauge/")({ component: GaugeIndex });

function GaugeIndex() {
  const t = useStrings();
  const navigate = useNavigate();
  const gauges = useLiveQuery(() => listGauges(), []);
  const [pendingDelete, setPendingDelete] = useState<Id | null>(null);

  const pending = gauges?.find((g) => g.id === pendingDelete);
  const summary = (sts: number, rows: number) =>
    t.gauge.summary
      .replace("{sts}", String(sts))
      .replace("{rows}", String(rows));

  return (
    <Page
      wide
      title={t.gauge.title}
      action={
        <Button
          icon
          aria-label={t.gauge.add}
          onClick={() => navigate({ to: "/gauge/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      {/* 계산기가 이 화면의 주된 목적지다. 스와치는 계산기의 입력일 뿐이다. */}
      <Link to="/gauge/calc" className="mb-5 block">
        <Button block variant="secondary">
          <Calculator size={16} />
          {t.gauge.calcTitle}
        </Button>
      </Link>

      {gauges === undefined ? null : gauges.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <Ruler size={20} className="text-text-3 mx-auto mb-2" />
          <p className="text-text-2">{t.gauge.empty}</p>
          <p className="text-text-3 text-small mt-1">{t.gauge.emptyHint}</p>
        </div>
      ) : (
        <CardGrid>
          {gauges.map((gauge) => {
            const needle = gauge.needleMm ? findNeedle(gauge.needleMm) : null;
            return (
              <li
                key={gauge.id}
                className="border-line bg-surface flex items-center gap-3 rounded-md border p-3"
              >
                <Link
                  to="/gauge/$gaugeId/edit"
                  params={{ gaugeId: gauge.id }}
                  className="min-w-0 flex-1"
                >
                  <p className="text-subhead font-semibold">
                    {summary(gauge.stitchesPer10cm, gauge.rowsPer10cm)}
                  </p>
                  <p className="text-text-2 text-small truncate">
                    {[
                      gauge.label,
                      gauge.pattern,
                      gauge.needleMm &&
                        `${gauge.needleMm}mm${needle?.jp ? ` (${needle.jp})` : ""}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
                <Button
                  variant="danger"
                  className="!text-caption !min-h-9 !px-2"
                  onClick={() => setPendingDelete(gauge.id)}
                >
                  {t.action.delete}
                </Button>
              </li>
            );
          })}
        </CardGrid>
      )}

      {pending && (
        <ConfirmSheet
          title={t.gauge.deleteConfirm}
          // 목록에서 삭제하는 거라 어느 스와치인지 시트가 다시 말해줘야 한다
          description={[
            summary(pending.stitchesPer10cm, pending.rowsPer10cm),
            pending.label,
          ]
            .filter(Boolean)
            .join(" · ")}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void deleteGauge(pending.id);
            setPendingDelete(null);
          }}
        />
      )}
    </Page>
  );
}
