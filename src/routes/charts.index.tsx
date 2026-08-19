import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { BackLink, CardGrid, Page } from "@/components/ui/page";
import { ChartCanvas } from "@/features/chart/components/chart-canvas";
import { deleteChart, listCharts, toChart } from "@/features/chart/repository";
import { useStrings } from "@/i18n";
import type { ColorChartRecord, Id } from "@/types/entities";

export const Route = createFileRoute("/charts/")({ component: Charts });

function Charts() {
  const t = useStrings();
  const navigate = useNavigate();
  const charts = useLiveQuery(() => listCharts(), []);
  const [pendingDelete, setPendingDelete] = useState<Id | null>(null);

  const pending = charts?.find((c) => c.id === pendingDelete);

  return (
    <Page
      wide
      title={t.chart.title}
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
          aria-label={t.chart.add}
          onClick={() => navigate({ to: "/charts/new" })}
        >
          <Plus size={18} />
        </Button>
      }
    >
      {charts === undefined ? null : charts.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.chart.empty}</p>
          <p className="text-text-3 text-small mx-auto mt-1 max-w-sm text-balance">
            {t.chart.emptyHint}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate({ to: "/charts/new" })}
          >
            {t.chart.add}
          </Button>
        </div>
      ) : (
        <CardGrid columns={3}>
          {charts.map((chart) => (
            <li key={chart.id}>
              <ChartCard
                chart={chart}
                onDelete={() => setPendingDelete(chart.id)}
              />
            </li>
          ))}
        </CardGrid>
      )}

      {pending && (
        <ConfirmSheet
          title={t.chart.deleteConfirm}
          description={pending.name}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void deleteChart(pending.id);
            setPendingDelete(null);
          }}
        />
      )}
    </Page>
  );
}

/** 목록의 미리보기는 격자선 없이 그린다 — 무늬가 무엇인지만 보면 된다 */
function ChartCard({
  chart,
  onDelete,
}: {
  chart: ColorChartRecord;
  onDelete: () => void;
}) {
  const t = useStrings();
  const data = toChart(chart);
  // 카드 안에 들어가는 크기로 칸을 줄인다. 큰 문양도 한눈에 보이게.
  const cell = Math.max(2, Math.min(8, Math.floor(220 / chart.width)));

  return (
    <div className="border-line bg-surface flex flex-col gap-2 rounded-md border p-3">
      <Link
        to="/charts/$chartId"
        params={{ chartId: chart.id }}
        className="min-w-0"
      >
        <div className="bg-sunken mb-2 flex items-center justify-center overflow-hidden rounded-sm p-2">
          <ChartCanvas
            chart={data}
            cellWidth={cell}
            cellHeight={cell}
            grid={false}
          />
        </div>
        <p className="text-subhead truncate font-semibold">{chart.name}</p>
        <p className="text-text-2 text-small">
          {chart.width} × {chart.height}
        </p>
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
