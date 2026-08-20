import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { forecastYarn } from "@/domain/yarn";
import {
  addWeighIn,
  deleteWeighIn,
  listWeighIns,
  measurableWeighIns,
} from "@/features/yarn/repository";
import { useStrings } from "@/i18n";
import type { Id, YarnWeighIn } from "@/types/entities";

/**
 * 실 잔량 기록과 부족 예측 — 기획 §3.10-3 (Yarn Chicken).
 *
 * 저울에 올린 무게를 단수와 함께 적는다. 두 지점이 모이면 단당 소모량이
 * 역산되고, 목표 단수까지 갈 수 있는지가 나온다. 실이 모자란 걸 마지막 단에서
 * 알면 로트가 다른 실을 사게 되거나 아예 풀어야 하므로, 미리 아는 값이다.
 */
export function WeighSheet({
  allocationId,
  yarnName,
  currentRow,
  targetRow,
  onClose,
}: {
  allocationId: Id;
  yarnName: string;
  currentRow: number;
  targetRow?: number;
  onClose: () => void;
}) {
  const t = useStrings();
  const weighIns = useLiveQuery(
    () => listWeighIns(allocationId),
    [allocationId]
  );

  const [grams, setGrams] = useState("");
  // 지금 단수를 기본값으로 채운다 — 재는 시점은 거의 언제나 "지금"이다
  const [row, setRow] = useState(String(currentRow));
  const [saving, setSaving] = useState(false);

  const gramsValue = Number(grams);
  const canSave = grams.trim() !== "" && gramsValue >= 0 && !saving;

  async function handleAdd() {
    setSaving(true);
    try {
      const parsedRow = Number(row);
      await addWeighIn(
        allocationId,
        gramsValue,
        row.trim() === "" || Number.isNaN(parsedRow) ? undefined : parsedRow
      );
      setGrams("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.weighIn.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="shadow-overlay pb-safe bg-surface max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading font-semibold">{t.weighIn.title}</h2>
        <p className="text-text-2 text-small mt-0.5 mb-4">{yarnName}</p>

        {weighIns && (
          <Forecast
            weighIns={weighIns}
            currentRow={currentRow}
            targetRow={targetRow}
          />
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.weighIn.grams}
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.weighIn.atRow}
              inputMode="numeric"
              value={row}
              onChange={(e) => setRow(e.target.value)}
            />
          </div>
        </div>
        <p className="text-text-3 text-caption -mt-2 mb-4">
          {t.weighIn.atRowHint}
        </p>

        <div className="flex gap-2">
          <Button block disabled={!canSave} onClick={() => void handleAdd()}>
            <Scale size={16} aria-hidden />
            {t.weighIn.add}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t.action.close}
          </Button>
        </div>

        {weighIns && weighIns.length > 0 && (
          <ul className="border-line mt-5 space-y-1 border-t pt-4">
            {weighIns.map((w) => (
              <li key={w.id} className="flex items-center gap-3">
                <span className="text-small flex-1">
                  {w.atRow === undefined
                    ? t.weighIn.entryNoRow.replace(
                        "{grams}",
                        String(w.remainingGrams)
                      )
                    : t.weighIn.entry
                        .replace("{grams}", String(w.remainingGrams))
                        .replace("{row}", String(w.atRow))}
                </span>
                <button
                  type="button"
                  aria-label={t.weighIn.remove}
                  className="text-text-3 hover:text-text -my-1 flex size-11 shrink-0 items-center justify-center rounded-md transition"
                  onClick={() => void deleteWeighIn(w.id)}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * 무엇이 없어서 계산이 안 되는지 말한다.
 *
 * "예측 불가"라고만 쓰면 사용자는 무게를 한 번 더 재야 하는지, 단수를 적어야
 * 하는지 모른다. 빠진 조건을 이름으로 말해야 다음 행동이 정해진다.
 */
function Forecast({
  weighIns,
  currentRow,
  targetRow,
}: {
  weighIns: YarnWeighIn[];
  currentRow: number;
  targetRow?: number;
}) {
  const t = useStrings();

  if (weighIns.length === 0) {
    return <Note>{`${t.weighIn.none} — ${t.weighIn.hint}`}</Note>;
  }

  const usable = measurableWeighIns(weighIns);
  if (usable.length < 2) {
    return (
      <Note>
        {weighIns.length < 2 ? t.weighIn.needMore : t.weighIn.needRows}
      </Note>
    );
  }

  const forecast = forecastYarn(usable, targetRow ?? currentRow, currentRow);
  if (!forecast) return <Note>{t.weighIn.needMore}</Note>;

  return (
    <div className="border-line bg-sunken mb-4 rounded-md border p-4">
      <p className="text-small font-medium">
        {t.weighIn.rowsLeft.replace("{n}", String(forecast.rowsLeft))}
      </p>
      {targetRow !== undefined && (
        <p
          className={`text-small mt-1 ${
            forecast.enough ? "text-text-2" : "text-hibernating font-medium"
          }`}
        >
          {forecast.enough
            ? t.weighIn.enough
            : t.weighIn.short.replace(
                "{n}",
                String(forecast.shortfallRows)
              )}
        </p>
      )}
      <p className="text-text-3 text-caption mt-1">
        {t.weighIn.perRow.replace("{n}", forecast.gramsPerRow.toFixed(2))}
      </p>
    </div>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="border-line text-text-3 text-caption mb-4 rounded-md border border-dashed p-3">
    {children}
  </p>
);
