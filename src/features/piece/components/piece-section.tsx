import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  applyPieceCounts,
  createPiece,
  deletePiece,
  listPieces,
  pieceFormSchema,
  updatePiece,
  type PieceFormValues,
} from "@/features/piece/repository";
import { listGaugesForProject } from "@/features/gauge/repository";
import { getProject } from "@/features/project/repository";
import { pieceCounts, pieceDrift, SUGGESTED_PIECES } from "@/domain/piece";
import type { Gauge } from "@/domain/gauge";
import { useStrings } from "@/i18n";
import type { Id, ProjectPiece } from "@/types/entities";

/**
 * 조각 계획.
 *
 * 계산기 여섯 개가 맞는 답을 내는데 그 답이 화면을 벗어나면 사라졌다. 여기가
 * 머무는 자리다 — 저장된 코수는 배색 도안의 얹을 코수와 카운터 목표가 함께
 * 읽는다.
 *
 * 치수를 함께 들고 있어서 게이지가 바뀌면 어긋남을 알려준다. 스와치를 다시
 * 뜨는 일은 실제로 자주 있고, 그때 계획한 코수가 조용히 틀린 값이 되는 게
 * 이 화면이 막으려는 것이다.
 */
export function PieceSection({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProjectPiece>();
  const [pendingDelete, setPendingDelete] = useState<ProjectPiece>();

  const pieces = useLiveQuery(() => listPieces(projectId), [projectId]);
  const project = useLiveQuery(() => getProject(projectId), [projectId]);
  const gauges = useLiveQuery(
    () => listGaugesForProject(projectId),
    [projectId]
  );

  if (!pieces || !project) return null;

  // 블로킹 후 값이 있으면 그쪽이 완성 치수의 기준이다
  const swatch = gauges?.[0];
  const gauge: Gauge | undefined = swatch
    ? {
        stitchesPer10cm:
          swatch.blockedStitchesPer10cm ?? swatch.stitchesPer10cm,
        rowsPer10cm: swatch.blockedRowsPer10cm ?? swatch.rowsPer10cm,
      }
    : undefined;

  // 계산기에서 저장한 조각은 kind가 없다 — 이름이 같아도 "몸판을 추가하라"고
  // 제안하면 이상하므로 이름으로도 거른다.
  const suggestions = SUGGESTED_PIECES[project.category].filter(
    (kind) =>
      !pieces.some((p) => p.kind === kind || p.name === t.piece.kind[kind])
  );

  return (
    <section className="border-line mb-6 border-t pt-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-medium">{t.piece.title}</h2>
        <Button
          icon
          variant="ghost"
          aria-label={t.piece.add}
          onClick={() => setAdding(true)}
        >
          <Plus size={18} />
        </Button>
      </div>
      <p className="text-text-3 text-caption mb-3">{t.piece.hint}</p>

      {pieces.length === 0 ? (
        <p className="text-text-2 text-small mb-3">{t.piece.none}</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {pieces.map((piece) => (
            <PieceRow
              key={piece.id}
              piece={piece}
              gauge={gauge}
              gaugeId={swatch?.id}
              onEdit={() => setEditing(piece)}
              onDelete={() => setPendingDelete(piece)}
            />
          ))}
        </ul>
      )}

      {/* 처음 만드는 사람은 옷이 어떤 조각으로 나뉘는지 모른다. 빈 이름칸만
          주면 거기서 멈추므로 이 종류의 작품이 대개 어떻게 나뉘는지 준다. */}
      {suggestions.length > 0 && (
        <>
          <p className="text-text-3 text-micro mb-2">{t.piece.suggest}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((kind) => (
              <Button
                key={kind}
                variant="secondary"
                className="!text-caption !min-h-9 !px-3"
                onClick={() =>
                  void createPiece(projectId, {
                    name: t.piece.kind[kind],
                    kind,
                  })
                }
              >
                <Plus size={14} />
                {t.piece.kind[kind]}
              </Button>
            ))}
          </div>
        </>
      )}

      {(adding || editing) && (
        <PieceSheet
          piece={editing}
          gauge={gauge}
          onClose={() => {
            setAdding(false);
            setEditing(undefined);
          }}
          onSubmit={async (values) => {
            if (editing)
              await updatePiece(editing.id, { ...values, gaugeId: swatch?.id });
            else
              await createPiece(projectId, { ...values, gaugeId: swatch?.id });
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmSheet
          title={t.piece.deleteConfirm}
          description={pendingDelete.name}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={async () => {
            await deletePiece(pendingDelete.id);
            setPendingDelete(undefined);
          }}
        />
      )}
    </section>
  );
}

function PieceRow({
  piece,
  gauge,
  gaugeId,
  onEdit,
  onDelete,
}: {
  piece: ProjectPiece;
  gauge: Gauge | undefined;
  gaugeId?: Id;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useStrings();
  const drift = gauge ? pieceDrift(piece, gauge) : null;

  const counts =
    piece.stitches !== undefined && piece.rows !== undefined
      ? t.piece.counts
          .replace("{sts}", String(piece.stitches))
          .replace("{rows}", String(piece.rows))
      : piece.stitches !== undefined
        ? t.piece.countsStitchesOnly.replace("{sts}", String(piece.stitches))
        : piece.rows !== undefined
          ? t.piece.countsRowsOnly.replace("{rows}", String(piece.rows))
          : t.piece.noCounts;

  const size =
    piece.widthCm !== undefined && piece.lengthCm !== undefined
      ? t.piece.size
          .replace("{w}", String(piece.widthCm))
          .replace("{l}", String(piece.lengthCm))
      : undefined;

  return (
    <li className="border-line bg-surface rounded-md border p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onEdit}
        >
          <p className="text-small font-medium">{piece.name}</p>
          <p className="text-text-2 text-caption">
            {[counts, size].filter(Boolean).join(" · ")}
          </p>
        </button>
        <button
          type="button"
          aria-label={t.action.delete}
          className="text-text-3 hover:text-text -my-3 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-md transition"
          onClick={onDelete}
        >
          <X size={15} />
        </button>
      </div>

      {/* 어긋남은 양쪽 숫자를 함께 보여준다. "다시 계산하세요"만 말하면
          무엇이 얼마나 달라지는지 모른 채 누르게 된다. */}
      {drift && (
        <div className="border-line mt-2 border-t pt-2">
          <p className="text-hibernating text-caption font-medium">
            {t.piece.drift}
            {" · "}
            {[
              drift.stitches &&
                t.piece.driftStitches
                  .replace("{was}", String(drift.stitches.was))
                  .replace("{now}", String(drift.stitches.now)),
              drift.rows &&
                t.piece.driftRows
                  .replace("{was}", String(drift.rows.was))
                  .replace("{now}", String(drift.rows.now)),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Button
            variant="secondary"
            className="!text-caption mt-2 !min-h-9 !px-3"
            onClick={() =>
              void applyPieceCounts(
                piece.id,
                {
                  stitches: drift.stitches?.now ?? piece.stitches,
                  rows: drift.rows?.now ?? piece.rows,
                },
                gaugeId
              )
            }
          >
            <RefreshCw size={14} />
            {t.piece.recalc}
          </Button>
        </div>
      )}
    </li>
  );
}

/** 조각 하나를 만들거나 고친다. 치수를 넣으면 코수가 따라 계산된다. */
function PieceSheet({
  piece,
  gauge,
  onClose,
  onSubmit,
}: {
  piece?: ProjectPiece;
  gauge: Gauge | undefined;
  onClose: () => void;
  onSubmit: (values: PieceFormValues) => Promise<void>;
}) {
  const t = useStrings();
  const [name, setName] = useState(piece?.name ?? "");
  const [width, setWidth] = useState(piece?.widthCm?.toString() ?? "");
  const [length, setLength] = useState(piece?.lengthCm?.toString() ?? "");
  const [sts, setSts] = useState(piece?.stitches?.toString() ?? "");
  const [rows, setRows] = useState(piece?.rows?.toString() ?? "");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const num = (raw: string) => {
    const n = Number(raw);
    return raw.trim() === "" || Number.isNaN(n) ? undefined : n;
  };

  /* 치수를 넣으면 코수를 계산해 채운다. 사용자가 손으로 고친 값을 덮지
     않으려고 코수 칸이 비었을 때만 제안한다. */
  const derived = gauge
    ? pieceCounts({ widthCm: num(width), lengthCm: num(length) }, gauge)
    : {};
  const stsValue = sts !== "" ? sts : (derived.stitches?.toString() ?? "");
  const rowsValue = rows !== "" ? rows : (derived.rows?.toString() ?? "");

  async function handleSave() {
    const result = pieceFormSchema.safeParse({
      name,
      widthCm: num(width),
      lengthCm: num(length),
      stitches: num(stsValue),
      rows: num(rowsValue),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(result.data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={piece ? t.piece.edit : t.piece.add}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="shadow-overlay pb-safe bg-surface max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading mb-4 font-semibold">
          {piece ? t.piece.edit : t.piece.add}
        </h2>

        <TextField
          label={t.piece.name}
          placeholder={t.piece.namePlaceholder}
          value={name}
          error={error}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.piece.widthCm}
              inputMode="decimal"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.piece.lengthCm}
              inputMode="decimal"
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </div>
        </div>
        <p className="text-text-3 text-caption -mt-2 mb-4">
          {gauge ? t.piece.sizeHint : t.piece.needGauge}
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.piece.stitches}
              inputMode="numeric"
              value={stsValue}
              onChange={(e) => setSts(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.piece.rows}
              inputMode="numeric"
              value={rowsValue}
              onChange={(e) => setRows(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button block disabled={saving} onClick={() => void handleSave()}>
            {t.action.save}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
