/**
 * 한국어가 기준 번들이다. `as const`를 쓰지 않는 이유는
 * typeof ko를 다른 로케일의 타입으로 재사용하기 때문 —
 * 리터럴로 굳으면 영어 번들이 "홈"만 허용하게 된다.
 * 키 누락은 여전히 타입 에러로 잡힌다.
 */
export const ko = {
  app: { name: "knittinglog" },
  nav: {
    dashboard: "홈",
    projects: "프로젝트",
    gauge: "게이지",
    yarn: "실",
    settings: "설정",
  },
  status: {
    planning: "계획중",
    active: "진행중",
    hibernating: "잠시멈춤",
    finished: "완성",
    frogged: "풀어버림",
  },
  pauseReason: {
    "out-of-yarn": "실부족",
    "gauge-failed": "게이지실패",
    bored: "싫증",
    "too-hard": "난이도",
    "needle-taken": "바늘뺏김",
    "wrong-season": "시즌아님",
    other: "기타",
  },
  craft: { knit: "대바늘", crochet: "코바늘" },
  category: {
    sweater: "스웨터",
    hat: "모자",
    socks: "양말",
    shawl: "숄",
    bag: "가방",
    blanket: "담요",
    accessory: "소품",
    other: "기타",
  },
  /** 상태 전이 버튼. 명령형으로 쓴다. */
  event: {
    START: "뜨기 시작",
    PAUSE: "잠시 멈추기",
    RESUME: "다시 뜨기",
    FINISH: "완성",
    FROG: "풀어버리기",
    REOPEN: "다시 열기",
    RESTART: "다시 계획하기",
  },
  project: {
    new: "새 프로젝트",
    edit: "프로젝트 수정",
    name: "이름",
    namePlaceholder: "회색 라글란 스웨터",
    craft: "기법",
    category: "종류",
    notes: "메모",
    notesPlaceholder: "도안 출처, 변형한 부분, 기억해둘 것",
    empty: "아직 프로젝트가 없어요",
    emptyHint: "하다 만 것부터 등록해도 괜찮아요",
    all: "전체",
    deleteConfirm: "이 프로젝트와 관련 기록을 모두 지울까요? 되돌릴 수 없어요.",
    pauseTitle: "왜 멈추나요?",
    pauseHint: "사유를 남겨두면 나중에 무엇부터 해결할지 알 수 있어요",
    pausedToday: "오늘 멈춤",
    pausedFor: "{days}일째 멈춤",
    startedOn: "시작 {date}",
    finishedOn: "완성 {date}",
  },
  action: {
    create: "만들기",
    save: "저장",
    cancel: "취소",
    edit: "수정",
    delete: "삭제",
    back: "뒤로",
  },
  settings: {
    language: "언어 / Language",
    theme: "테마",
    themeSystem: "시스템",
    themeLight: "라이트",
    themeDark: "다크",
    units: "단위계",
  },
  common: { empty: "아직 없어요", loading: "불러오는 중" },
};

export type UIStrings = typeof ko;
