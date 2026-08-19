import { z } from "zod";
import { db, stamp, touch } from "@/lib/db";
import {
  statusPatch,
  type ProjectEvent,
  type ProjectEventType,
} from "@/domain/projectStatus";
import { counterBlueprints } from "@/domain/counter";
import {
  createCountersFromBlueprints,
  listCounters,
} from "@/features/counter/repository";
import type { Id, PauseEvent, Project, ProjectStatus } from "@/types/entities";

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

  // 프로젝트 갱신과 이력 기록을 한 트랜잭션으로 묶는다. 따로 커밋되면
  // 그 사이에 앱이 죽었을 때 상태와 이력이 어긋난 채로 남는다.
  await db.transaction("rw", [db.projects, db.pauseEvents], async () => {
    await db.projects.update(id, touch(patch));

    if (event.type === "PAUSE") {
      await db.pauseEvents.add(
        stamp({
          projectId: id,
          reason: event.reason,
          note: event.note,
          pausedAt: patch.pausedAt ?? new Date(),
        }) as PauseEvent
      );
      return;
    }

    // 멈춤을 벗어나는 전이는 열려 있는 이력을 닫는다. 어떻게 끝났는지가
    // 사유별 횟수보다 쓸모 있는 정보다 — 그 사유로 멈춘 것이 돌아왔는지.
    const endedBy = CLOSES_PAUSE[event.type];
    if (!endedBy) return;

    const open = await openPauseEvent(id);
    if (open) {
      await db.pauseEvents.update(
        open.id,
        touch({ endedAt: new Date(), endedBy })
      );
    }
  });

  return patch.status;
}

/** 멈춤 이력을 닫는 전이와, 그때 기록할 결말 */
const CLOSES_PAUSE: Partial<Record<ProjectEventType, PauseEvent["endedBy"]>> = {
  RESUME: "resumed",
  FINISH: "finished",
  FROG: "frogged",
};

/**
 * 아직 닫히지 않은 중단 이력.
 *
 * 정상적으로는 프로젝트당 하나뿐이다. 여러 개가 남아 있다면 과거의 버그이므로
 * 가장 최근 것을 닫는다 — 오래된 것을 닫으면 최신 상태와 더 어긋난다.
 */
async function openPauseEvent(projectId: Id) {
  const events = await db.pauseEvents
    .where("projectId")
    .equals(projectId)
    .filter((e) => !e.endedAt)
    .toArray();
  if (events.length === 0) return null;
  return events.reduce((latest, e) =>
    e.pausedAt.getTime() > latest.pausedAt.getTime() ? e : latest
  );
}

/** 프로젝트의 중단 이력을 최근 것부터 */
export const listPauseEvents = (projectId: Id) =>
  db.pauseEvents
    .where("projectId")
    .equals(projectId)
    .reverse()
    .sortBy("pausedAt");

/**
 * 같은 작품을 다시 뜬다.
 *
 * 다른 색으로 한 번 더 뜨는 건 뜨개에서 흔한 일이고, 그때 매번 다시 하는 게
 * 카운터 만들기와 치수 계산이다. 그래서 이름·기법·종류·메모와 카운터 구성
 * (목표 단수·무늬 반복·연동)을 그대로 가져온다.
 *
 * 가져오지 않는 것도 의도다. **실은 물려주지 않는다** — 색을 바꾸려고 다시
 * 뜨는 것이므로 지난 실을 배정해두면 지우는 일이 하나 더 생긴다. 사진과
 * 기록도 옮기지 않는다. 그건 지난 작품의 것이고, 필요하면 이어받은 표시를
 * 따라가면 된다.
 *
 * 게이지는 참조만 물려준다. 실이 바뀌면 게이지도 달라지니 새 스와치를 뜨는
 * 게 맞지만, 지난번 값이 출발점으로는 가장 낫다.
 */
export async function restartProject(sourceId: Id): Promise<Id> {
  const source = await db.projects.get(sourceId);
  if (!source) throw new Error(`프로젝트를 찾을 수 없습니다: ${sourceId}`);

  // 같은 원본에서 몇 번째로 이어받은 것인지 세어 이름을 붙인다.
  // 인덱스를 걸지 않은 필드라 전체를 훑지만, 프로젝트는 많아야 수십 개다.
  const siblings = await db.projects
    .filter((p) => p.derivedFromProjectId === sourceId)
    .count();

  const copy = stamp({
    name: `${source.name} (${siblings + 2})`,
    craft: source.craft,
    category: source.category,
    notes: source.notes,
    gaugeId: source.gaugeId,
    patternId: source.patternId,
    derivedFromProjectId: sourceId,
    // 뜨기 시작하는 건 별도의 행동이다 — createProject와 같은 규칙
    status: "planning" as const,
  });
  await db.projects.add(copy as Project);

  const counters = await listCounters(sourceId);
  await createCountersFromBlueprints(copy.id, counterBlueprints(counters));

  return copy.id;
}

export async function deleteProject(id: Id) {
  // 프로젝트에 매달린 기록을 함께 지운다. 고아 레코드가 통계를 오염시킨다.
  // 카운터는 마크·세션을 다시 물고 있으므로 두 단계로 내려간다.
  await db.transaction(
    "rw",
    [
      db.projects,
      db.projectLinks,
      db.projectPhotos,
      db.projectLogs,
      db.patternDocs,
      db.froggingLogs,
      db.pauseEvents,
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
      await db.projectLinks.where("projectId").equals(id).delete();
      await db.projectPhotos.where("projectId").equals(id).delete();
      await db.projectLogs.where("projectId").equals(id).delete();
      await db.froggingLogs.where("projectId").equals(id).delete();
      await db.pauseEvents.where("projectId").equals(id).delete();
      // PDF 도안은 용량이 크다 — 남겨두면 지운 프로젝트가 저장 공간을 계속 쥔다
      await db.patternDocs.where("projectId").equals(id).delete();
      await db.projects.delete(id);
    }
  );
}
