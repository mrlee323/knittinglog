import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import type { Id, ProjectPiece } from "@/types/entities";
import type { PieceKind } from "@/domain/piece";

/* --- 입력 검증 ------------------------------------------------------------ */

const positive = z.number().positive().max(100_000).optional();

export const pieceFormSchema = z.object({
  name: z.string().trim().min(1, "조각 이름을 입력해주세요").max(40),
  widthCm: positive,
  lengthCm: positive,
  stitches: positive,
  rows: positive,
});

export type PieceFormValues = z.infer<typeof pieceFormSchema>;

/* --- 조회 ----------------------------------------------------------------- */

export const listPieces = (projectId: Id) =>
  db.projectPieces.where("projectId").equals(projectId).sortBy("sortOrder");

export const getPiece = (id: Id) => db.projectPieces.get(id);

/* --- 변경 ----------------------------------------------------------------- */

/**
 * 조각을 만든다.
 *
 * `sortOrder`는 뜨는 순서다. 끝에 붙이므로 이미 있는 개수를 센다 — 조각은
 * 프로젝트당 많아야 몇 개라서 세어도 싸다.
 */
export async function createPiece(
  projectId: Id,
  values: PieceFormValues & { kind?: PieceKind; gaugeId?: Id }
): Promise<Id> {
  const parsed = pieceFormSchema.parse(values);
  const existing = await db.projectPieces
    .where("projectId")
    .equals(projectId)
    .count();

  const piece = stamp({
    ...parsed,
    kind: values.kind,
    gaugeId: values.gaugeId,
    projectId,
    sortOrder: existing,
  });
  await db.projectPieces.add(piece as ProjectPiece);
  return piece.id;
}

export async function updatePiece(
  id: Id,
  values: PieceFormValues & { gaugeId?: Id }
) {
  const parsed = pieceFormSchema.parse(values);
  await db.projectPieces.update(
    id,
    touch({ ...parsed, gaugeId: values.gaugeId })
  );
}

/**
 * 어긋난 코수를 지금 게이지 값으로 맞춘다.
 *
 * 치수는 건드리지 않는다 — 뜻은 그대로고 답만 바뀐 것이다. 어떤 게이지로
 * 계산했는지 함께 갱신해야 다음 어긋남을 판정할 수 있다.
 */
export const applyPieceCounts = (
  id: Id,
  counts: { stitches?: number; rows?: number },
  gaugeId?: Id
) => db.projectPieces.update(id, touch({ ...counts, gaugeId }));

export const deletePiece = (id: Id) => db.projectPieces.delete(id);
