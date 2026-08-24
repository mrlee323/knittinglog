/**
 * 저장 엔티티 타입.
 *
 * MVP는 무계정 로컬 전용이지만, 2차에 Supabase 동기화를 얹을 수 있도록
 * 모든 엔티티에 `ownerId?`와 `updatedAt` 자리를 미리 비워둔다.
 * 나중에 넣으려면 마이그레이션이 전 테이블에 걸린다.
 */

import type { Craft, YarnWeightClass } from "@/domain/units";
import type { PieceKind } from "@/domain/piece";
import type { Side } from "@/domain/stitchChart";
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

/**
 * 프로젝트를 이루는 조각 — 몸판, 소매, 발.
 *
 * 계산기가 만든 코수가 머무는 자리다. 없을 때는 "몸판 118코"를 계산해도
 * 화면을 벗어나면 사라져서, 배색 도안과 카운터가 같은 숫자를 다시 물었다.
 *
 * **치수(cm)가 뜻이고 코수는 파생값이다.** 게이지가 바뀌면 코수는 다시
 * 계산되어야 하고, 예전 값을 함께 들고 있어야 무엇이 얼마나 달라졌는지
 * 말할 수 있다(`domain/piece.ts`).
 */
export interface ProjectPiece extends Base {
  projectId: Id;
  /** 사용자가 짓는다 — 도안마다 부르는 말이 다르다 */
  name: string;
  /** 제안에서 만든 조각이면 종류가 남는다 */
  kind?: PieceKind;
  widthCm?: number;
  lengthCm?: number;
  stitches?: number;
  rows?: number;
  /** 이 코수를 만든 게이지. 어긋남을 판정하는 기준이다. */
  gaugeId?: Id;
  sortOrder: number;
}

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
   * 사진의 용도.
   *
   * 셋 다 저장·압축·보기가 완전히 같아서 테이블을 나누지 않았다. 다른 건
   * 읽는 방식이다 — 진행 사진은 시간순으로 쌓여 "어디까지 떴는지"를 말하고,
   * 참고 사진은 무드보드이고, 도안은 뜨는 동안 확대해서 읽는 것이다.
   * 값이 없으면 진행 사진으로 본다(이 필드가 생기기 전에 저장된 사진).
   *
   * 도안을 여기 담는 것은 "이미지 도안 먼저"라는 결정에 따른 것이다.
   * 도안을 구조로 다루는 모델(Pattern·sizeLabels·IR)은 그대로 남겨두고,
   * 사진으로 찍거나 캡처한 도안은 사진 경로를 그대로 쓴다.
   */
  kind?: "progress" | "reference" | "pattern";
}

/**
 * PDF 도안.
 *
 * 상용 도안은 대개 PDF로 온다. 이미지 도안(`ProjectPhoto.kind = "pattern"`)과
 * 같은 자리에 쓰이지만 테이블을 나눴다 — 사진은 압축·썸네일·단수 스냅샷이
 * 붙고, PDF는 페이지 수와 읽던 자리가 붙는다. 한 테이블에 넣으면 조회할
 * 때마다 종류를 확인해야 하고 쓰지 않는 필드가 절반이 된다.
 *
 * 구조화된 도안 모델(`Pattern`·sizeLabels·IR)과도 별개다. 이건 **읽는 문서**고,
 * 그쪽은 앱이 계산에 쓰는 구조다.
 */
export interface PatternDoc extends Base {
  projectId: Id;
  name: string;
  /** 로컬 전용 동안에는 Blob, 동기화 후에는 원격 URL */
  blob?: Blob;
  remoteUrl?: string;
  pageCount: number;
  /**
   * 읽던 자리.
   *
   * 이 앱의 전제가 "언제 멈췄든 그 자리에서 이어 뜨기"이므로, 도안도 덮어둔
   * 페이지에서 다시 열려야 한다. 40쪽짜리 도안에서 매번 찾아 들어가는 것은
   * 중단의 비용을 그대로 물리는 일이다.
   */
  lastPage?: number;
  lastZoom?: number;
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
  /**
   * 소유자가 다른 사이트에서의 재생을 막아둔 영상인지.
   *
   * 재생을 시도해봐야 알 수 있는 값이라, 한 번 확인하면 기억해둔다. 그러면
   * 다음부터는 재생되지 않을 플레이어를 띄우는 대신 곧바로 "유튜브에서 열기"를
   * 안내할 수 있다 — 같은 벽에 두 번 부딪히지 않게 한다.
   */
  embedBlocked?: boolean;
}

/**
 * 중단 이력.
 *
 * 프로젝트의 `pauseReason`은 재개하면 지워진다(domain/projectStatus.ts의
 * statusPatch). 그래서 "주로 무엇 때문에 멈추는가"를 말하려면 멈춘 사건을
 * 따로 쌓아야 한다 — 현재 상태만으로는 평생 패턴을 알 수 없다.
 *
 * 끝난 방식(endedBy)까지 남기는 게 중요하다. 사유별로 몇 번 멈췄는지보다
 * **그중 몇 번이나 돌아왔는지**가 더 쓸모 있는 정보다.
 */
export interface PauseEvent extends Base {
  projectId: Id;
  reason: PauseReason;
  note?: string;
  pausedAt: Date;
  /** 아직 멈춰 있으면 undefined */
  endedAt?: Date;
  endedBy?: "resumed" | "finished" | "frogged";
}

/** 푼 기록. 통계에서 "뜬 단수" 옆에 "푼 단수"로 보여준다. */
export interface FroggingLog extends Base {
  projectId: Id;
  date: Date;
  rowsFrogged: number;
  reason?: string;
}

/**
 * 색상 차트(픽셀 도안).
 *
 * 셀 배열의 행 순서와 좌표 규칙은 domain/colorChart.ts가 소유한다 —
 * 뜨개는 아래에서 위로 뜨므로 y=0이 첫 단이다. 여기 저장 형태는 그 규칙을
 * 그대로 담는 그릇이다.
 *
 * 게이지를 참조로 물린다. "완성 모양 미리보기"가 이 기능의 존재 이유이고,
 * 그건 게이지 없이는 그릴 수 없다. 사본이 아니라 참조인 이유는 스와치를
 * 다시 재면 미리보기도 따라 바뀌어야 하기 때문이다.
 */
export interface ColorChartRecord extends Base {
  name: string;
  width: number;
  height: number;
  palette: string[];
  cells: number[];
  gaugeId?: Id;
  projectId?: Id;
  notes?: string;
  /**
   * 원형으로 뜨는 도안인가.
   *
   * 뒷실 경고가 이걸 봐야 맞는다 — 원형은 단의 끝과 시작이 이어지므로 끝 3코와
   * 시작 4코가 실제로는 7코 하나다. 화면의 보기 설정이 아니라 도안 자체의
   * 성질이라 레코드에 둔다.
   */
  inRound?: boolean;
  /** 뒷실 경고 기준(코). 실 굵기에 따라 다르므로 도안마다 다르게 둔다. */
  floatLimit?: number;
  /**
   * 무늬 반복 단위(코수·단수).
   *
   * 격자에 10코마다 넣는 선은 도안의 관습이고, 이건 **이 무늬의** 경계다.
   * 지정하면 반복 경계에 안내선이 붙어서 무늬가 이어질 때 어긋나는 걸 그리는
   * 중에 알 수 있다. 없으면 관습선만 보인다.
   */
  repeatStitches?: number;
  repeatRows?: number;
  /**
   * 이 무늬를 얹을 코수.
   *
   * 넣으면 반복이 맞는지 검산한다 — 118코에 10코 무늬면 11회에 8코가 남는다는
   * 것을 뜨기 전에 알려준다. 심볼 차트의 `castOn`과 같은 뜻이다.
   */
  castOn?: number;
}
/**
 * 심볼 차트(무늬 도안) — 칸에 색이 아니라 기법을 담는다.
 *
 * 색상 차트와 별도 테이블이다. 한 테이블에 종류 필드로 섞으면 cells(색 번호)와
 * ops(기법 이름)가 같은 칸에 들어가고, 코수 검산은 심볼에만 있어서 조회할 때마다
 * 종류를 확인해야 한다.
 */
export interface StitchChartRecord extends Base {
  name: string;
  width: number;
  height: number;
  /** row-major, y = 0이 첫 단(맨 아래). 값은 기법 op. */
  ops: string[];
  /**
   * 실제 시작 코수.
   *
   * 넣으면 1단도 검산 대상이 된다 — 7코 무늬를 60코에 얹으면 맞지 않는다는
   * 것을 뜨기 전에 알려준다. 없으면 무늬 자체의 앞뒤만 본다.
   */
  castOn?: number;
  /**
   * 평면 뜨기인가. 기본은 원형(false)이다.
   *
   * 서술형 변환에만 쓴다 — 격자는 어느 쪽이든 겉에서 본 모습으로 그린다.
   */
  flat?: boolean;
  /** 1단을 어느 면에서 시작하는가. 기본은 겉면. */
  firstRowSide?: Side;
  gaugeId?: Id;
  projectId?: Id;
  notes?: string;
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
  /** 라이프라인을 넣은 시점의 코수 스냅샷 */
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

/* --- 스크랩 --------------------------------------------------------------- */

/**
 * 스크랩 — 기획 §13.2.
 *
 * 화면에서는 "스크랩"(영문 "Saved")이라고 부른다. 타입과 테이블 이름은
 * `Inspiration`/`inspirations`로 남겼다 — 저장된 데이터의 이름을 바꾸려면
 * 마이그레이션이 필요하고, 보이지 않는 이름을 위해 그 위험을 질 이유가 없다.
 *
 * 뜨기 전에 모으는 것들이다. 핀터레스트에서 본 무늬, 유튜브 영상, "다음엔
 * 래글런으로" 같은 한 줄.
 *
 * **프로젝트가 없어도 존재한다.** 스크랩은 대개 프로젝트보다 먼저 오고, 어느
 * 작품에 쓸지는 나중에 정해진다 — 그래서 `projectId`가 선택이고, 이 테이블이
 * 스크랩함이 된다. 프로젝트를 지워도 스크랩은 미지정으로 돌아갈 뿐 사라지지 않는다.
 */
export interface Inspiration extends Base {
  /** 이미지로 모은 것. 로컬 전용 동안에는 Blob. */
  blob?: Blob;
  remoteUrl?: string;
  /** 어디서 스크랩했는지 */
  sourceUrl?: string;
  title?: string;
  note?: string;
  /** 어느 프로젝트에 붙였는지. 없으면 보관함에만 있다. */
  projectId?: Id;
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
