import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import { statusPatch, type ProjectEvent } from "@/domain/projectStatus";
import type { Id, Project, ProjectStatus } from "@/types/entities";

/* --- 입력 검증 ------------------------------------------------------------ */

export const projectFormSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(80),
  craft: z.enum(["knit", "crochet"]),
  category: z.enum([
    "sweater",
    "hat",
    "socks",
    "shawl",
    "bag",
    "blanket",
    "accessory",
    "other",
  ]),
  notes: z.string().trim().max(2000).optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/* --- 조회 ----------------------------------------------------------------- */

export function listProjects(status?: ProjectStatus) {
  const table = db.projects;
  const query = status
    ? table.where("status").equals(status)
    : table.toCollection();
  return query.reverse().sortBy("updatedAt");
}

export const getProject = (id: Id) => db.projects.get(id);

/** 대시보드·목록의 상태별 뱃지 숫자 */
export async function countByStatus(): Promise<Record<ProjectStatus, number>> {
  const counts: Record<ProjectStatus, number> = {
    planning: 0,
    active: 0,
    hibernating: 0,
    finished: 0,
    frogged: 0,
  };
  await db.projects.each((p) => {
    counts[p.status] += 1;
  });
  return counts;
}

/* --- 변경 ----------------------------------------------------------------- */

export async function createProject(values: ProjectFormValues): Promise<Id> {
  const parsed = projectFormSchema.parse(values);
  // 새 프로젝트는 항상 계획중에서 시작한다. 뜨기 시작하는 건 별도의 행동이다.
  const project = stamp({ ...parsed, status: "planning" as const });
  await db.projects.add(project as Project);
  return project.id;
}

export async function updateProject(id: Id, values: ProjectFormValues) {
  const parsed = projectFormSchema.parse(values);
  await db.projects.update(id, touch(parsed));
}

/**
 * 상태를 전이시킨다.
 *
 * 허용되지 않는 전이는 조용히 무시하지 않고 던진다 — UI가 불가능한 버튼을
 * 애초에 보여주지 않으므로, 여기 도달했다면 버그다.
 */
export async function applyEvent(id: Id, event: ProjectEvent) {
  const project = await db.projects.get(id);
  if (!project) throw new Error(`프로젝트를 찾을 수 없습니다: ${id}`);

  const patch = statusPatch(project, event);
  if (!patch) {
    throw new Error(
      `${project.status} 상태에서는 ${event.type} 할 수 없습니다`
    );
  }

  await db.projects.update(id, touch(patch));
  return patch.status;
}

export async function deleteProject(id: Id) {
  // 프로젝트에 매달린 기록을 함께 지운다. 고아 레코드가 통계를 오염시킨다.
  // 카운터는 마크·세션을 다시 물고 있으므로 두 단계로 내려간다.
  await db.transaction(
    "rw",
    [
      db.projects,
      db.projectPhotos,
      db.projectLogs,
      db.froggingLogs,
      db.counters,
      db.counterMarks,
      db.counterSessions,
    ],
    async () => {
      const counterIds = await db.counters
        .where("projectId")
        .equals(id)
        .primaryKeys();

      await db.counterMarks.where("counterId").anyOf(counterIds).delete();
      await db.counterSessions.where("projectId").equals(id).delete();
      await db.counters.where("projectId").equals(id).delete();
      await db.projectPhotos.where("projectId").equals(id).delete();
      await db.projectLogs.where("projectId").equals(id).delete();
      await db.froggingLogs.where("projectId").equals(id).delete();
      await db.projects.delete(id);
    }
  );
}
