import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { YarnTile } from "./yarn-swatch";
import { WeighSheet } from "./weigh-sheet";
import {
  allocateYarn,
  deallocateYarn,
  listAllocationsForProject,
  listWeighIns,
  listYarns,
  measurableWeighIns,
} from "@/features/yarn/repository";
import { counterView } from "@/domain/counter";
import { forecastYarn } from "@/domain/yarn";
import { listCounters } from "@/features/counter/repository";
import { useStrings } from "@/i18n";
import type { Id, Yarn, YarnAllocation } from "@/types/entities";

/**
 * 프로젝트에 물린 실.
 *
 * 이 배정이 있어야 프로젝트 카드의 실 색 세로선이 생기고,
 * 복귀 브리핑의 "실 잔량"이 말이 된다.
 */
export function AllocationSection({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const [adding, setAdding] = useState(false);

  const yarns = useLiveQuery(() => listYarns(), []);
  const allocations = useLiveQuery(
    () => listAllocationsForProject(projectId),
    [projectId]
  );
  // 잔량 예측은 지금 단수와 목표 단수를 알아야 성립한다. 메인 카운터는
  // 연동이 아닌 첫 카운터다 — 진행도 카드와 같은 기준을 쓴다.
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const main = counters?.find((c) => !c.linkedCounterId) ?? counters?.[0];
  const view = main ? counterView(main) : undefined;

  if (!yarns || !allocations) return null;

  const assigned = allocations
    .map((a) => ({ allocation: a, yarn: yarns.find((y) => y.id === a.yarnId) }))
    .filter((row) => row.yarn);

  return (
    <section className="border-line mb-6 border-t pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t.allocation.title}</h2>
        <Button
          icon
          variant="ghost"
          aria-label={t.allocation.add}
          disabled={yarns.length === 0}
          onClick={() => setAdding(true)}
        >
          <Plus size={18} />
        </Button>
      </div>

      {assigned.length === 0 ? (
        <p className="text-text-2 text-small">
          {yarns.length === 0 ? t.allocation.noStash : t.allocation.none}
        </p>
      ) : (
        <ul className="space-y-2">
          {assigned.map(({ allocation, yarn }) => (
            <AllocationRow
              key={allocation.id}
              allocation={allocation}
              yarn={yarn!}
              projectId={projectId}
              currentRow={view?.value ?? 0}
              targetRow={view?.target}
            />
          ))}
        </ul>
      )}

      {adding && (
        <AllocateSheet
          projectId={projectId}
          onClose={() => setAdding(false)}
          yarns={yarns.map((y) => ({
            id: y.id,
            name: y.name,
            colorHex: y.colorHex,
          }))}
        />
      )}
    </section>
  );
}

/**
 * 배정 한 줄.
 *
 * 실 부족은 **행에서 바로** 보여야 한다. 시트를 열어야 알 수 있으면 열어보지
 * 않고, 열어보지 않으면 마지막 단에서 알게 된다 — 그때는 이미 늦다.
 * 반대로 "충분해요"까지 늘 띄우면 소음이 되므로 모자랄 때만 말한다.
 */
function AllocationRow({
  allocation,
  yarn,
  projectId,
  currentRow,
  targetRow,
}: {
  allocation: YarnAllocation;
  yarn: Yarn;
  projectId: Id;
  currentRow: number;
  targetRow?: number;
}) {
  const t = useStrings();
  const [weighing, setWeighing] = useState(false);

  const weighIns = useLiveQuery(
    () => listWeighIns(allocation.id),
    [allocation.id]
  );

  const shortfall =
    targetRow !== undefined && weighIns
      ? forecastYarn(measurableWeighIns(weighIns), targetRow, currentRow)
      : null;

  return (
    <li className="border-line bg-surface rounded-md border p-3">
      <div className="flex items-center gap-3">
        <YarnTile color={yarn.colorHex} size="sm" />
        <Link
          to="/yarn/$yarnId"
          params={{ yarnId: yarn.id }}
          className="min-w-0 flex-1"
        >
          <p className="text-small truncate font-medium">{yarn.name}</p>
          <p className="text-text-2 text-caption truncate">
            {[yarn.colorName, yarn.dyeLot && `Lot ${yarn.dyeLot}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Link>
        <span className="text-text-2 text-caption shrink-0">
          {t.yarn.skeins.replace("{n}", String(allocation.skeinsAllocated))}
        </span>
        {/* 아이콘은 작아도 타깃은 44px여야 한다. 음수 마진으로 카드
            패딩 안쪽까지 눌리는 면적을 되찾는다. */}
        <button
          type="button"
          aria-label={t.weighIn.title}
          className="text-text-3 hover:text-text -my-3 flex size-11 shrink-0 items-center justify-center rounded-md transition"
          onClick={() => setWeighing(true)}
        >
          <Scale size={15} />
        </button>
        <button
          type="button"
          aria-label={t.allocation.remove}
          className="text-text-3 hover:text-text -my-3 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-md transition"
          onClick={() => void deallocateYarn(yarn.id, projectId)}
        >
          <X size={15} />
        </button>
      </div>

      {shortfall && !shortfall.enough && (
        <p className="text-hibernating text-caption mt-2 font-medium">
          {t.weighIn.short.replace("{n}", String(shortfall.shortfallRows))}
        </p>
      )}

      {weighing && (
        <WeighSheet
          allocationId={allocation.id}
          yarnName={yarn.name}
          currentRow={currentRow}
          targetRow={targetRow}
          onClose={() => setWeighing(false)}
        />
      )}
    </li>
  );
}

function AllocateSheet({
  projectId,
  yarns,
  onClose,
}: {
  projectId: Id;
  yarns: { id: Id; name: string; colorHex?: string }[];
  onClose: () => void;
}) {
  const t = useStrings();
  const [yarnId, setYarnId] = useState(yarns[0]?.id ?? "");
  const [skeins, setSkeins] = useState("1");

  const selected = yarns.find((y) => y.id === yarnId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.allocation.add}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="shadow-overlay pb-safe bg-surface w-full max-w-lg rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading mb-4 font-semibold">{t.allocation.pick}</h2>

        <SelectField
          label={t.yarn.title}
          value={yarnId}
          onChange={(e) => setYarnId(e.target.value)}
          options={yarns.map((y) => ({ value: y.id, label: y.name }))}
          before={<YarnTile color={selected?.colorHex} />}
        />

        <TextField
          label={t.allocation.skeins}
          inputMode="numeric"
          value={skeins}
          onChange={(e) => setSkeins(e.target.value)}
        />

        <div className="flex gap-2">
          <Button
            block
            disabled={!yarnId}
            onClick={async () => {
              await allocateYarn(
                yarnId,
                projectId,
                Math.max(0, Number(skeins) || 0)
              );
              onClose();
            }}
          >
            {t.allocation.add}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
