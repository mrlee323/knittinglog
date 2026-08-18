import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import { parseYouTube } from "@/domain/youtube";
import type { Id, ProjectLink } from "@/types/entities";

/* --- 입력 검증 ------------------------------------------------------------ */

export const linkFormSchema = z.object({
  // 지금 재생할 수 있는 건 유튜브뿐이므로 다른 주소는 받지 않는다. 재생 안 되는
  // 링크가 목록에 섞이면 어느 게 눌러지는 링크인지 매번 확인해야 한다.
  url: z
    .string()
    .trim()
    .min(1)
    .refine((value) => parseYouTube(value) !== null, {
      message: "유튜브 주소가 아니에요",
    }),
  title: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

export type LinkFormValues = z.infer<typeof linkFormSchema>;

/* --- 조회 · 변경 ---------------------------------------------------------- */

/** 먼저 붙인 것이 위에. 참고 자료는 모은 순서가 곧 맥락이다. */
export const listLinks = (projectId: Id) =>
  db.projectLinks.where("projectId").equals(projectId).sortBy("createdAt");

export async function addLink(
  projectId: Id,
  values: LinkFormValues
): Promise<Id> {
  const parsed = linkFormSchema.parse(values);
  const link = stamp({ ...parsed, projectId });
  await db.projectLinks.add(link as ProjectLink);
  return link.id;
}

export const updateLink = (id: Id, values: LinkFormValues) =>
  db.projectLinks.update(id, touch(linkFormSchema.parse(values)));

/** 재생해보고 알게 된 사실을 기억해둔다 — 다음부터는 시도하지 않는다 */
export const markEmbedBlocked = (id: Id) =>
  db.projectLinks.update(id, touch({ embedBlocked: true }));

export const deleteLink = (id: Id) => db.projectLinks.delete(id);
