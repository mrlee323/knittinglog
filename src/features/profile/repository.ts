import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import { MEASUREMENT_KEYS } from "@/domain/body";
import type { BodyProfile, Id } from "@/types/entities";

/* --- 입력 검증 ------------------------------------------------------------ */

// 사람 몸 치수는 cm 기준으로 이 범위를 벗어나지 않는다.
// 상한을 두는 건 단위를 착각해 인치 값을 그대로 넣는 실수를 잡기 위해서다.
const measurement = z.number().positive().max(300).optional();

export const profileFormSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(40),
  measurements: z.object(
    Object.fromEntries(
      MEASUREMENT_KEYS.map((key) => [key, measurement])
    ) as Record<(typeof MEASUREMENT_KEYS)[number], typeof measurement>
  ),
  /** 음수 허용 — 몸에 붙는 옷은 몸보다 작게 뜬다 */
  preferredEaseCm: z.number().min(-30).max(60).optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

/* --- 조회 · 변경 ---------------------------------------------------------- */

export const listProfiles = () => db.bodyProfiles.orderBy("name").toArray();

export const getProfile = (id: Id) => db.bodyProfiles.get(id);

export async function createProfile(values: ProfileFormValues): Promise<Id> {
  const parsed = profileFormSchema.parse(values);
  const profile = stamp(parsed);
  await db.bodyProfiles.add(profile as BodyProfile);
  return profile.id;
}

export async function updateProfile(id: Id, values: ProfileFormValues) {
  const parsed = profileFormSchema.parse(values);
  await db.bodyProfiles.update(id, touch(parsed));
}

export async function deleteProfile(id: Id) {
  // 프로젝트가 받는 사람으로 이 프로필을 가리키고 있으면 참조를 끊는다.
  // 프로젝트까지 지우면 안 된다 — 선물 대상이 바뀌는 것뿐이다.
  await db.transaction("rw", [db.bodyProfiles, db.projects], async () => {
    // where()가 아니라 filter()를 쓴다. recipientProfileId는 인덱스가 없고,
    // 이 경로는 드물게 도는 데다 프로젝트 수도 적어서 인덱스를 늘릴 이유가 없다.
    await db.projects
      .filter((p) => p.recipientProfileId === id)
      .modify((p) => {
        p.recipientProfileId = undefined;
      });
    await db.bodyProfiles.delete(id);
  });
}
