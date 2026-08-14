/**
 * 저장 엔티티 타입.
 *
 * MVP는 무계정 로컬 전용이지만, 2차에 Supabase 동기화를 얹을 수 있도록
 * 모든 엔티티에 `ownerId?`와 `updatedAt` 자리를 미리 비워둔다.
 * 나중에 넣으려면 마이그레이션이 전 테이블에 걸린다.
 */

import type { Craft, YarnWeightClass } from "@/domain/units";

export type Id = string;

/** 동기화·감사에 필요한 공통 필드 */
export interface Base {
  id: Id;
  /** 2차 계정 도입 시 사용. 로컬 전용 동안에는 undefined. */
  ownerId?: Id;
  createdAt: Date;
  updatedAt: Date;
}

/* --- 프로젝트 ------------------------------------------------------------- */

/** 잠시멈춤(hibernating)은 실패가 아니라 정상 상태다. §1 참고 */
export type ProjectStatus =
  | "planning"
  | "active"
  | "hibernating"
  | "finished"
  | "frogged";

export type PauseReason =
  | "out-of-yarn"
  | "gauge-failed"
  | "bored"
  | "too-hard"
  | "needle-taken"
  | "wrong-season"
  | "other";

export type ProjectCategory =
  | "sweater"
  | "hat"
  | "socks"
  | "shawl"
  | "bag"
  | "blanket"
  | "accessory"
  | "other";

export interface Project extends Base {
  name: string;
  craft: Craft;
  category: ProjectCategory;
  status: ProjectStatus;
  /** status가 hibernating일 때의 중단 사유 */
  pauseReason?: PauseReason;
  pauseNote?: string;
  /** 선물용이면 받는 사람의 치수 프로필 */
  recipientProfileId?: Id;
  startedAt?: Date;
  pausedAt?: Date;
  finishedAt?: Date;
  coverPhotoId?: Id;
  patternId?: Id;
  gaugeId?: Id;
  notes?: string;
}

export interface ProjectPhoto extends Base {
  projectId: Id;
  /** 로컬 전용 동안에는 Blob, 동기화 후에는 원격 URL */
  blob?: Blob;
  remoteUrl?: string;
  takenAt: Date;
  caption?: string;
}

export interface ProjectLog extends Base {
  projectId: Id;
  date: Date;
  body: string;
}

/** 푼 기록. 통계에서 "뜬 단수" 옆에 "푼 단수"로 보여준다. */
export interface FroggingLog extends Base {
  projectId: Id;
  date: Date;
  rowsFrogged: number;
  reason?: string;
}

/* --- 카운터 --------------------------------------------------------------- */

export interface Counter extends Base {
  projectId: Id;
  label: string;
  value: number;
  target?: number;
  /**
   * 메인 카운터가 linkRatio단 올라갈 때마다 이 카운터가 1 오른다.
   * 값은 증감이 아니라 메인에서 파생된다 — 어긋남을 원천 차단한다.
   */
  linkedCounterId?: Id;
  linkRatio?: number;
  /** 뜨던 도중에 연동을 붙였을 때의 시작값 보정 */
  linkOffset?: number;
  /** 무늬 반복 길이와 목표 반복 횟수 */
  repeatLength?: number;
  repeatTarget?: number;
  sortOrder: number;
}

/** lifeline은 이 서비스의 시그니처 — 되돌아갈 안전선 */
export type CounterMarkKind = "note" | "lifeline" | "marker";

export interface CounterMark extends Base {
  counterId: Id;
  atRow: number;
  kind: CounterMarkKind;
  note?: string;
  /** 생명줄을 넣은 시점의 코수 스냅샷 */
  stitchCount?: number;
}

/** 뜨는 속도 학습·통계·완성 예상일의 원천 데이터 */
export interface CounterSession extends Base {
  counterId: Id;
  projectId: Id;
  startedAt: Date;
  endedAt?: Date;
  rowsAdded: number;
}

/* --- 게이지 · 치수 -------------------------------------------------------- */

export interface GaugeRecord extends Base {
  projectId?: Id;
  yarnId?: Id;
  needleId?: Id;
  label?: string;
  pattern?: string;
  stitchesPer10cm: number;
  rowsPer10cm: number;
  blockedStitchesPer10cm?: number;
  blockedRowsPer10cm?: number;
  photoBlob?: Blob;
}

export interface BodyMeasurements {
  bust?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  armLength?: number;
  upperArm?: number;
  backLength?: number;
  headCirc?: number;
  footLength?: number;
  footCirc?: number;
}

/** 선물용 프로젝트가 많아 여러 프로필을 관리한다 */
export interface BodyProfile extends Base {
  name: string;
  measurements: BodyMeasurements;
  /** 실측 + 여유분 = 완성 치수. 핏 취향(cm). */
  preferredEaseCm?: number;
}

/* --- 실 · 바늘 ------------------------------------------------------------ */

export interface Yarn extends Base {
  brand?: string;
  name: string;
  colorName?: string;
  colorCode?: string;
  /** 로트번호. 중간에 실이 모자랄 때 같은 로트를 못 구하는 게 중단 사유가 된다. */
  dyeLot?: string;
  fiber?: string;
  weightClass?: YarnWeightClass;
  skeinGrams?: number;
  skeinMeters?: number;
  skeinCount: number;
  purchasedAt?: Date;
  price?: number;
  shop?: string;
  photoBlob?: Blob;
  careLabel?: string;
}

export interface YarnAllocation extends Base {
  yarnId: Id;
  projectId: Id;
  skeinsAllocated: number;
  gramsUsed?: number;
}

/** 실 부족 예측(Yarn Chicken)의 입력 — 저울로 잰 잔량 기록 */
export interface YarnWeighIn extends Base {
  allocationId: Id;
  date: Date;
  remainingGrams: number;
  /** 잰 시점의 단수. 단당 소모량 역산에 필요하다. */
  atRow?: number;
}

export type NeedleType = "straight" | "circular" | "dpn" | "hook";

export interface Needle extends Base {
  craft: Craft;
  type: NeedleType;
  sizeMm: number;
  lengthCm?: number;
  material?: string;
  /** 지금 어느 프로젝트에 물려 있는지. 바늘 충돌은 실제 중단 사유다. */
  occupiedByProjectId?: Id;
}

/* --- 도안 (P1) ------------------------------------------------------------ */

export interface Pattern extends Base {
  name: string;
  craft: Craft;
  designer?: string;
  source?: string;
  url?: string;
  fileBlob?: Blob;
  /** "S", "M", "L" — 도안이 지원하는 사이즈 라벨 */
  sizeLabels?: string[];
  /** 내가 뜨는 사이즈 */
  mySizeLabel?: string;
  notes?: string;
}
