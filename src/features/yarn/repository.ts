import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import type { WeighIn } from "@/domain/yarn";
import type { Id, Yarn, YarnAllocation, YarnWeighIn } from "@/types/entities";

/* --- 입력 검증 ------------------------------------------------------------ */

/**
 * 빈 문자열은 저장하지 않는다 — "" 와 "입력 안 함"은 다르다.
 *
 * transform을 쓰지 않는다. transform은 입력 타입과 출력 타입을 갈라놓아서
 * 폼 상태 타입이 "모든 키가 있어야 하는" 형태로 굳는다. 빈 문자열은
 * 폼에서 undefined로 바꿔 넘긴다.
 */
const optionalText = z.string().trim().min(1).max(80).optional();

const optionalPositive = z.number().positive().optional();

export const yarnFormSchema = z.object({
  name: z.string().trim().min(1, "실 이름을 입력해주세요").max(80),
  brand: optionalText,
  colorName: optionalText,
  colorCode: optionalText,
  dyeLot: optionalText,
  fiber: optionalText,
  // 화면에 칠할 수 있는 값만 받는다. 색번(colorCode)과는 다른 것이다.
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "색상 형식이 올바르지 않습니다")
    .optional(),
  // CYC 0~7. 리터럴 유니온으로 좁혀야 엔티티의 YarnWeightClass와 맞는다.
  // z.number()로 두면 number가 되어 저장 계층에서 타입이 어긋난다.
  weightClass: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
    ])
    .optional(),
  skeinGrams: optionalPositive,
  skeinMeters: optionalPositive,
  skeinCount: z.number().int().min(0).max(9999),
  shop: optionalText,
  careLabel: z.string().trim().min(1).max(200).optional(),
});

export type YarnFormValues = z.infer<typeof yarnFormSchema>;

/* --- 조회 ----------------------------------------------------------------- */

export const listYarns = () =>
  db.yarns.orderBy("updatedAt").reverse().toArray();

export const getYarn = (id: Id) => db.yarns.get(id);

export const listAllocationsForYarn = (yarnId: Id) =>
  db.yarnAllocations.where("yarnId").equals(yarnId).toArray();

export const listAllocationsForProject = (projectId: Id) =>
  db.yarnAllocations.where("projectId").equals(projectId).toArray();

/**
 * 프로젝트에 물린 실들.
 *
 * 프로젝트 카드의 실 색 세로선과 복귀 브리핑의 "실 잔량"이 여기서 나온다.
 */
export async function yarnsForProject(projectId: Id): Promise<Yarn[]> {
  const allocations = await listAllocationsForProject(projectId);
  if (allocations.length === 0) return [];
  const yarns = await db.yarns.bulkGet(allocations.map((a) => a.yarnId));
  return yarns.filter((y): y is Yarn => Boolean(y));
}

/**
 * 여러 프로젝트의 대표 실 색을 한 번에 가져온다.
 *
 * 목록 화면에서 프로젝트마다 따로 조회하면 N+1이 된다.
 */
export async function projectColors(): Promise<Map<Id, string>> {
  const allocations = await db.yarnAllocations.toArray();
  if (allocations.length === 0) return new Map();

  const yarns = await db.yarns.bulkGet([
    ...new Set(allocations.map((a) => a.yarnId)),
  ]);
  const hexById = new Map(
    yarns.filter((y): y is Yarn => Boolean(y)).map((y) => [y.id, y.colorHex])
  );

  const colors = new Map<Id, string>();
  for (const allocation of allocations) {
    // 먼저 배정된 실을 대표색으로 삼는다. 색이 없는 실은 건너뛴다 —
    // UI가 임의의 색을 만들어내면 "실만 색을 갖는다"는 원칙이 깨진다.
    if (colors.has(allocation.projectId)) continue;
    const hex = hexById.get(allocation.yarnId);
    if (hex) colors.set(allocation.projectId, hex);
  }
  return colors;
}

/* --- 변경 ----------------------------------------------------------------- */

export async function createYarn(values: YarnFormValues): Promise<Id> {
  const parsed = yarnFormSchema.parse(values);
  const yarn = stamp(parsed);
  await db.yarns.add(yarn as unknown as Yarn);
  return yarn.id;
}

export async function updateYarn(id: Id, values: YarnFormValues) {
  const parsed = yarnFormSchema.parse(values);
  await db.yarns.update(id, touch(parsed));
}

export async function deleteYarn(id: Id) {
  // 배정도 함께 지운다. 남겨두면 없는 실을 가리키는 유령 배정이 된다.
  await db.transaction(
    "rw",
    [db.yarns, db.yarnAllocations, db.yarnWeighIns],
    async () => {
      const allocationIds = await db.yarnAllocations
        .where("yarnId")
        .equals(id)
        .primaryKeys();
      await db.yarnWeighIns.where("allocationId").anyOf(allocationIds).delete();
      await db.yarnAllocations.where("yarnId").equals(id).delete();
      await db.yarns.delete(id);
    }
  );
}

/* --- 배정 ----------------------------------------------------------------- */

export async function allocateYarn(
  yarnId: Id,
  projectId: Id,
  skeinsAllocated: number
) {
  const existing = await db.yarnAllocations
    .where("projectId")
    .equals(projectId)
    .filter((a) => a.yarnId === yarnId)
    .first();

  if (existing) {
    await db.yarnAllocations.update(existing.id, touch({ skeinsAllocated }));
    return existing.id;
  }

  const allocation = stamp({ yarnId, projectId, skeinsAllocated });
  await db.yarnAllocations.add(allocation as YarnAllocation);
  return allocation.id;
}

export async function deallocateYarn(yarnId: Id, projectId: Id) {
  const ids = await db.yarnAllocations
    .where("projectId")
    .equals(projectId)
    .filter((a) => a.yarnId === yarnId)
    .primaryKeys();
  await db.yarnWeighIns.where("allocationId").anyOf(ids).delete();
  await db.yarnAllocations.bulkDelete(ids);
}

/* --- 무게 재기 ------------------------------------------------------------ */

/**
 * 실 잔량 기록.
 *
 * 저울에 올려 남은 무게를 적는다. 두 번 이상 쌓이면 단당 소모량이 나오고,
 * 거기서 "이 실로 목표 단수까지 갈 수 있나"가 계산된다(기획 §3.10-3).
 * 한 번만 재면 소모량을 알 수 없으므로 화면이 두 번째 기록을 재촉해야 한다.
 *
 * `atRow`는 잰 시점의 단수다. 없으면 소모량 역산에 쓸 수 없어 목록에만 남는다.
 */
export const listWeighIns = (allocationId: Id) =>
  db.yarnWeighIns.where("allocationId").equals(allocationId).sortBy("date");

export async function addWeighIn(
  allocationId: Id,
  remainingGrams: number,
  atRow?: number,
  date = new Date()
): Promise<Id> {
  const weighIn = stamp({ allocationId, date, remainingGrams, atRow });
  await db.yarnWeighIns.add(weighIn as YarnWeighIn);
  return weighIn.id;
}

export const deleteWeighIn = (id: Id) => db.yarnWeighIns.delete(id);

/**
 * 소모량 역산에 쓸 수 있는 기록만 도메인 타입으로 옮긴다.
 *
 * 단수를 적지 않은 기록은 목록에는 남지만 계산에는 못 쓴다 — 언제 잰
 * 무게인지 모르면 단당 소모량이 나오지 않는다.
 */
export const measurableWeighIns = (weighIns: YarnWeighIn[]): WeighIn[] =>
  weighIns
    .filter((w) => w.atRow !== undefined)
    .map((w) => ({ remainingGrams: w.remainingGrams, atRow: w.atRow! }));
