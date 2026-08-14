import { db, stamp, touch } from "@/lib/db";
import {
  applyStep,
  reconcileLinked,
  type CounterRecord,
} from "@/domain/counter";
import type {
  Counter,
  CounterMark,
  CounterSession,
  Id,
} from "@/types/entities";

/* --- 조회 ----------------------------------------------------------------- */

export function listCounters(projectId: Id) {
  return db.counters.where("projectId").equals(projectId).sortBy("sortOrder");
}

export function listMarks(counterId: Id) {
  return db.counterMarks.where("counterId").equals(counterId).sortBy("atRow");
}

export async function lifelineRows(counterId: Id): Promise<number[]> {
  const marks = await db.counterMarks
    .where("[counterId+kind]")
    .equals([counterId, "lifeline"])
    .toArray();
  return marks.map((m) => m.atRow).sort((a, b) => a - b);
}

/* --- 카운터 --------------------------------------------------------------- */

export interface CounterInput {
  label: string;
  target?: number;
  repeatLength?: number;
  repeatTarget?: number;
  linkedCounterId?: Id;
  linkRatio?: number;
}

export async function createCounter(projectId: Id, input: CounterInput) {
  const existing = await db.counters
    .where("projectId")
    .equals(projectId)
    .count();
  const counter = stamp({
    ...input,
    projectId,
    value: 0,
    sortOrder: existing,
  });
  await db.counters.add(counter as Counter);
  return counter.id;
}

export async function updateCounter(id: Id, patch: Partial<CounterInput>) {
  await db.counters.update(id, touch(patch));
  // 연동 설정이 바뀌면 값이 어긋날 수 있으니 즉시 다시 맞춘다
  const counter = await db.counters.get(id);
  if (counter) await reconcileProject(counter.projectId);
}

export async function deleteCounter(id: Id) {
  await db.transaction(
    "rw",
    [db.counters, db.counterMarks, db.counterSessions],
    async () => {
      const counter = await db.counters.get(id);
      if (!counter) return;

      await db.counterMarks.where("counterId").equals(id).delete();
      await db.counterSessions.where("counterId").equals(id).delete();

      // 이 카운터를 따라가던 연동을 끊는다. 끊지 않으면 유령 참조가 남고
      // 연동 카운터가 영원히 0에 멈춘 채 이유를 알 수 없게 된다.
      await db.counters
        .where("projectId")
        .equals(counter.projectId)
        .modify((c) => {
          if (c.linkedCounterId === id) {
            c.linkedCounterId = undefined;
            c.linkRatio = undefined;
            c.linkOffset = undefined;
          }
        });

      await db.counters.delete(id);
    }
  );
}

const toRecord = (c: Counter): CounterRecord => ({
  id: c.id,
  value: c.value,
  target: c.target,
  repeatLength: c.repeatLength,
  repeatTarget: c.repeatTarget,
  linkedCounterId: c.linkedCounterId,
  linkRatio: c.linkRatio,
  linkOffset: c.linkOffset,
});

/**
 * 카운터를 증감한다.
 *
 * 연동 카운터까지 한 트랜잭션으로 쓴다. 둘이 따로 커밋되면 앱이 그 사이에
 * 죽었을 때 메인과 서브가 어긋난 채로 남는다.
 */
export async function step(projectId: Id, counterId: Id, delta: number) {
  return db.transaction("rw", db.counters, async () => {
    const counters = await db.counters
      .where("projectId")
      .equals(projectId)
      .toArray();
    const updates = applyStep(counters.map(toRecord), counterId, delta);

    for (const update of updates) {
      await db.counters.update(update.id, touch({ value: update.value }));
    }
    return updates;
  });
}

/**
 * 여러 카운터 값을 한 번에 되돌린다 — 되돌리기(undo) 전용.
 *
 * 증감이 아니라 절대값 복원이다. 되돌리기 시점에 연동 카운터의 이전 값도
 * 함께 넘어오므로 메인만 되돌아가 어긋나는 일이 없다.
 */
export async function restoreValues(updates: { id: Id; value: number }[]) {
  await db.transaction("rw", db.counters, async () => {
    for (const update of updates) {
      await db.counters.update(update.id, touch({ value: update.value }));
    }
  });
}

/** 값을 직접 입력해서 맞출 때 (오래 방치 후 실물과 대조하는 경우) */
export async function setValue(projectId: Id, counterId: Id, value: number) {
  await db.counters.update(
    counterId,
    touch({ value: Math.max(0, Math.floor(value)) })
  );
  await reconcileProject(projectId);
}

/** 연동 카운터 값을 메인 기준으로 다시 맞춘다 */
export async function reconcileProject(projectId: Id) {
  const counters = await db.counters
    .where("projectId")
    .equals(projectId)
    .toArray();
  const updates = reconcileLinked(counters.map(toRecord));
  for (const update of updates) {
    await db.counters.update(update.id, touch({ value: update.value }));
  }
  return updates;
}

/* --- 마크 · 생명줄 -------------------------------------------------------- */

export async function addMark(
  counterId: Id,
  atRow: number,
  kind: CounterMark["kind"],
  note?: string,
  stitchCount?: number
) {
  const mark = stamp({ counterId, atRow, kind, note, stitchCount });
  await db.counterMarks.add(mark as CounterMark);
  return mark.id;
}

export const deleteMark = (id: Id) => db.counterMarks.delete(id);

/* --- 세션 ----------------------------------------------------------------- */

/**
 * 뜨기 세션. 카운터 화면을 여는 순간 시작한다.
 *
 * 뜬 시간과 속도의 원천이고, 완성 예상일(기획 §3.10-4)이 여기서 나온다.
 */
export async function startSession(projectId: Id, counterId: Id) {
  const session = stamp({
    projectId,
    counterId,
    startedAt: new Date(),
    rowsAdded: 0,
  });
  await db.counterSessions.add(session as CounterSession);
  return session.id;
}

export async function endSession(id: Id, rowsAdded: number) {
  // 한 단도 안 뜬 세션은 남기지 않는다 — 화면만 열었다 닫은 것이다
  if (rowsAdded <= 0) {
    await db.counterSessions.delete(id);
    return;
  }
  await db.counterSessions.update(
    id,
    touch({ endedAt: new Date(), rowsAdded })
  );
}

export function listSessions(projectId: Id) {
  return db.counterSessions.where("projectId").equals(projectId).toArray();
}
