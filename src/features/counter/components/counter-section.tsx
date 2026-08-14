import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { counterView } from "@/domain/counter";
import { CounterFormSheet } from "./counter-form-sheet";
import {
  createCounter,
  deleteCounter,
  listCounters,
} from "@/features/counter/repository";
import { useStrings } from "@/i18n";
import type { Counter, Id } from "@/types/entities";

export function CounterSection({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const [adding, setAdding] = useState(false);

  if (!counters) return null;

  return (
    <section className="border-line mb-6 border-t pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t.counter.title}</h2>
        <Button
          variant="ghost"
          className="!min-h-9 !px-2"
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
              onDelete={() => void deleteCounter(counter.id)}
            />
          ))}
        </ul>
      )}

      {/* 뜨기 모드로 가는 입구. 대시보드에서 2탭 안에 여기 도달해야 한다. */}
      <Link to="/projects/$projectId/knit" params={{ projectId }}>
        <Button block disabled={counters.length === 0}>
          {t.counter.knit}
        </Button>
      </Link>

      {adding && (
        <CounterFormSheet
          siblings={counters}
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            await createCounter(projectId, input);
            setAdding(false);
          }}
        />
      )}
    </section>
  );
}

function CounterRow({
  counter,
  siblings,
  onDelete,
}: {
  counter: Counter;
  siblings: Counter[];
  onDelete: () => void;
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
        onClick={() => {
          if (window.confirm(t.counter.deleteConfirm)) onDelete();
        }}
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
