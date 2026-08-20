import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import type { Id, Needle } from "@/types/entities";

/* --- 입력 검증 ------------------------------------------------------------ */

export const needleFormSchema = z.object({
  craft: z.enum(["knit", "crochet"]),
  type: z.enum(["straight", "circular", "dpn", "hook"]),
  // 0.5mm 레이스 바늘부터 25mm 점보까지. 벗어나면 단위를 착각한 것이다.
  sizeMm: z.number().min(0.5, "바늘 굵기를 확인해주세요").max(30),
  /** 줄바늘 줄 길이. 막대·장갑바늘·코바늘에는 없다. */
  lengthCm: z.number().positive().max(200).optional(),
  material: z.string().trim().min(1).max(40).optional(),
});

export type NeedleFormValues = z.infer<typeof needleFormSchema>;

/* --- 조회 ----------------------------------------------------------------- */

/** 정렬은 domain/needle.ts가 맡는다 — 화면과 저장 계층이 같은 순서를 쓴다 */
export const listNeedles = () => db.needles.toArray();

export const getNeedle = (id: Id) => db.needles.get(id);

/** occupiedByProjectId에 인덱스가 있어 프로젝트별 조회가 훑기가 아니다 */
export const listNeedlesForProject = (projectId: Id) =>
  db.needles.where("occupiedByProjectId").equals(projectId).toArray();

/* --- 변경 ----------------------------------------------------------------- */

export async function createNeedle(values: NeedleFormValues): Promise<Id> {
  const parsed = needleFormSchema.parse(values);
  const needle = stamp(parsed);
  await db.needles.add(needle as Needle);
  return needle.id;
}

export const updateNeedle = (id: Id, values: NeedleFormValues) =>
  db.needles.update(id, touch(needleFormSchema.parse(values)));

export const deleteNeedle = (id: Id) => db.needles.delete(id);

/* --- 점유 ----------------------------------------------------------------- */

/**
 * 바늘을 이 프로젝트에 물린다.
 *
 * 다른 작품에 물려 있어도 막지 않는다. 바늘을 옮기는 건 현실에서 실제로 하는
 * 일이고(빼서 다른 작품에 꽂는다), 그 결과로 이전 작품이 바늘을 잃는 것도
 * 현실이다. 앱이 할 일은 막는 게 아니라 **옮기기 전에 알려주는 것**이다.
 * 경고는 화면에서 하고 여기서는 사실만 기록한다.
 */
export const occupyNeedle = (id: Id, projectId: Id) =>
  db.needles.update(id, touch({ occupiedByProjectId: projectId }));

export const releaseNeedle = (id: Id) =>
  db.needles.update(id, touch({ occupiedByProjectId: undefined }));

/**
 * 프로젝트에 물린 바늘을 모두 놓는다.
 *
 * 완성·풀어버림·삭제에서 부른다. 끝난 작품이 바늘을 계속 잡고 있으면 여유
 * 바늘 수가 틀리고, 그러면 충돌 경고가 늑대소년이 된다.
 */
export async function releaseNeedlesForProject(projectId: Id) {
  await db.needles
    .where("occupiedByProjectId")
    .equals(projectId)
    .modify((needle) => {
      needle.occupiedByProjectId = undefined;
      needle.updatedAt = new Date();
    });
}
