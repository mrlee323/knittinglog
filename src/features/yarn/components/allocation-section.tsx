import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { YarnTile } from "./yarn-swatch";
import {
  allocateYarn,
  deallocateYarn,
  listAllocationsForProject,
  listYarns,
} from "@/features/yarn/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

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
            <li
              key={allocation.id}
              className="border-line bg-surface flex items-center gap-3 rounded-md border p-3"
            >
              <YarnTile color={yarn!.colorHex} size="sm" />
              <Link
                to="/yarn/$yarnId"
                params={{ yarnId: yarn!.id }}
                className="min-w-0 flex-1"
              >
                <p className="text-small truncate font-medium">{yarn!.name}</p>
                <p className="text-text-2 text-caption truncate">
                  {[yarn!.colorName, yarn!.dyeLot && `Lot ${yarn!.dyeLot}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
              <span className="text-text-2 text-caption shrink-0">
                {t.yarn.skeins.replace(
                  "{n}",
                  String(allocation.skeinsAllocated)
                )}
              </span>
              {/* 아이콘은 작아도 타깃은 44px여야 한다. 음수 마진으로 카드
                  패딩 안쪽까지 눌리는 면적을 되찾는다. */}
              <button
                type="button"
                aria-label={t.allocation.remove}
                className="text-text-3 hover:text-text -my-3 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-md transition"
                onClick={() => void deallocateYarn(yarn!.id, projectId)}
              >
                <X size={15} />
              </button>
            </li>
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
