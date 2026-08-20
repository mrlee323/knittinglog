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
  ColorChartRecord,
  Inspiration,
  PatternDoc,
  StitchChartRecord,
  Counter,
  CounterMark,
  CounterSession,
  FroggingLog,
  GaugeRecord,
  Id,
  Needle,
  PauseEvent,
  Pattern,
  Project,
  ProjectLink,
  ProjectLog,
  ProjectPhoto,
  Yarn,
  YarnAllocation,
  YarnWeighIn,
} from "@/types/entities";

export class KnittinglogDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  projectLinks!: EntityTable<ProjectLink, "id">;
  projectPhotos!: EntityTable<ProjectPhoto, "id">;
  projectLogs!: EntityTable<ProjectLog, "id">;
  patternDocs!: EntityTable<PatternDoc, "id">;
  inspirations!: EntityTable<Inspiration, "id">;
  froggingLogs!: EntityTable<FroggingLog, "id">;
  pauseEvents!: EntityTable<PauseEvent, "id">;
  colorCharts!: EntityTable<ColorChartRecord, "id">;
  stitchCharts!: EntityTable<StitchChartRecord, "id">;

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

    // v2 — 스태시 목록을 최근 수정순으로 정렬한다.
    // orderBy()는 sortBy()와 달리 인덱스를 요구한다.
    // 바뀐 스토어만 적으면 나머지는 이전 버전에서 이어받는다.
    this.version(2).stores({
      yarns: "id, brand, weightClass, dyeLot, updatedAt",
    });

    // v3 — 프로젝트에 붙이는 참고 링크(영상). 사진은 kind로 진행/참고를
    // 구분하는데, 그건 인덱스를 걸지 않은 필드라 스키마 변경이 없다 —
    // 프로젝트당 사진은 많아야 수십 장이어서 메모리에서 걸러도 된다.
    this.version(3).stores({
      projectLinks: "id, projectId",
    });

    // v4 — 중단 이력. 프로젝트의 pauseReason은 재개하면 지워지므로
    // 평생 패턴(주로 무엇 때문에 멈추는가)은 사건을 따로 쌓아야 알 수 있다.
    this.version(4).stores({
      pauseEvents: "id, projectId, pausedAt, reason",
    });

    // v5 — 색상 차트. 목록을 최근 수정순으로 보여주므로 updatedAt에 인덱스가
    // 필요하다(orderBy는 sortBy와 달리 인덱스를 요구한다).
    this.version(5).stores({
      colorCharts: "id, updatedAt, projectId",
    });

    // v6 — 심볼 차트(무늬). 색상 차트와 인덱스 구성이 같다.
    this.version(6).stores({
      stitchCharts: "id, updatedAt, projectId",
    });

    // v7 — PDF 도안. 프로젝트별로 붙으므로 projectId에 인덱스가 필요하다.
    this.version(7).stores({
      patternDocs: "id, updatedAt, projectId",
    });

    // v8 — 스크랩. projectId가 비어 있는 것이 정상 상태라(아직 작품을 안
    // 정한 스크랩) 인덱스로 그것만 골라낼 수 있어야 한다.
    this.version(8).stores({
      inspirations: "id, updatedAt, projectId",
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
