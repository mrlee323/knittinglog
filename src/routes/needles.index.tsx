import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { CardGrid, Page } from "@/components/ui/page";
import { isFree, sortNeedles, tally } from "@/domain/needle";
import { MaterialTabs } from "@/features/needle/components/material-tabs";
import { NeedleFormSheet } from "@/features/needle/components/needle-form-sheet";
import {
  NeedleDetail,
  NeedleSize,
} from "@/features/needle/components/needle-label";
import {
  createNeedle,
  deleteNeedle,
  listNeedles,
  updateNeedle,
} from "@/features/needle/repository";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Needle } from "@/types/entities";

export const Route = createFileRoute("/needles/")({ component: Needles });

/**
 * 바늘 서랍.
 *
 * 바늘은 이 앱에서 유일하게 하나뿐인 자원이다. 실은 더 사면 되지만 4.0mm 80cm
 * 줄바늘은 한 곳에만 물린다. 그래서 이 화면의 중심은 개수가 아니라 **어디에
 * 물려 있는지**다 — "바늘 뺏김"은 기획이 꼽은 실제 중단 사유다(§3.5).
 */
function Needles() {
  const t = useStrings();
  const needles = useLiveQuery(() => listNeedles(), []);
  // 물린 프로젝트 이름을 보여주려면 프로젝트가 필요하다. 바늘마다 따로
  // 조회하면 N+1이라 한 번 읽어 나눠 쓴다.
  const projects = useLiveQuery(() => db.projects.toArray(), []);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Needle>();
  const [pendingDelete, setPendingDelete] = useState<Needle>();

  if (!needles || !projects) return null;

  const counts = tally(needles);
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;

  return (
    <Page
      wide
      title={t.needle.title}
      action={
        <Button icon aria-label={t.needle.add} onClick={() => setAdding(true)}>
          <Plus size={18} />
        </Button>
      }
    >
      <MaterialTabs />

      {needles.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.needle.empty}</p>
          <p className="text-text-3 text-small mx-auto mt-1 max-w-sm text-balance">
            {t.needle.emptyHint}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setAdding(true)}
          >
            {t.needle.add}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-text-2 text-small mb-3">
            {t.needle.tally
              .replace("{total}", String(counts.total))
              .replace("{free}", String(counts.free))}
          </p>

          <CardGrid columns={3}>
            {sortNeedles(needles).map((needle) => {
              const holder = projectName(needle.occupiedByProjectId);
              return (
                <li key={needle.id}>
                  <div className="border-line bg-surface flex h-full flex-col gap-2 rounded-md border p-4">
                    <button
                      type="button"
                      onClick={() => setEditing(needle)}
                      className="text-left"
                    >
                      <NeedleSize needle={needle} />
                      <span className="mt-0.5 block">
                        <NeedleDetail needle={needle} />
                      </span>
                    </button>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      {/* 물린 곳으로 바로 갈 수 있어야 한다. "이 바늘 어디
                          갔지"의 답이 프로젝트 이름이고, 대개 그다음 행동은
                          그 작품을 열어보는 것이다. */}
                      {needle.occupiedByProjectId && holder ? (
                        <Link
                          to="/projects/$projectId"
                          params={{ projectId: needle.occupiedByProjectId }}
                          className="text-hibernating text-caption min-w-0 truncate underline"
                        >
                          {t.needle.inUse.replace("{project}", holder)}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "text-caption",
                            isFree(needle) ? "text-text-3" : "text-hibernating"
                          )}
                        >
                          {t.needle.free}
                        </span>
                      )}
                      <Button
                        icon
                        variant="ghost"
                        aria-label={t.action.delete}
                        onClick={() => setPendingDelete(needle)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </CardGrid>
        </>
      )}

      {(adding || editing) && (
        <NeedleFormSheet
          initial={editing}
          existing={needles}
          onCancel={() => {
            setAdding(false);
            setEditing(undefined);
          }}
          onSubmit={async (values) => {
            if (editing) await updateNeedle(editing.id, values);
            else await createNeedle(values);
            setAdding(false);
            setEditing(undefined);
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmSheet
          title={t.needle.deleteConfirm}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => {
            void deleteNeedle(pendingDelete.id);
            setPendingDelete(undefined);
          }}
        />
      )}
    </Page>
  );
}
