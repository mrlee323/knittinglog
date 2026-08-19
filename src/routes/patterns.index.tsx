import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { BackLink, CardGrid, Page } from "@/components/ui/page";
import { SymbolCanvas } from "@/features/stitchChart/components/symbol-canvas";
import {
  deleteStitchChart,
  listStitchCharts,
  toStitchChart,
} from "@/features/stitchChart/repository";
import { verifyChart } from "@/domain/stitchChart";
import { useStrings } from "@/i18n";
import type { Id, StitchChartRecord } from "@/types/entities";

export const Route = createFileRoute("/patterns/")({ component: Patterns });

function Patterns() {
  const t = useStrings();
  const navigate = useNavigate();
  const charts = useLiveQuery(() => listStitchCharts(), []);
  const [pendingDelete, setPendingDelete] = useState<Id | null>(null);

  const pending = charts?.find((c) => c.id === pendingDelete);

  return (
    <Page
      wide
      title={t.pattern.title}
      back={
        <Link to="/gauge">
          <BackLink>
            <ChevronLeft size={16} />
            {t.gauge.title}
          </BackLink>
        </Link>
      }
      action={
        <Button
          icon
          aria-label={t.pattern.add}
          onClick={() => navigate({ to: "/patterns/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      {charts === undefined ? null : charts.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.pattern.empty}</p>
          <p className="text-text-3 text-small mx-auto mt-1 max-w-sm text-balance">
            {t.pattern.emptyHint}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate({ to: "/patterns/new" })}
          >
            {t.pattern.add}
          </Button>
        </div>
      ) : (
        <CardGrid columns={3}>
          {charts.map((chart) => (
            <li key={chart.id}>
              <PatternCard
                record={chart}
                onDelete={() => setPendingDelete(chart.id)}
              />
            </li>
          ))}
        </CardGrid>
      )}

      {pending && (
        <ConfirmSheet
          title={t.pattern.deleteConfirm}
          description={pending.name}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void deleteStitchChart(pending.id);
            setPendingDelete(null);
          }}
        />
      )}
    </Page>
  );
}

function PatternCard({
  record,
  onDelete,
}: {
  record: StitchChartRecord;
  onDelete: () => void;
}) {
  const t = useStrings();
  const chart = toStitchChart(record);
  // 심볼은 색과 달리 작으면 못 읽는다. 최소 크기를 색상 차트보다 높게 잡는다.
  const cell = Math.max(7, Math.min(14, Math.floor(220 / record.width)));
  const balance = verifyChart(chart, record.castOn);

  return (
    <div className="border-line bg-surface flex flex-col gap-2 rounded-md border p-3">
      <Link
        to="/patterns/$patternId"
        params={{ patternId: record.id }}
        className="min-w-0"
      >
        <div className="bg-sunken mb-2 flex items-center justify-center overflow-hidden rounded-sm p-2">
          <SymbolCanvas chart={chart} cellWidth={cell} cellHeight={cell} />
        </div>
        <p className="text-subhead truncate font-semibold">{record.name}</p>
        <p className="text-text-2 text-small">
          {record.width} × {record.height}
        </p>
        {/* 목록에서 코수가 틀린 도안을 바로 알 수 있게 한다 — 열어봐야
            아는 정보라면 검산이 늦게 도착한다 */}
        {!balance.ok && (
          <p className="text-frogged text-caption mt-1">
            {t.pattern.verifyBad.replace(
              "{n}",
              String(balance.rows.filter((r) => !r.ok).length)
            )}
          </p>
        )}
      </Link>
      <Button
        variant="danger"
        className="!text-caption !min-h-9 self-start !px-2"
        onClick={onDelete}
      >
        {t.action.delete}
      </Button>
    </div>
  );
}
