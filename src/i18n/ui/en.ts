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
  common: { empty: "Nothing here yet", loading: "Loading" },
};
