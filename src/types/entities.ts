/**
 * 저장 엔티티 타입.
 *
 * MVP는 무계정 로컬 전용이지만, 2차에 Supabase 동기화를 얹을 수 있도록
 * 모든 엔티티에 `ownerId?`와 `updatedAt` 자리를 미리 비워둔다.
 * 나중에 넣으려면 마이그레이션이 전 테이블에 걸린다.
 */

import type { Craft, YarnWeightClass } from "@/domain/units";
import type { Measurements } from "@/domain/body";

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
  /**
   * 대표 사진을 사용자가 직접 골랐는지.
   *
   * 고르지 않았으면 새 사진이 들어올 때마다 대표가 최신으로 따라간다 —
   * 목록에서 보고 싶은 건 대개 "지금 어디까지 떴는지"다. 한 번 고르면
   * 그 뒤로 사진을 더 올려도 그 장이 유지된다.
   */
  coverPinned?: boolean;
  /**
   * 이 프로젝트를 어느 작품에서 이어받았는지.
   *
   * 같은 옷을 다른 색으로 다시 뜨는 건 뜨개에서 흔한 일이고, 그때 필요한 건
   * 지난번 치수다. 이 참조가 있으면 상세 화면에서 이전 작품의 사진·메모·
   * 게이지로 한 번에 건너갈 수 있다.
   */
  derivedFromProjectId?: Id;
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
  /**
   * 찍은 시점의 단수 스냅샷.
   *
   * 이게 없으면 타임라인은 그냥 앨범이다. 단수가 박히면 "62단째의 모습"이 되어
   * 복귀할 때 어디까지 떴는지를 글이 아니라 그림으로 확인할 수 있다.
   * 카운터 값을 참조가 아니라 사본으로 갖는 이유는, 나중에 풀거나 되돌려서
   * 카운터가 62 아래로 내려가도 이 사진이 찍힌 시점은 62단이었기 때문이다.
   */
  atRow?: number;
  atCounterLabel?: string;
  /**
   * 진행 사진인지 참고 사진인지.
   *
   * 둘은 저장·압축·보기가 완전히 같아서 테이블을 나누지 않았다. 다른 건
   * 읽는 방식이다 — 진행 사진은 시간순으로 쌓여 "어디까지 떴는지"를 말하고,
   * 참고 사진은 뜨기 전에 모아두는 무드보드다. 값이 없으면 진행 사진으로
   * 본다(이 필드가 생기기 전에 저장된 사진).
   */
  kind?: "progress" | "reference";
}

export interface ProjectLog extends Base {
  projectId: Id;
  date: Date;
  body: string;
}

/**
 * 프로젝트에 붙여둔 링크.
 *
 * 도안 영상·튜토리얼은 뜨개 학습의 절반이고, 대개 유튜브에 있다. 주소만
 * 저장하고 영상 id는 화면에서 다시 해석한다(domain/youtube.ts) — 파싱 결과를
 * 저장해두면 해석 규칙을 고쳤을 때 이미 저장된 링크가 옛 결과에 묶인다.
 */
export interface ProjectLink extends Base {
  projectId: Id;
  url: string;
  title?: string;
  note?: string;
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
  /**
   * 스와치를 뜬 바늘 굵기(mm).
   *
   * 바늘 인벤토리(needleId)는 P1이지만 호수 기록은 스와치의 핵심이다.
   * 게이지가 안 맞을 때 "몇 호로 바꿔라"를 말하려면 지금 몇 호인지 알아야 한다.
   */
  needleMm?: number;
  label?: string;
  pattern?: string;
  stitchesPer10cm: number;
  rowsPer10cm: number;
  blockedStitchesPer10cm?: number;
  blockedRowsPer10cm?: number;
  photoBlob?: Blob;
}

/**
 * 치수 항목은 domain/body.ts가 소유한다.
 *
 * 여기에 따로 선언하면 항목을 하나 추가할 때 두 곳을 고쳐야 하고,
 * 한쪽만 고치면 계산기가 조용히 그 항목을 무시하게 된다.
 */
export type { Measurements as BodyMeasurements } from "@/domain/body";

/** 선물용 프로젝트가 많아 여러 프로필을 관리한다 */
export interface BodyProfile extends Base {
  name: string;
  measurements: Measurements;
  /** 실측 + 여유분 = 완성 치수. 핏 취향(cm). */
  preferredEaseCm?: number;
}

/* --- 실 · 바늘 ------------------------------------------------------------ */

export interface Yarn extends Base {
  brand?: string;
  name: string;
  colorName?: string;
  /** 제조사 색번(예: "1042"). 재구매할 때 쓴다 — 화면에 칠할 수 있는 값이 아니다. */
  colorCode?: string;
  /**
   * 실제로 화면에 칠하는 색. `#rrggbb`.
   *
   * 디자인 방향이 "UI는 무채색, 실만 색을 갖는다"이므로(docs/DESIGN.md)
   * 이 값이 앱에서 자유로운 채도를 갖는 유일한 색이다.
   * 사용자가 직접 고르며, 없으면 색을 칠하지 않는다 — UI가 임의의 색을
   * 만들어내면 그 순간 원칙이 깨진다.
   */
  colorHex?: string;
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
