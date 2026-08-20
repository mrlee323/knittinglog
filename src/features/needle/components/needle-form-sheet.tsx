import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { findSameNeedle } from "@/domain/needle";
import { needleLadder, findNeedle, type Craft } from "@/domain/units";
import { useStrings } from "@/i18n";
import type { NeedleFormValues } from "@/features/needle/repository";
import type { Needle, NeedleType } from "@/types/entities";

/**
 * 바늘 등록·수정.
 *
 * 굵기를 자유 입력이 아니라 규격 목록에서 고르게 한다. 바늘에는 굵기가 찍혀
 * 있으므로 목록에서 찾는 게 타이핑보다 빠르고, 4.5를 4.05로 잘못 넣는 사고도
 * 사라진다. 목록은 기법에 따라 바뀐다 — 코바늘은 대바늘과 다른 체계다.
 */
export function NeedleFormSheet({
  initial,
  existing,
  onSubmit,
  onCancel,
}: {
  initial?: Needle;
  /** 이미 가진 바늘과 겹치는지 알려주기 위해 필요하다 */
  existing: Needle[];
  onSubmit: (values: NeedleFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const [craft, setCraft] = useState<Craft>(initial?.craft ?? "knit");
  const [type, setType] = useState<NeedleType>(
    initial?.type ?? (initial?.craft === "crochet" ? "hook" : "circular")
  );
  const [sizeMm, setSizeMm] = useState(String(initial?.sizeMm ?? 4));
  const [lengthCm, setLengthCm] = useState(
    initial?.lengthCm ? String(initial.lengthCm) : ""
  );
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [saving, setSaving] = useState(false);

  const size = Number(sizeMm);
  const length = lengthCm.trim() === "" ? undefined : Number(lengthCm);
  // 줄 길이는 줄바늘에만 묻는다. 막대·장갑바늘·코바늘에는 줄이 없다.
  const needsLength = type === "circular";

  const duplicate = findSameNeedle(
    existing.filter((n) => n.id !== initial?.id),
    { craft, type, sizeMm: size, lengthCm: needsLength ? length : undefined }
  );

  async function handleSave() {
    setSaving(true);
    try {
      await onSubmit({
        craft,
        type,
        sizeMm: size,
        lengthCm: needsLength ? length : undefined,
        material: material.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? t.needle.edit : t.needle.add}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="shadow-overlay pb-safe bg-surface w-full max-w-lg rounded-t-lg p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading mb-4 font-semibold">
          {initial ? t.needle.edit : t.needle.add}
        </h2>

        <div className="flex gap-3">
          <div className="flex-1">
            <SelectField
              label={t.project.craft}
              value={craft}
              onChange={(e) => {
                const next = e.target.value as Craft;
                setCraft(next);
                // 기법을 바꾸면 종류도 맞춰준다 — 코바늘에 줄바늘은 없다
                setType(next === "crochet" ? "hook" : "circular");
              }}
              options={[
                { value: "knit", label: t.craft.knit },
                { value: "crochet", label: t.craft.crochet },
              ]}
            />
          </div>
          <div className="flex-1">
            <SelectField
              label={t.needle.typeLabel}
              value={type}
              onChange={(e) => setType(e.target.value as NeedleType)}
              options={(craft === "crochet"
                ? (["hook"] as NeedleType[])
                : (["circular", "straight", "dpn"] as NeedleType[])
              ).map((value) => ({ value, label: t.needle.type[value] }))}
            />
          </div>
        </div>

        <SelectField
          label={t.needle.size}
          hint={t.needle.sizeHint}
          value={sizeMm}
          onChange={(e) => setSizeMm(e.target.value)}
          options={needleLadder(craft).map((mm) => {
            const found = findNeedle(mm, craft);
            const alias = [found?.jp, found?.us ? `US ${found.us}` : undefined]
              .filter(Boolean)
              .join(" · ");
            return {
              value: String(mm),
              label: alias ? `${mm}mm · ${alias}` : `${mm}mm`,
            };
          })}
        />

        {needsLength && (
          <TextField
            label={t.needle.length}
            hint={t.needle.lengthHint}
            inputMode="numeric"
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value)}
          />
        )}

        <TextField
          label={t.needle.material}
          placeholder={t.needle.materialPlaceholder}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        />

        {/* 막지 않고 알린다. 같은 바늘을 정말 두 개 가진 사람도 있다 —
            그때는 두 개인 게 맞고, 그래야 여유 바늘 수도 맞는다. */}
        {duplicate && (
          <p className="text-hibernating text-caption mb-4">
            {t.needle.duplicate}
          </p>
        )}

        <div className="flex gap-2">
          <Button block disabled={saving || !size} onClick={handleSave}>
            {initial ? t.action.save : t.action.create}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
