import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import type { GaugeRecord, Id } from "@/types/entities";

/* --- 입력 검증 ------------------------------------------------------------ */

// 10cm당 코수·단수. 레이스 실이 40코, 점보 실이 4코 정도라 이 범위를 벗어나면
// 대개 단위를 착각한 것이다(4인치당 값을 넣었거나, 1cm당 값을 넣었거나).
/**
 * 10cm당 코수·단수.
 *
 * 비어 있을 때의 문구를 직접 준다. 기본 문구는 "expected number, received
 * undefined"인데, 스와치를 처음 재는 사람이 받을 말이 아니다.
 */
const perTenCm = z
  .number({ error: "10cm 안에서 센 수를 넣어주세요" })
  .positive("0보다 커야 해요")
  .max(100);

export const gaugeFormSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  pattern: z.string().trim().min(1).max(60).optional(),
  stitchesPer10cm: perTenCm,
  rowsPer10cm: perTenCm,
  /** 블로킹 후 실측. 없으면 블로킹 보정을 하지 않는다. */
  blockedStitchesPer10cm: perTenCm.optional(),
  blockedRowsPer10cm: perTenCm.optional(),
  yarnId: z.string().optional(),
  projectId: z.string().optional(),
  needleMm: z.number().positive().max(30).optional(),
});

export type GaugeFormValues = z.infer<typeof gaugeFormSchema>;

/* --- 조회 · 변경 ---------------------------------------------------------- */

// sortBy는 인덱스를 요구하지 않는다. 스와치 기록은 많아야 수십 개다.
export const listGauges = () =>
  db.gauges.toCollection().reverse().sortBy("updatedAt");

export const getGauge = (id: Id) => db.gauges.get(id);

export const listGaugesForProject = (projectId: Id) =>
  db.gauges.where("projectId").equals(projectId).toArray();

export async function createGauge(values: GaugeFormValues): Promise<Id> {
  const parsed = gaugeFormSchema.parse(values);
  const gauge = stamp(parsed);
  await db.gauges.add(gauge as unknown as GaugeRecord);
  return gauge.id;
}

export async function updateGauge(id: Id, values: GaugeFormValues) {
  const parsed = gaugeFormSchema.parse(values);
  await db.gauges.update(id, touch(parsed));
}

export const deleteGauge = (id: Id) => db.gauges.delete(id);
