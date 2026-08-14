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
  common: { empty: "아직 없어요", loading: "불러오는 중" },
};

export type UIStrings = typeof ko;
