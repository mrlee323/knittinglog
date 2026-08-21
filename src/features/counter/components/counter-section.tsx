import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { counterView } from "@/domain/counter";
import { CounterFormSheet } from "./counter-form-sheet";
import {
  createCounter,
  deleteCounter,
  listCounters,
} from "@/features/counter/repository";
import { listPieces } from "@/features/piece/repository";
import { useStrings } from "@/i18n";
import type { Counter, Id } from "@/types/entities";

export function CounterSection({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const pieces = useLiveQuery(() => listPieces(projectId), [projectId]);
  const [adding, setAdding] = useState(false);
  // 확인 시트는 행마다 두지 않고 섹션이 하나만 들고 있는다. 행에 두면
  // 열려 있는 동안 목록이 갱신되면 시트가 행과 함께 사라진다.
  const [pendingDelete, setPendingDelete] = useState<Counter | null>(null);

  if (!counters) return null;

  return (
    <section id="counter-section" className="border-line mb-6 border-t pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t.counter.title}</h2>
        <Button
          icon
          variant="ghost"
          aria-label={t.counter.add}
          onClick={() => setAdding(true)}
        >
          <Plus size={18} />
        </Button>
      </div>

      {counters.length === 0 ? (
        <p className="text-text-2 text-small mb-3">{t.counter.emptyHint}</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {counters.map((counter) => (
            <CounterRow
              key={counter.id}
              counter={counter}
              siblings={counters}
              onRequestDelete={() => setPendingDelete(counter)}
            />
          ))}
        </ul>
      )}

      {adding && (
        <CounterFormSheet
          siblings={counters}
          pieces={pieces}
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            await createCounter(projectId, input);
            setAdding(false);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmSheet
          title={t.counter.deleteConfirm}
          description={pendingDelete.label}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void deleteCounter(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </section>
  );
}

function CounterRow({
  counter,
  siblings,
  onRequestDelete,
}: {
  counter: Counter;
  siblings: Counter[];
  onRequestDelete: () => void;
}) {
  const t = useStrings();
  const view = counterView(counter);
  const main = siblings.find((c) => c.id === counter.linkedCounterId);

  return (
    <li className="border-line bg-surface flex items-center gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-small truncate font-medium">{counter.label}</p>
        <p className="text-text-2 text-caption">
          {view.value}
          {view.target ? ` / ${view.target}` : ` ${t.counter.rows}`}
          {view.repeat &&
            ` · ${t.counter.repeatProgress
              .replace("{done}", String(view.repeat.completed))
              .replace("{row}", String(view.repeat.rowInRepeat))
              .replace("{len}", String(view.repeat.length))}`}
        </p>
        {main && counter.linkRatio && (
          <p className="text-text-3 text-caption mt-0.5">
            {t.counter.linkedHint
              .replace("{main}", main.label)
              .replace("{ratio}", String(counter.linkRatio))}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={t.action.delete}
        className="text-text-2 rounded-md p-2"
        onClick={onRequestDelete}
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
