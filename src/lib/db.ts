/**
 * 로컬 저장소 (IndexedDB / Dexie).
 *
 * MVP는 서버 없이 이 DB만으로 동작한다. 카운터는 비행기 모드에서도
 * 완전히 동작해야 하므로 로컬이 원본(source of truth)이고,
 * 2차의 Supabase 동기화는 이 위에 얹는 계층이다.
 */

import Dexie, { type EntityTable } from "dexie";
import type {
  BodyProfile,
  Counter,
  CounterMark,
  CounterSession,
  FroggingLog,
  GaugeRecord,
  Id,
  Needle,
  Pattern,
  Project,
  ProjectLog,
  ProjectPhoto,
  Yarn,
  YarnAllocation,
  YarnWeighIn,
} from "@/types/entities";

export class KnittinglogDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  projectPhotos!: EntityTable<ProjectPhoto, "id">;
  projectLogs!: EntityTable<ProjectLog, "id">;
  froggingLogs!: EntityTable<FroggingLog, "id">;

  counters!: EntityTable<Counter, "id">;
  counterMarks!: EntityTable<CounterMark, "id">;
  counterSessions!: EntityTable<CounterSession, "id">;

  gauges!: EntityTable<GaugeRecord, "id">;
  bodyProfiles!: EntityTable<BodyProfile, "id">;

  yarns!: EntityTable<Yarn, "id">;
  yarnAllocations!: EntityTable<YarnAllocation, "id">;
  yarnWeighIns!: EntityTable<YarnWeighIn, "id">;
  needles!: EntityTable<Needle, "id">;

  patterns!: EntityTable<Pattern, "id">;

  constructor() {
    super("knittinglog");

    // 인덱스는 실제 조회 경로만 건다.
    // 대시보드가 status로 거르고, 상세 화면들이 projectId로 모으고,
    // 통계가 날짜로 훑는다.
    this.version(1).stores({
      projects: "id, status, craft, updatedAt, pausedAt, finishedAt",
      projectPhotos: "id, projectId, takenAt",
      projectLogs: "id, projectId, date",
      froggingLogs: "id, projectId, date",

      counters: "id, projectId, sortOrder",
      counterMarks: "id, counterId, [counterId+kind], atRow",
      counterSessions: "id, counterId, projectId, startedAt",

      gauges: "id, projectId, yarnId",
      bodyProfiles: "id, name",

      yarns: "id, brand, weightClass, dyeLot",
      yarnAllocations: "id, yarnId, projectId",
      yarnWeighIns: "id, allocationId, date",
      needles: "id, craft, sizeMm, occupiedByProjectId",

      patterns: "id, craft, name",
    });
  }
}

export const db = new KnittinglogDB();

/* --- 저장 헬퍼 ------------------------------------------------------------ */

export const newId = (): Id => crypto.randomUUID();

/** 새 엔티티에 id·타임스탬프를 채운다 */
export function stamp<T extends object>(data: T) {
  const now = new Date();
  return { ...data, id: newId(), createdAt: now, updatedAt: now };
}

/** 수정 시 updatedAt을 갱신한다 — 2차 동기화의 충돌 판정 기준이 된다 */
export function touch<T extends object>(patch: T) {
  return { ...patch, updatedAt: new Date() };
}
