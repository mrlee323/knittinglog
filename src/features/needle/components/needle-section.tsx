import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { isFree, isTakenByOther, sortNeedles } from "@/domain/needle";
import { findNeedle } from "@/domain/units";
import { listGaugesForProject } from "@/features/gauge/repository";
import {
  NeedleDetail,
  NeedleSize,
} from "@/features/needle/components/needle-label";
import { NeedleFormSheet } from "@/features/needle/components/needle-form-sheet";
import {
  createNeedle,
  listNeedles,
  occupyNeedle,
  releaseNeedle,
  type NeedleFormValues,
} from "@/features/needle/repository";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id, Needle } from "@/types/entities";

/**
 * 프로젝트에 물린 바늘.
 *
 * 실 배정과 나란히 두지만 성질이 다르다. 실은 나눠 쓸 수 있고 더 사면 되는데,
 * 바늘은 하나를 한 곳에만 물린다. 그래서 이 섹션의 일은 배정이 아니라
 * **충돌을 드러내는 것**이다 — 새 작품을 시작할 때 그 굵기가 이미 다른 작품에
 * 물려 있다는 사실이 "바늘 뺏김" 중단의 실체다(기획 §3.5).
 */
export function NeedleSection({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const needles = useLiveQuery(() => listNeedles(), []);
  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const gauges = useLiveQuery(
    () => listGaugesForProject(projectId),
    [projectId]
  );

  const [picking, setPicking] = useState(false);
  const [confirmMove, setConfirmMove] = useState<Needle>();
  const [adding, setAdding] = useState(false);

  if (!needles || !projects) return null;

  const mine = needles.filter((n) => n.occupiedByProjectId === projectId);
  // 게이지에 적힌 바늘 굵기가 이 프로젝트가 요구하는 굵기다. 스와치를 뜰 때
  // 쓴 바늘이므로 그 굵기로 떠야 게이지가 맞는다.
  const wantedMm = gauges?.find((g) => g.needleMm)?.needleMm;

  /**
   * 서랍에 없는 바늘을 여기서 등록하고 바로 물린다.
   *
   * 전에는 서랍이 비어 있으면 이 버튼이 아예 눌리지 않았다. "먼저 바늘을
   * 등록해주세요"라고만 하고 끝났는데, 그러면 바늘 화면으로 갔다가 등록하고
   * 프로젝트로 돌아와야 한다 — 의도가 생긴 자리에서 막다른 길이다.
   *
   * 등록만 하고 마는 것도 아니다. 여기서 넣은 바늘은 서랍에도 남는다. 프로젝트
   * 안에서만 아는 바늘이 생기면 다음 작품에서 충돌 경고를 할 수 없다.
   */
  async function addAndAssign(values: NeedleFormValues) {
    const id = await createNeedle(values);
    await occupyNeedle(id, projectId);
    setAdding(false);
    setPicking(false);
  }

  async function assign(needle: Needle) {
    if (isTakenByOther(needle, projectId)) {
      setConfirmMove(needle);
      return;
    }
    await occupyNeedle(needle.id, projectId);
    setPicking(false);
  }

  return (
    <section className="border-line mb-6 border-t pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t.needle.projectTitle}</h2>
        <Button
          icon
          variant="ghost"
          aria-label={t.needle.assign}
          onClick={() =>
            needles.length === 0 ? setAdding(true) : setPicking(true)
          }
        >
          <Plus size={18} />
        </Button>
      </div>

      {mine.length === 0 ? (
        <p className="text-text-3 text-small">
          {needles.length === 0 ? t.needle.noneAddHere : t.needle.none}
        </p>
      ) : (
        <ul className="space-y-2">
          {sortNeedles(mine).map((needle) => (
            <li
              key={needle.id}
              className="border-line flex items-center gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <NeedleSize needle={needle} />
                <span className="mt-0.5 block">
                  <NeedleDetail needle={needle} />
                </span>
              </div>
              <Button
                icon
                variant="ghost"
                aria-label={t.needle.release}
                onClick={() => void releaseNeedle(needle.id)}
              >
                <X size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* 게이지가 요구하는 굵기를 갖고 있는지 알려준다. 없으면 그것도 정보다 —
          사야 한다는 뜻이고, 그걸 뜨기 시작한 뒤에 알면 늦다. */}
      {wantedMm !== undefined && !mine.some((n) => n.sizeMm === wantedMm) && (
        <p className="text-text-2 text-caption mt-3">
          {t.needle.gaugeSuggest.replace("{mm}", String(wantedMm))}
          {!needles.some((n) => n.sizeMm === wantedMm) && (
            <>
              {" · "}
              <span className="text-hibernating">
                {t.needle.gaugeMissing.replace("{mm}", String(wantedMm))}
              </span>
            </>
          )}
        </p>
      )}

      {/* 경고가 뜨는 동안에는 고르기 목록을 접는다. 다이얼로그가 두 겹으로
          겹치면 어느 쪽의 취소를 누른 건지 알 수 없다. 경고를 취소하면
          고르기로 돌아온다 — picking은 그대로 살아 있다. */}
      {adding && (
        <NeedleFormSheet
          existing={needles}
          onSubmit={addAndAssign}
          onCancel={() => setAdding(false)}
        />
      )}

      {picking && !confirmMove && !adding && (
        <NeedlePicker
          needles={needles}
          projectId={projectId}
          projectName={(id) => projects.find((p) => p.id === id)?.name ?? ""}
          wantedMm={wantedMm}
          onPick={(needle) => void assign(needle)}
          onAddNew={() => setAdding(true)}
          onCancel={() => setPicking(false)}
        />
      )}

      {confirmMove && (
        <ConfirmSheet
          title={t.needle.takenTitle}
          description={t.needle.takenBody.replace(
            "{project}",
            projects.find((p) => p.id === confirmMove.occupiedByProjectId)
              ?.name ?? ""
          )}
          confirmLabel={t.needle.takenConfirm}
          onCancel={() => setConfirmMove(undefined)}
          onConfirm={() => {
            void occupyNeedle(confirmMove.id, projectId);
            setConfirmMove(undefined);
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}

/**
 * 바늘 고르기.
 *
 * 물린 바늘을 목록에서 지우지 않는다. 지우면 "그 굵기가 없다"와 "있지만 다른
 * 작품에 물려 있다"가 같아 보이는데, 둘은 완전히 다른 상황이다. 대신 어디에
 * 물려 있는지 적고 누르면 옮길지 묻는다.
 */
function NeedlePicker({
  needles,
  projectId,
  projectName,
  wantedMm,
  onPick,
  onAddNew,
  onCancel,
}: {
  needles: Needle[];
  projectId: Id;
  projectName: (id: string) => string;
  wantedMm?: number;
  onPick: (needle: Needle) => void;
  onAddNew: () => void;
  onCancel: () => void;
}) {
  const t = useStrings();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.needle.pick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="shadow-overlay pb-safe bg-surface max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-lg p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading mb-4 font-semibold">{t.needle.pick}</h2>

        <ul className="space-y-1.5">
          {sortNeedles(needles)
            .filter((n) => n.occupiedByProjectId !== projectId)
            .map((needle) => {
              const taken = isTakenByOther(needle, projectId);
              // 게이지가 요구하는 굵기를 눈에 띄게 한다. 서랍에 바늘이 스무 개
              // 있으면 목록을 훑는 것 자체가 일이다.
              const wanted =
                wantedMm !== undefined &&
                findNeedle(needle.sizeMm, needle.craft)?.mm ===
                  findNeedle(wantedMm, needle.craft)?.mm;

              return (
                <li key={needle.id}>
                  <button
                    type="button"
                    onClick={() => onPick(needle)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border p-3 text-left transition",
                      wanted
                        ? "border-accent bg-sunken"
                        : "border-line hover:border-line-strong"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <NeedleSize needle={needle} />
                      <span className="mt-0.5 block">
                        <NeedleDetail needle={needle} />
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-caption shrink-0",
                        isFree(needle) ? "text-text-3" : "text-hibernating"
                      )}
                    >
                      {taken
                        ? t.needle.inUse.replace(
                            "{project}",
                            projectName(needle.occupiedByProjectId ?? "")
                          )
                        : t.needle.free}
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>

        {/* 서랍에 없는 바늘을 방금 샀을 수도 있다. 목록에 없다고 여기서
            끝나면 다시 바늘 화면으로 갔다 와야 한다. */}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={onAddNew}>
            <Plus size={16} />
            {t.needle.addHere}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
