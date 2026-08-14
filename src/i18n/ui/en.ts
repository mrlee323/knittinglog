import type { UIStrings } from "./ko";

export const en: UIStrings = {
  app: { name: "knittinglog" },
  nav: {
    dashboard: "Home",
    projects: "Projects",
    gauge: "Gauge",
    yarn: "Yarn",
    settings: "Settings",
  },
  status: {
    planning: "Planning",
    active: "In progress",
    // "abandoned"가 아니다. 중단은 실패가 아니라는 게 이 서비스의 전제다.
    hibernating: "Hibernating",
    finished: "Finished",
    frogged: "Frogged",
  },
  pauseReason: {
    "out-of-yarn": "Ran out of yarn",
    "gauge-failed": "Gauge didn't work",
    bored: "Lost interest",
    "too-hard": "Too difficult",
    "needle-taken": "Needles in use",
    "wrong-season": "Wrong season",
    other: "Other",
  },
  craft: { knit: "Knitting", crochet: "Crochet" },
  settings: {
    // 언어 라벨만은 두 언어를 병기한다 — 모르는 언어로 갇혔을 때 탈출구가 된다
    language: "언어 / Language",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    units: "Units",
  },
  common: { empty: "Nothing here yet", loading: "Loading" },
};
