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
    scrap: "스크랩",
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
    /* 같은 작품 다시 뜨기 */
    restart: "이대로 다시 뜨기",
    restartHint:
      "카운터 구성과 게이지를 그대로 가져와요. 실만 새로 고르면 돼요.",
    derivedFrom: "{name}에서 이어받았어요",
    derivedHint:
      "실이 바뀌면 스와치를 다시 떠보세요. 게이지가 달라지면 코수도 달라져요.",
    viewSource: "지난 작품 보기",
    /* 프로젝트 안의 화면 전환 */
    tabOverview: "개요",
    tabWorkbench: "작업대",
    tabLog: "기록",
    recentLog: "최근 기록",
    viewAllLog: "기록 전체 보기",
    references: "참고 자료",
    viewWorkbench: "작업대에서 보기",
    resources: "구성",
    /* 중단 사유별 결말 — 옛 기록 탭에서 옮겨왔다 */
    reasonTitle: "왜 멈췄나",
    reasonNote: "지금까지 멈춘 이력을 모아 본 거예요",
    reasonTop: "가장 많은 사유 — {reason}",
    medianPause: "보통 {n}일쯤 멈춰 있어요",
    reasonCount: "{n}번",
    reasonReturned: "{n}번 돌아옴",
    reasonOpen: "{n}개 멈춤 중",
  },
  counter: {
    lifelineAt: "지금 라이프라인 자리에 있어요",
    fromPiece: "조각에서 가져오기",
    title: "카운터",
    knit: "뜨기",
    add: "카운터 추가",
    label: "이름",
    labelPlaceholder: "몸판",
    target: "목표 단수",
    repeatLength: "무늬 반복 단수",
    repeatTarget: "반복 횟수",
    linkTo: "따라갈 카운터",
    linkNone: "연동 안 함",
    linkRatio: "몇 단마다 1회",
    linkedHint: "{main} {ratio}단마다 1 오릅니다",
    // 카운터 이름은 사용자가 짓는다. 조사(을/를)를 붙이면 어색해지므로 피한다.
    linkedReadOnly: "{main} {ratio}단마다 자동으로 올라가요",
    empty: "카운터가 없어요",
    defaultLabel: "단수",
    createDefault: "단수 카운터 만들기",
    emptyHint: "몸판, 소매, 무늬 반복처럼 세고 싶은 만큼 만들 수 있어요",
    rows: "단",
    remaining: "{n}단 남음",
    repeatProgress: "{done}회 완료 · {row}/{len}단",
    repeatOf: "{done}/{target}회",
    done: "목표 도달",
    undo: "되돌리기",
    lifeline: "라이프라인",
    lifelineHere: "여기에 라이프라인",
    lifelineLast: "마지막 라이프라인 {row}단",
    lifelineNone: "라이프라인 없음",
    lifelineUnravel: "{n}단만 풀면 돼요",
    setValue: "단수 직접 입력",
    screenOn: "화면 켜둠",
    patternPanel: "도안 나란히 보기",
    sessionRows: "이번에 {n}단",
    deleteConfirm: "이 카운터와 마크·세션 기록을 지울까요?",
  },
  piece: {
    title: "조각",
    /* 계산기가 만든 숫자가 사라지는 걸 막는 자리다 */
    hint: "계산한 코수를 여기 남겨두면 도안과 카운터가 같은 숫자를 써요",
    none: "아직 조각이 없어요",
    add: "조각 추가",
    edit: "조각 수정",
    suggest: "이런 조각으로 나뉘어요",
    name: "이름",
    namePlaceholder: "몸판",
    widthCm: "너비 (cm)",
    lengthCm: "길이 (cm)",
    stitches: "코수",
    rows: "단수",
    sizeHint: "치수를 넣으면 게이지에서 코수를 계산해요",
    counts: "{sts}코 × {rows}단",
    countsStitchesOnly: "{sts}코",
    countsRowsOnly: "{rows}단",
    size: "{w}cm × {l}cm",
    noCounts: "코수 없음",
    /* 게이지가 바뀌면 저장된 코수가 조용히 틀린 값이 된다 */
    drift: "게이지가 바뀌었어요",
    driftStitches: "코수 {was} → {now}",
    driftRows: "단수 {was} → {now}",
    recalc: "지금 게이지로 맞추기",
    needGauge: "게이지를 기록하면 치수에서 코수를 계산해요",
    deleteConfirm: "이 조각을 지울까요?",
    /* 계산기에서 */
    saveAsPiece: "이 프로젝트의 조각으로 저장",
    savedAsPiece: "조각으로 저장했어요",
    pickPiece: "조각에서 가져오기",
    kind: {
      body: "몸판",
      sleeve: "소매",
      front: "앞판",
      back: "뒷판",
      yoke: "요크",
      brim: "테",
      leg: "다리",
      foot: "발",
      other: "기타",
    },
  },
  start: {
    title: "다음은 이걸 하면 돼요",
    progress: "{done}/{total}",
    /* 하나만 말한다. 목록은 읽히지 않고, 읽어도 어디서 시작할지는 안 정해진다. */
    yarn: "쓸 실을 정해요",
    yarnWhy: "무슨 실로 뜨는지 정해야 크기를 잴 수 있어요.",
    yarnAction: "실 배정하기",
    yarnActionEmpty: "실 등록하기",
    swatch: "스와치를 떠서 크기를 재요",
    swatchWhy:
      "같은 도안이어도 뜨는 사람마다 크기가 달라져요. 작은 조각을 먼저 떠서 내 크기를 알아둬요.",
    swatchAction: "스와치 뜨기 안내",
    piece: "몇 코로 시작할지 계산해요",
    pieceWhy:
      "재둔 크기로 원하는 치수를 코수로 바꿔요. 계산한 값은 조각으로 저장돼서 도안과 카운터가 함께 써요.",
    pieceAction: "계산기로 가기",
    counter: "카운터를 만들어요",
    counterWhy:
      "어디까지 떴는지 세는 곳이에요. 조각에 계획한 단수를 목표로 가져올 수 있어요.",
    counterAction: "카운터 만들기",
    /* 관문이 아니라는 걸 말한다 */
    skip: "순서를 건너뛰어도 괜찮아요. 도안대로 바로 떠도 돼요.",
  },
  finish: {
    title: "완성 예상",
    pace: "시간당 {n}단",
    daily: "하루 평균 {time}",
    by: "{date}쯤",
    days: "{n}일 남음",
    /* 재촉이 아니라 계획을 위한 숫자다 — 근거가 얇으면 그렇다고 말한다 */
    thin: "기록이 적어 오차가 커요",
    needTarget: "목표 단수를 정하면 완성 예상을 알려드려요",
    needSessions: "조금 더 뜨면 이 속도로 언제 끝날지 알려드려요",
    hours: "{h}시간 {m}분",
    minutes: "{m}분",
    farOff: "이 속도면 1년 넘게 걸려요",
  },
  yarn: {
    weightEstimated: "라벨 기준 추정",
    essentials:
      "이름과 라벨의 타래 무게·길이만 있으면 충분해요. 그 두 숫자로 굵기와 권장 바늘을 알려드려요. 나머지는 나중에 채워도 돼요.",
    swatchNextHint:
      "권장 바늘은 출발점이에요. 실제 크기는 사람마다 달라서 작은 조각을 떠서 재봐야 알아요.",
    swatchNext: "이 실의 스와치",
    title: "실",
    add: "실 추가",
    edit: "실 수정",
    name: "제품명",
    namePlaceholder: "울 코튼",
    brand: "브랜드",
    brandPlaceholder: "다루마",
    colorName: "색상명",
    colorCode: "색번",
    colorHex: "화면 색",
    colorHint: "카드와 목록에 칠할 색이에요. 색번과는 별개예요.",
    colorClear: "화면 색 지우기",
    dyeLot: "로트번호",
    dyeLotHint:
      "같은 색이어도 로트가 다르면 미묘하게 달라요. 모자랄 때 필요해요.",
    fiber: "구성",
    fiberPlaceholder: "울 60% 코튼 40%",
    weightClass: "굵기",
    weightUnset: "모름",
    weightHint:
      "라벨에 등급이 없어도 괜찮아요. 위에 무게와 길이를 적으면 추정해드려요.",
    weightGuess: "라벨 기준 {name}로 보여요",
    weightApply: "이 굵기로 설정",
    weightMismatch: "고른 굵기와 라벨 계산이 달라요 — 계산은 {name} 쪽이에요",
    skeinGrams: "타래 무게 (g)",
    skeinMeters: "타래 길이 (m)",
    skeinCount: "보유 타래",
    shop: "구매처",
    careLabel: "세탁 정보",
    empty: "스태시가 비어 있어요",
    emptyHint:
      "가진 실을 등록해두면 프로젝트에 배정하고 잔량을 추적할 수 있어요",
    stash: "보유량",
    skeins: "{n}타래",
    totals: "총 {grams}g · {meters}m",
    free: "여유 {n}타래",
    allocated: "배정 {n}타래",
    overAllocated: "{n}타래 초과 배정",
    deleteConfirm: "이 실과 배정 기록을 지울까요?",
    gaugeRange: "10cm당 {min}~{max}코",
    needleRange: "권장 바늘 {min}~{max}mm",
    /** 국가별 굵기 대조 — 해외 도안을 국내 실로 옮길 때 필요하다 */
    aliases: "다른 이름",
  },
  allocation: {
    noneAddHere: "여기서 바로 등록할 수 있어요. 넣어두면 스태시에도 남아요.",
    registerHere: "스태시에 없는 실인가요? 여기서 등록하기",
    registerAndAdd: "등록하고 이 작품에 쓰기",
    title: "쓰는 실",
    add: "실 배정",
    none: "배정된 실이 없어요",
    pick: "어떤 실을 쓸까요?",
    skeins: "몇 타래",
    remove: "배정 해제",
  },
  weighIn: {
    title: "실 잔량",
    add: "무게 재기",
    grams: "남은 무게 (g)",
    atRow: "잰 시점의 단수",
    atRowHint: "단수를 함께 적으면 실이 언제 모자랄지 계산해요",
    none: "아직 잰 기록이 없어요",
    hint: "저울에 올려 남은 무게를 적어두세요",
    needMore: "한 번 더 재면 실이 모자랄지 알려드려요",
    needRows: "단수를 적은 기록이 두 개 있어야 계산할 수 있어요",
    remove: "이 기록 지우기",
    entry: "{grams}g · {row}단",
    entryNoRow: "{grams}g",
    perRow: "단당 {n}g",
    rowsLeft: "이 실로 {n}단 더 뜰 수 있어요",
    enough: "목표 단수까지 충분해요",
    short: "목표까지 {n}단 모자라요",
  },
  yarnCalc: {
    title: "실 계산기",
    need: "실 소요량",
    needHint: "필요한 길이를 넣으면 몇 타래를 사야 하는지 알려드려요",
    meters: "필요 길이 (m)",
    skeinMeters: "타래 길이 (m)",
    skeins: "{n}타래",
    substitute: "실 대체",
    substituteHint: "도안이 지정한 실을 다른 실로 바꿀 때",
    originalSkeins: "원래 실 타래 수",
    originalMeters: "원래 실 타래 길이 (m)",
    replacementMeters: "바꿀 실 타래 길이 (m)",
    pickFromStash: "스태시에서 고르기",
    manual: "직접 입력",
    totalMeters: "필요한 길이 {n}m",
    noMeters: "타래 길이를 모르는 실은 고를 수 없어요",
  },
  gauge: {
    title: "게이지",
    add: "스와치 기록",
    edit: "스와치 수정",
    label: "이름",
    labelPlaceholder: "울 코튼 4.0mm 메리야스",
    pattern: "무늬",
    patternPlaceholder: "메리야스",
    stitches: "10cm당 코수",
    rows: "10cm당 단수",
    needleMm: "바늘 (mm)",
    blocked: "블로킹 후",
    blockedHint:
      "세탁 후 다시 재서 넣으면 완성 치수가 정확해져요. 안 넣어도 괜찮아요.",
    empty: "기록한 스와치가 없어요",
    emptyHint:
      "스와치는 크기를 재려고 먼저 뜨는 작은 조각이에요. 처음이면 안내를 따라와보세요.",
    summary: "{sts}코 × {rows}단 / 10cm",
    deleteConfirm: "이 스와치 기록을 지울까요?",
    calc: "계산기",
    calcForThis: "이 프로젝트로 계산하기",
    calcTitle: "게이지 계산기",
  },
  swatch: {
    how: "어떻게 잴까요",
    start: "스와치 뜨기 안내",
    title: "스와치 뜨기",
    /* 초보가 막히는 자리는 게이지의 뜻이 아니라 "그래서 뭘 하면 되나"다 */
    why: "왜 하나요?",
    whyBody:
      "같은 도안에 같은 실이어도 뜨는 사람마다 크기가 달라져요. 손 힘이 다르니까요. 그래서 도안에 적힌 코수를 그대로 쓰면 완성했을 때 안 맞아요. 작은 조각을 먼저 떠서 내 크기를 재는 게 스와치예요.",
    whyCost: "20분이면 돼요. 건너뛰면 몇 주 뜬 뒤에 알게 돼요.",

    /* 1 — 실에서 출발점을 낸다. 묻지 않고 알려주는 것이 이 화면의 목적이다. */
    step1: "무엇으로 뜰까요",
    pickYarn: "어떤 실로 뜨나요",
    manualWeight: "실 굵기를 직접 고르기",
    noStash: "스태시에 실을 등록하면 여기서 고를 수 있어요",
    unknownWeight:
      "이 실은 굵기를 몰라요. 타래 무게와 길이를 넣으면 알려드릴 수 있어요.",
    guessed: "라벨 기준 {name}로 보여요",

    adviceTitle: "이렇게 시작해보세요",
    adviceNeedle: "바늘 {min}~{max}mm",
    adviceCastOn: "{n}코 잡기",
    adviceSize: "사방 {n}cm쯤",
    adviceStitch: "겉면이 V자로 보이는 무늬(메리야스)로 떠주세요",
    whySize:
      "10cm를 재려면 가장자리를 피해야 해요. 가장자리는 말리고 장력이 달라서 그대로 재면 틀려요.",
    whyCastOn:
      "이 굵기의 예상 코수는 10cm당 {min}~{max}코예요. 실제 값은 사람마다 달라서, 그걸 재는 게 스와치의 목적이에요 — 이 숫자는 출발점일 뿐이에요.",

    /* 2 — 무엇을 세는지 그림으로. 글로만 쓰면 읽고도 편물을 못 알아본다. */
    step2: "떴으면 재볼까요",
    whatToCount: "무엇을 세나요",
    diagramAlt: "메리야스 편물에서 한 코와 한 단을 세는 그림",
    oneStitch: "한 코",
    stitchCount: "코 {n}개",
    rowCount: "단 {n}개",
    countHow:
      "가로로 나란한 V자 하나가 한 코, 위아래로 쌓인 줄 하나가 한 단이에요.",
    countTip: "가장자리 2~3코는 빼고 가운데에서 세요.",
    byPhoto: "사진으로 재기",
    byHand: "직접 세기",
    spanStitches: "센 코수",
    spanRows: "센 단수",
    spanWidthCm: "그 코들의 폭 (cm)",
    spanHeightCm: "그 단들의 높이 (cm)",
    spanHint:
      "10cm에 딱 맞춰 세지 않아도 돼요. 20코쯤 세고 그 폭을 재는 쪽이 더 정확해요.",
    computed: "10cm당 {sts}코 × {rows}단",
    needSpan: "코수와 폭을 모두 넣으면 계산해드려요",

    /* 3 — 조용히 틀리는 것을 막는다 */
    step3: "확인하고 기록",
    looksOff:
      "이 실에서 나오기 어려운 값이에요. 코수와 단수를 바꿔 넣지 않았나요?",
    knowAlready: "숫자를 이미 알아요",
    next: "다음",
    prev: "이전",
  },
  chart: {
    floatLimitHint:
      "이 코수보다 길게 이어지면 알려드려요. 5코가 흔한 기준이고, 굵은 실이면 더 짧게 잡아요.",
    title: "배색 도안",
    add: "배색 도안 만들기",
    name: "이름",
    namePlaceholder: "눈송이 페어아일",
    size: "크기",
    widthLabel: "코수",
    heightLabel: "단수",
    /* 편집 격자와 미리보기의 차이가 이 기능의 핵심이다 */
    editing: "격자",
    editingHint: "칸을 끌어서 칠해요. 아래가 첫 단이에요.",
    preview: "완성 모양",
    /* 정사각 격자로 그리면 완성 모양이 실제와 다르다 */
    previewHint:
      "게이지 비율을 넣어 그린 거예요. 뜨개 코는 정사각형이 아니라서 격자와 모양이 달라요.",
    /* 게이지가 정하는 것은 비율 하나다. 없어도 미리보기를 막지 않는다. */
    needGauge: "게이지를 고르면 실제 코 비율과 완성 크기를 알려줘요",
    previewSquare: "정사각형 비율로 그렸어요 — 게이지가 없어서요",
    gauge: "게이지",
    gaugeNone: "고르지 않음",
    finishedSize: "완성 {w} × {h}",
    tool: {
      paint: "칠하기",
      fill: "채우기",
      pick: "색 집기",
      line: "직선",
      rect: "사각형",
    },
    undo: "되돌리기",
    redo: "다시하기",
    /* 중간에 끼워넣기 — 크기 입력은 끝에서만 자란다 */
    insertHint: "번호를 넣고 그 자리에 한 단·한 코를 끼우거나 빼요",
    rowAt: "단",
    stitchAt: "코",
    insertRow: "이 자리에 단 넣기",
    removeRow: "이 단 빼기",
    insertColumn: "이 자리에 코 넣기",
    removeColumn: "이 코 빼기",
    /* 반복 안내선 — 10코 관습선과 달리 이 무늬의 경계다 */
    repeat: "반복",
    repeatStitches: "코 반복",
    repeatRows: "단 반복",
    repeatChartFits: "격자 {width}코 = {repeat}코 무늬 {repeats}회",
    repeatChartOff:
      "격자 {width}코는 {repeat}코 무늬의 배수가 아니에요 · {remainder}코 남아요",
    castOn: "얹을 코수",
    castOnHint: "얹을 코수를 넣으면 반복이 맞는지 검산해요",
    repeatFits: "{total}코에 {repeat}코 무늬 {repeats}회 — 딱 맞아요",
    repeatShort:
      "{total}코에 {repeat}코 무늬면 {repeats}회 · {remainder}코 남아요",
    repeatNone: "{total}코에는 {repeat}코 무늬가 한 번도 안 들어가요",
    /* 색 일괄 교체 — 팔레트 hex를 고치는 것과 다르다 */
    swapFrom: "바꿀 색",
    swapTo: "새 색",
    swap: "{n}코 바꾸기",
    /* 대칭 그리기 — 무늬 대부분이 좌우 대칭이라 작업량이 절반이 된다 */
    symmetry: "대칭 그리기",
    symmetryHint: "칠할 때 좌우 반대 칸도 함께 칠해요",
    /* 뒷실(부동사) — 다 뜨고 뒤집어 봐야 아는 실수를 그리는 중에 알린다 */
    floats: "뒷실",
    floatsHint: "같은 색이 길게 이어지면 그 뒤로 다른 색 실이 그만큼 지나가요",
    floatLimit: "기준",
    floatSummary: "뒷실 {n}곳 · 가장 긴 것 {max}코",
    floatNone: "기준을 넘는 뒷실이 없어요",
    shape: "뜨는 방식",
    flat: "평면",
    inRound: "원형",
    inRoundHint: "원형은 단의 끝과 시작이 이어져요",
    /* 명도 대비 — 색이 달라도 명도가 비슷하면 무늬가 사라진다 */
    contrast: "명도 대비",
    contrastPair: "{a}번과 {b}번이 비슷해요 ({ratio}:1)",
    contrastNone: "색끼리 명도가 충분히 달라요",
    grayscale: "흑백으로 보기",
    grayscaleHint: "명도만 남겨요. 뭉쳐 보이면 실제 편물에서도 뭉쳐요",
    zoomLevel: ["작게", "보통", "크게"],
    repeatedAs: "가로 {x}번 · 세로 {y}번 깔았을 때",
    palette: "색",
    grid: "격자",
    addColor: "색 추가",
    removeColor: "이 색 지우기",
    mirror: "좌우 반전",
    /* 색별 코수 — 실을 몇 타래 살지 가늠하는 근거 */
    counts: "색별 코수",
    countsValue: "{n}코",
    /* 단별 읽기 */
    readRow: "단별로 읽기",
    readRowHint: "겉면 단은 오른쪽에서 왼쪽으로 읽어요",
    rowLabel: "{n}단",
    runOf: "{color} {n}코",
    empty: "만든 배색 도안이 없어요",
    emptyHint:
      "페어아일이나 인타르시아 무늬를 칸으로 그려두면 완성 모양까지 볼 수 있어요",
    deleteConfirm: "이 배색 도안을 지울까요?",
    colorName: "{n}번 색",
  },
  /**
   * 기호 도안(무늬) — 칸에 색이 아니라 기법을 담는다.
   *
   * 배색 도안과 나란히 놓이므로 이름이 갈려야 한다. 한국 뜨개에서 쓰는
   * 용어를 그대로 따랐다 — 색으로 무늬를 만드는 것이 배색, 뜨는 방법으로
   * 만드는 것이 기호 도안이다.
   */
  pattern: {
    title: "기호 도안",
    add: "기호 도안 만들기",
    /* 도안 파일 주고받기 — 서버 없이 되는 것 (LOUNGE.md 0단계) */
    shareFile: "도안 파일로 보내기",
    shareFileHint: "카톡·메일로 보내면 받는 사람이 바로 뜰 수 있어요",
    importFile: "받은 도안 넣기",
    importFileHint: "공유하기로 knittinglog를 골라도 들어와요",
    imported: "{name}을 넣었어요",
    importedMany: "{n}개를 넣었어요",
    importNotPattern: "도안 파일이 아니에요",
    importIsBackup: "전체 백업 파일이에요. 설정 › 백업에서 가져와 주세요.",
    importTooNew: "더 새 버전에서 만든 파일이에요. 앱을 새로고침해 주세요.",
    name: "이름",
    namePlaceholder: "물결 레이스",
    widthLabel: "코수",
    heightLabel: "단수",
    stitches: "기법",
    stitchesHint: "고른 다음 칸을 끌어서 찍어요. 겉뜨기는 빈 칸이에요.",
    legend: "범례",
    legendHint: "이 도안에 쓴 기법이에요",
    editing: "격자",
    editingHint: "아래가 첫 단이에요. 겉면 단은 오른쪽에서 왼쪽으로 떠요.",
    preview: "완성 모양",
    previewHint:
      "게이지 비율을 넣어 그린 거예요. 뜨개 코는 정사각형이 아니라서 격자와 모양이 달라요.",
    /* 게이지가 정하는 것은 비율 하나다. 없어도 미리보기를 막지 않는다. */
    needGauge: "게이지를 고르면 실제 코 비율로 보여요. 지금은 정사각형이에요",
    gauge: "게이지",
    gaugeNone: "고르지 않음",
    finishedSize: "완성 {w} × {h}",
    mirror: "좌우 반전",
    /* 격자만 뒤집으면 기울기가 반대인 무늬가 나온다 */
    mirrorHint: "기운 코는 반대 방향 코로 바뀌어요 (오른코모아 ↔ 왼코모아)",
    /* 코수 자동 검산 — 도안을 구조로 저장하는 가장 실용적인 이유 */
    verify: "코수 검산",
    verifyHint:
      "무늬 1회 안에서 각 단이 쓰는 코수가 전단이 남긴 코수와 맞는지 봐요",
    verifyOk: "코수가 맞아요 · 무늬 1회 {start}코 → {end}코",
    verifyBad: "코수가 맞지 않는 단이 {n}개 있어요",
    verifyRow: "{row}단 — {expected}코가 있어야 하는데 {consumes}코를 써요",
    castOn: "시작 코수",
    castOnHint:
      "이 무늬를 몇 코에 얹을지 넣어요. 시접과 반복 횟수를 함께 계산해요.",
    /* 뜨는 방식 — 서술형 변환에만 영향이 있다. 격자는 늘 겉에서 본 모습이다. */
    reading: "뜨는 방식",
    readingRound: "원형",
    readingFlat: "평면",
    readingHint:
      "원형은 뒤집지 않으니 모든 단이 겉면이에요. 평면은 매 단 뒤집어서 겉면과 안면이 번갈아 나와요.",
    firstSide: "1단 시작 면",
    sideRs: "겉면",
    sideWs: "안면",
    /* 서술형 변환 — 같은 구조에서 두 언어의 도안이 나온다 (기획 §4) */
    prose: "서술형 도안",
    proseHint:
      "같은 도안을 글로 옮긴 거예요. 겉면 단은 오른쪽에서, 안면 단은 왼쪽에서 읽어요.",
    /* 이게 평면 변환의 핵심이라 화면에 적어둔다 */
    proseWsNote:
      "도안은 겉에서 본 모습이라, 안면 단에서는 겉뜨기 기호를 안뜨기로 떠요. 기울어진 코도 안면 기법으로 바뀌어요.",
    proseLocale: "도안 언어",
    /* 평면 ↔ 원형 — 차트는 그대로고 코수와 양끝 처리가 달라진다 */
    construction: "평면 ↔ 원형",
    constructionHint:
      "격자는 어느 쪽이든 그대로예요. 달라지는 건 시작 코수와 양끝 처리예요.",
    selvedge: "시접 코 (한쪽)",
    selvedgeHint: "평면은 이음선이 생기므로 양쪽에 시접 코를 둬요",
    needCastOn: "시작 코수를 넣으면 무늬가 맞는지 계산해요",
    fitsExact: "{repeats}회 딱 맞아요 · {repeat}코 무늬 × {repeats}회",
    fitsShort:
      "{remainder}코가 남아요 · {repeat}코 무늬 {repeats}회 + {remainder}코",
    fitsNone: "{repeat}코 무늬가 한 번도 들어가지 않아요",
    fitsWithSelvedge: "시접 {edges}코를 뺀 {motif}코 기준이에요",
    nearestDown: "{n}코로 줄이면 맞아요",
    nearestUp: "{n}코로 늘리면 맞아요",
    switchTo: "{mode}으로 뜨면",
    switchTotal: "{n}코로 시작해요",
    /* 무엇이 달라지는지 — 사유는 도메인이 정하고 문장은 여기서 만든다 */
    noteEveryRowRs: "모든 단을 겉면에서 떠요",
    noteAlternatingSides: "겉면과 안면이 번갈아 나와요",
    noteMustDivide: "코수가 무늬 반복의 배수여야 무늬가 원을 돌아 이어져요",
    noteAddSelvedge: "양쪽에 시접 코를 더해요",
    noteDropSelvedge: "시접 코를 빼요",
    noteSeam: "이음선이 생겨요",
    noteMotifBreaks: "원을 돌아 이어지던 무늬가 양끝에서 끊겨요",
    noteJog: "단 경계에서 무늬가 한 코 어긋나 보일 수 있어요",
    /* 늘어놓기 — 숫자로 "몇 코 남는다"를 듣는 것과 어디서 잘리는지 보는 건 다르다 */
    tiled: "늘어놓아 보기",
    tiledHint:
      "시작 코수만큼 무늬를 늘어놓은 모습이에요. 끊기는 자리가 보여요.",
    counts: "기법별 칸 수",
    countsValue: "{n}칸",
    rowLabel: "{n}단",
    empty: "만든 기호 도안이 없어요",
    emptyHint:
      "무늬를 기호로 그려두면 코수가 맞는지 자동으로 검산하고, 한국어·영문 서술형 도안으로 바꿔줘요",
    deleteConfirm: "이 도안을 지울까요?",
  },
  /**
   * PDF 도안.
   *
   * 상용 도안은 대개 PDF로 온다. 이미지 도안과 같은 자리에 쓰이지만 페이지와
   * 읽던 자리가 붙는다.
   */
  /**
   * 스크랩 — 뜨기 전에 모으는 것들.
   *
   * 키 이름은 inspiration으로 남겼다(저장 이름과 맞춘다). 화면에는 "스크랩".
   *
   * 프로젝트가 없어도 존재한다. 스크랩은 대개 프로젝트보다 먼저 오고, 어느
   * 작품에 쓸지는 나중에 정해진다.
   */
  /**
   * 공유 카드 — 기획 §13.3.
   *
   * 커뮤니티를 열지 않는 대신 내 작업을 이미지로 내보낸다. 공유는 우리가
   * 만들고 커뮤니티는 남의 플랫폼에 둔다.
   */
  /**
   * 백업 — 기획 §3.13의 P0 "데이터 내보내기 · 락인 없음".
   *
   * 계정이 없으므로 기기를 바꾸거나 브라우저 데이터를 지우면 기록이 사라진다.
   * 이건 기능이 아니라 신뢰의 문제다.
   */
  backup: {
    invalid: "{n}개는 형태가 깨져서 넣지 못했어요",
    unknownValues:
      "이 버전이 모르는 값이 {n}곳 있어요. 그대로 두었으니 다시 내보내면 원래대로 나와요.",
    title: "백업",
    hint: "계정이 없어서 기록은 이 기기에만 있어요. 파일로 내보내 두면 기기를 바꿔도 옮길 수 있어요.",
    /* 내보내기 */
    exportTitle: "내보내기",
    exportAll: "사진까지 전부",
    exportRecordsOnly: "기록만 (사진 없이)",
    exportHint:
      "사진과 PDF가 용량의 거의 전부예요. 기록만 담으면 파일이 훨씬 작아요.",
    exporting: "만드는 중…",
    exported: "{n}개 기록을 내보냈어요 · {size}",
    exportFailed: "내보내기에 실패했어요",
    recordCount: "지금 {n}개 기록이 있어요",
    /* 가져오기 */
    importTitle: "가져오기",
    importPick: "백업 파일 고르기",
    importHint:
      "합치기는 이 기기에 있는 기록을 덮지 않아요. 덮어쓰기는 지금 것을 모두 지워요.",
    modeMerge: "합치기",
    modeReplace: "덮어쓰기",
    reading: "읽는 중…",
    importing: "넣는 중…",
    imported: "{n}개를 넣었어요",
    importedSkipped: "{n}개를 넣고 {skipped}개는 이미 있어서 건너뛰었어요",
    importedNone: "넣을 새 기록이 없었어요",
    notBackup: "knittinglog 백업 파일이 아니에요",
    tooNew:
      "더 새 버전에서 만든 파일이에요. 앱을 새로고침한 뒤 다시 시도해 주세요.",
    unknownTables: "이 앱이 모르는 항목 {tables}은(는) 넣지 않았어요",
    replaceConfirm: "지금 기록을 모두 지우고 넣을까요?",
    replaceConfirmBody: "이 기기의 기록 {n}개가 사라져요. 되돌릴 수 없어요.",
    /* 저장 공간 */
    storageTitle: "저장 공간",
    storageUsed: "{used} 사용 중",
    storageOf: "{used} / {quota}",
    storageUnknown: "브라우저가 알려주지 않아요",
    storageTight: "여유가 얼마 없어요. 사진을 정리하거나 백업해 두세요.",
    storageFull: "거의 찼어요. 사진이 저장되지 않을 수 있어요.",
    /* 영속성 — 이걸 못 받으면 브라우저가 데이터를 스스로 지울 수 있다 */
    persistTitle: "데이터 보호",
    persistOn: "브라우저가 이 기록을 함부로 지우지 않아요",
    persistOff: "저장 공간이 부족할 때 브라우저가 이 기록을 지울 수 있어요",
    persistAsk: "보호 요청하기",
    persistDenied: "브라우저가 허락하지 않았어요. 앱을 설치하면 대개 허락돼요.",
  },
  card: {
    open: "카드로 공유",
    title: "공유 카드",
    hint: "이 그림을 다른 앱으로 보낼 수 있어요. 카드는 늘 밝은 색으로 나와요.",
    share: "공유하기",
    downloadNote: "공유 시트가 없으면 이미지로 내려받아요",
    failed: "카드를 만들지 못했어요",
    /* 카드에 들어가는 값들 */
    madeOn: "{date}",
    projectRows: "뜬 단수",
    projectDays: "함께한 날",
    gaugeLabel: "게이지",
    needleLabel: "바늘",
    yarnLabel: "실",
    sizeLabel: "완성 크기",
    stitchesLabel: "코수",
    rowsLabel: "단수",
    repeatLabel: "무늬 반복",
    motifSize: "{w}코 × {h}단 무늬",
  },
  inspiration: {
    title: "스크랩",
    open: "스크랩",
    empty: "스크랩한 게 없어요",
    emptyHint:
      "핀터레스트나 인스타에서 본 무늬, 영상, 떠오른 한 줄을 스크랩해두면 새 작품을 시작할 때 꺼내 볼 수 있어요",
    /* 공유 시트가 이 기능의 주된 입구다 */
    shareTitle: "공유하기로 스크랩",
    shareHint:
      "핀터레스트·인스타·유튜브에서 공유하기를 누르고 knittinglog를 고르면 여기 쌓여요.",
    /* 공유 시트는 설치된 앱에서만 동작한다 — 그걸 모르면 왜 안 뜨는지 알 수 없다 */
    needInstall: "공유 목록에 뜨려면 앱을 설치해야 해요",
    goInstall: "설치 방법 보기",
    addManually: "직접 넣기",
    addManuallyHint: "공유가 안 되는 앱이나 PC에서는 주소를 붙여넣어요.",
    iosNote: "iOS는 아직 공유 대상이 되지 않아요. 여기에 붙여넣어 주세요.",
    addLink: "주소 붙여넣기",
    addImage: "이미지 고르기",
    urlLabel: "주소",
    urlPlaceholder: "https://…",
    titleLabel: "제목",
    noteLabel: "메모",
    save: "스크랩",
    /* 아직 안 붙인 것이 기본 상태다 */
    forProject: "어느 작품에",
    unassigned: "아직 안 정함",
    filterAll: "전체",
    filterUnassigned: "안 정한 것",
    count: "{n}개",
    received: "{n}개를 스크랩했어요",
    receivedNone: "받은 내용이 없어요",
    receiving: "받는 중…",
    openExternal: "원래 자리에서 열기",
    deleteConfirm: "이 스크랩을 지울까요?",
    /* 프로젝트 상세의 무드보드 */
    projectSection: "이 작품에 붙인 스크랩",
    projectEmpty: "이 작품에 붙인 스크랩이 없어요",
  },
  patternDoc: {
    add: "PDF 도안",
    title: "PDF 도안",
    pageOf: "{page}/{total}",
    prevPage: "이전 장",
    nextPage: "다음 장",
    pages: "{n}쪽",
    /* 넣을 때 한 번 읽어보므로 열 수 없는 파일은 여기서 걸린다 */
    notPdf: "PDF 파일만 넣을 수 있어요",
    failed: "이 PDF를 열 수 없어요. 암호가 걸렸거나 파일이 손상됐을 수 있어요.",
    adding: "읽는 중…",
    /* 처음 넣을 때만 받는다는 것을 알려둔다 — 오프라인에서 왜 되는지의 근거 */
    firstUseNote:
      "PDF를 읽는 데 필요한 파일을 처음 한 번만 받아요. 그 뒤로는 오프라인에서도 열려요.",
    resumed: "{page}쪽에서 이어봐요",
    deleteConfirm: "이 PDF 도안을 지울까요?",
  },
  photoChart: {
    open: "사진에서 옮기기",
    title: "사진에서 문양 옮기기",
    pick: "사진 고르기",
    retake: "다른 사진",
    /* 팔레트 출처 — 이게 이 기능의 갈림길이다 */
    source: "색을 어디서 가져올까요",
    fromPhoto: "사진에서 뽑기",
    fromStash: "내 실 색으로",
    /* 사진에서 뽑은 색은 살 수 없을 수도 있다 */
    fromPhotoHint: "사진에 있는 색을 그대로 써요. 그 색 실이 없을 수도 있어요.",
    fromStashHint: "스태시에 있는 실 색으로만 맞춰요. 바로 뜰 수 있어요.",
    noStash: "스태시에 화면 색이 있는 실이 없어요",
    colorCount: "색 개수",
    size: "칸 수",
    apply: "이 문양으로 바꾸기",
    /* 되돌릴 수 없는 행동이라 미리 알린다 */
    willReplace: "지금 그린 문양을 덮어써요",
    preview: "미리 보기",
  },
  calc: {
    noSwatch:
      "아래 숫자는 예시예요. 내 게이지를 재두면 계산이 내 크기로 맞아요.",
    myGauge: "내 게이지",
    pickGauge: "기록한 스와치에서 가져오기",
    manual: "직접 입력",
    /* 치수 → 코수 */
    toStitches: "치수 → 코수",
    width: "너비",
    length: "길이",
    resultStitches: "{n}코",
    resultRows: "{n}단",
    /* 도안 리사이징 */
    resize: "도안 리사이징",
    resizeHint:
      "도안이 의도한 완성 치수를 유지하면서 내 게이지로 다시 계산해요",
    patternGauge: "도안 게이지",
    patternStitches: "도안 코수",
    patternRows: "도안 단수",
    repeat: "무늬 반복 코수",
    repeatOffset: "가장자리 코수",
    resized: "내 게이지로 {sts}코 × {rows}단",
    deltaWarn: "무늬 배수를 맞추느라 {n} 차이가 생겨요",
    /* 바늘 제안 */
    needleSuggest: "바늘 조정",
    targetGauge: "목표 게이지",
    currentNeedle: "지금 쓰는 바늘 (mm)",
    goUp: "{mm}mm로 올려보세요",
    goDown: "{mm}mm로 내려보세요",
    needleOk: "측정 오차 범위예요. 그대로 뜨셔도 돼요.",
    /* 도식 */
    forProject: "{name}을(를) 위한 계산이에요",
    backToProject: "프로젝트로",
    saveToProject: "이 결과를 프로젝트 메모에 저장",
    saveDone: "메모에 저장했어요",
    savedNote:
      "도안 리사이징: 내 게이지 {gaugeSts}코×{gaugeRows}단 기준 {sts}코 × {rows}단",
    gridHint:
      "격자 한 칸은 10코 × 10단이에요. 뜨개 코는 정사각형이 아니라서 칸이 납작하거나 길쭉해요 — 그게 완성 모양이에요.",
    /* 몸 치수 연동 */
    fromProfile: "치수 프로필에서",
    finished: "완성 치수 {n}",
    flatPiece: "앞뒤로 나눠 뜨면 조각당 {n}",
  },
  /** 크기를 아는 물체. 규격이 정해져 있어서 지갑만 있으면 된다.
      참고 자료(reference)와 이름이 겹치지 않게 refObject로 둔다. */
  refObject: {
    "card-long": "카드 긴 변 (85.6mm)",
    "card-short": "카드 짧은 변 (54mm)",
    "coin-500": "500원 지름 (26.5mm)",
    "coin-100": "100원 지름 (24mm)",
    custom: "자로 직접 (길이 입력)",
  },
  photoGauge: {
    title: "사진으로 재기",
    open: "사진으로 재기",
    /* 자동 인식이 아니라는 걸 처음부터 말한다 */
    intro: "코는 직접 세고, 길이는 사진이 재요",
    pick: "스와치 사진 고르기",
    retake: "다른 사진",
    /* 1단계 — 기준 물체 */
    step1: "1. 크기를 아는 물체의 양 끝을 탭하세요",
    step1Hint: "카드나 동전을 스와치 옆에 놓고 함께 찍으면 돼요",
    refKind: "무엇을 놓았나요",
    refCustom: "두 점 사이 길이 (mm)",
    /* 2단계 — 편물 구간 */
    step2: "2. 편물에서 센 구간의 양 끝을 탭하세요",
    step2Hint: "많이 셀수록 정확해져요",
    countLabel: "그 구간의 코수",
    countLabelRows: "그 구간의 단수",
    /* 결과 */
    measuring: "가로(코수)",
    measuringRows: "세로(단수)",
    spanIs: "{n}mm 구간",
    result: "10cm당 {n}코",
    resultRows: "10cm당 {n}단",
    tolerance: "± {n}",
    /* 오차가 크면 알려준다. 문장보다 숫자가 줄어드는 걸 보여주는 게 빠르다. */
    tooRough: "오차가 커요. 더 많은 코를 세거나 기준 물체를 길게 잡아보세요.",
    reset: "점 다시 찍기",
    apply: "이 값으로 기록",
    needBoth: "가로와 세로를 모두 재면 기록할 수 있어요",
    ref: "기준",
    span: "구간",
  },
  profile: {
    title: "치수 프로필",
    add: "프로필 추가",
    edit: "프로필 수정",
    name: "이름",
    namePlaceholder: "나",
    ease: "여유분",
    easeHint: "실측에 더하는 여유예요. 몸에 붙는 옷은 음수로 둬요.",
    filled: "{n}개 입력됨",
    empty: "프로필이 없어요",
    emptyHint: "한 번 재두면 계산기가 매번 물어보지 않아요",
    deleteConfirm: "이 프로필을 지울까요?",
    measure: {
      bust: "가슴둘레",
      waist: "허리둘레",
      hip: "엉덩이둘레",
      shoulder: "어깨너비",
      armLength: "팔길이",
      upperArm: "위팔둘레",
      backLength: "등길이",
      headCirc: "머리둘레",
      footLength: "발길이",
      footCirc: "발볼둘레",
    },
    /** 이름만으로는 어디를 재는지 알 수 없다. 재는 자리와 방법을 함께 준다. */
    measureHint: {
      bust: "가슴에서 가장 굴곡진 곳을 수평으로 한 바퀴. 줄자가 등에서 처지지 않게.",
      waist: "허리에서 가장 얇은 곳을 한 바퀴. 숨을 참지 말고 편하게.",
      hip: "엉덩이에서 가장 굴곡진 곳을 한 바퀴.",
      shoulder: "한쪽 어깨 끝에서 반대쪽 어깨 끝까지, 등 쪽으로 재요.",
      armLength: "어깨 끝에서 손목뼈까지. 팔을 살짝 굽힌 상태로 재요.",
      upperArm: "팔에서 가장 굵은 곳(겨드랑이 바로 아래)을 한 바퀴.",
      backLength: "목 뒤로 튀어나온 뼈에서 허리선까지 곧게 내려서.",
      headCirc: "이마 위와 뒤통수에서 가장 튀어나온 곳을 지나 한 바퀴.",
      footLength: "발뒤꿈치에서 가장 긴 발가락 끝까지. 서서 재는 게 정확해요.",
      footCirc: "발볼에서 가장 넓은 곳을 한 바퀴.",
    },
    easePreset: {
      negative: "몸에 붙게",
      close: "딱 맞게",
      classic: "표준",
      relaxed: "여유롭게",
      oversized: "오버핏",
    },
  },
  dashboard: {
    resume: "이어서 뜨기",
    resumeEmpty: "지금 뜨고 있는 게 없어요",
    resumeEmptyHint: "멈춰둔 걸 다시 꺼내거나 새로 시작해봐요",
    counterOf: "{label} {value}단",
    /** 상태 요약 — 누르면 그 상태로 필터된 목록으로 간다 */
    summary: "지금 상태",
    finishedThisYear: "올해 완성",
    /** 죄책감이 아니라 가시성을 위한 목록이다 */
    waiting: "기다리는 중",
    waitingHint: "잊혀서 멈춘 거라면 여기서 다시 만나요",
    thisWeek: "이번 주",
    allTime: "누적",
    rows: "{n}단",
    hours: "{h}시간 {m}분",
    minutes: "{m}분",
    days: "{n}일",
    streak: "{n}일째 연속",
    noActivity: "아직 뜬 기록이 없어요",
    emptyTitle: "첫 프로젝트를 등록해볼까요",
    emptyHint: "하다 만 것부터 넣어도 괜찮아요. 그게 이 앱의 목적이에요.",
  },
  photo: {
    title: "사진",
    history: "진행 기록",
    add: "기록 추가",
    saving: "저장 중",
    /* 조용히 실패하면 사진이 올라간 줄 안다 */
    quotaFull: "저장 공간이 부족해요. 설정에서 정리하거나 백업해 주세요.",
    saveFailed: "저장하지 못했어요",
    empty: "사진이 없어요",
    emptyHint:
      "사진을 올리면 그때 단수와 날짜가 함께 남아요. 다시 꺼낼 때 어디까지 떴는지 바로 알 수 있어요.",
    /** 사진을 시각이 아니라 진행으로 읽게 하는 값 */
    atRow: "{label} {n}단",
    count: "{n}장",
    caption: "사진 설명",
    captionPlaceholder: "여기서 진동 줄임",
    setCover: "목록 대표로",
    isCover: "목록 대표 사진",
    deleteConfirm: "이 사진을 지울까요?",
    prev: "이전 사진",
    next: "다음 사진",
  },
  reference: {
    title: "참고 자료",
    addImage: "이미지",
    addVideo: "영상 링크",
    url: "유튜브 주소",
    notYouTube: "유튜브 주소가 아니에요",
    videoTitle: "제목",
    videoTitlePlaceholder: "래글런 줄임 방법",
    note: "메모",
    notePlaceholder: "8분 30초부터 진동 줄임",
    video: "참고 영상",
    play: "영상 재생",
    stop: "닫기",
    pause: "일시정지",
    resume: "다시 재생",
    openExternal: "유튜브에서 열기",
    offline: "영상을 보려면 인터넷이 필요해요",
    embedBlocked:
      "이 영상은 소유자가 다른 사이트에서 재생할 수 없게 설정했어요. 유튜브에서 보셔야 해요.",
    unavailable: "영상을 찾을 수 없어요. 비공개이거나 삭제된 것 같아요.",
    playbackFailed: "영상을 재생하지 못했어요. 유튜브에서 열어보세요.",
    onlyOnYouTube: "유튜브에서만",
    empty: "참고 자료가 없어요",
    emptyHint:
      "뜨고 싶은 모양, 배색 견본, 도안 영상을 모아두면 뜨는 동안 계속 꺼내 볼 수 있어요",
  },
  workbench: {
    all: "전체",
    pdf: "PDF",
    pattern: "도안",
    reference: "참고",
    video: "영상",
    addPattern: "도안 이미지",
    addReference: "참고 이미지",
    split: "분할",
    zoom: "확대",
    resize: "칸 너비 조절",
    pickItem: "아래에서 볼 항목을 골라주세요",
    empty: "아직 올려둔 자료가 없어요",
    emptyHint:
      "도안 이미지와 참고 사진, 영상 링크를 올려두면 여기서 나란히 놓고 볼 수 있어요. 넓은 화면에서는 도안과 영상을 좌우로 나눠 볼 수 있어요.",
    emptyKnit: "작업대에 도안이나 참고 자료를 올려두면 뜨면서 볼 수 있어요",
    deleteImageConfirm: "이 이미지를 지울까요?",
    deleteVideoConfirm: "이 영상 링크를 지울까요?",
  },
  needle: {
    noneAddHere: "여기서 바로 등록할 수 있어요. 넣어두면 바늘 서랍에도 남아요.",
    addHere: "새 바늘 등록",
    title: "바늘",
    add: "바늘 추가",
    edit: "바늘 수정",
    typeLabel: "종류",
    type: {
      circular: "줄바늘",
      straight: "막대바늘",
      dpn: "장갑바늘",
      hook: "코바늘",
    },
    size: "굵기",
    sizeHint: "바늘에 찍힌 호수로 찾아도 돼요. mm·호수·US를 함께 보여줘요.",
    length: "줄 길이 (cm)",
    lengthHint:
      "줄바늘의 줄 길이예요. 같은 굵기라도 길이가 다르면 다른 바늘이에요.",
    material: "재질",
    materialPlaceholder: "대나무, 금속, 플라스틱",
    duplicate: "이미 같은 바늘이 있어요. 정말 두 개면 그대로 두셔도 돼요.",
    empty: "등록한 바늘이 없어요",
    emptyHint:
      "가진 바늘을 넣어두면 새 작품을 시작할 때 그 굵기가 다른 작품에 물려 있는지 알려드려요",
    tally: "{total}개 중 {free}개 여유",
    free: "여유",
    inUse: "{project}에 물려 있어요",
    deleteConfirm: "이 바늘을 서랍에서 지울까요?",
    /* 프로젝트 쪽 */
    projectTitle: "쓰는 바늘",
    assign: "바늘 물리기",
    none: "물린 바늘이 없어요",
    pick: "어떤 바늘을 쓸까요?",
    release: "빼기",
    takenTitle: "이 바늘은 다른 작품에 물려 있어요",
    takenBody:
      "{project}에서 빼서 이 작품에 물릴까요? 실제로 바늘을 옮기는 것과 같아요.",
    takenConfirm: "여기로 옮기기",
    gaugeSuggest: "게이지가 {mm}mm를 요구해요",
    gaugeMissing: "{mm}mm 바늘이 서랍에 없어요",
  },
  shaping: {
    title: "균등 증감",
    hint: "지금 코수에서 목표 코수로 고르게 늘리거나 줄여요. 게이지는 필요 없어요.",
    from: "지금 코수",
    to: "목표 코수",
    inRound: "원형",
    flat: "평면",
    edge: "양끝 코",
    increase: "늘림",
    decrease: "줄임",
    increaseCount: "{n}코 늘림",
    decreaseCount: "{n}코 줄임",
    /** 도안이 적는 방식 — 이 문장을 그대로 보고 뜰 수 있어야 한다 */
    step: "{plain}코 뜨고 {action} ×{times}",
    tail: "끝 {n}코",
    edgeNote: "양끝 {n}코는 그대로",
    result: "→ {n}코",
    even: "고르게 나눠졌어요",
    nothing: "코수가 같아요. 늘리거나 줄일 게 없어요.",
    impossible:
      "{from}코로는 {n}번 줄일 수 없어요 — 최소 {needed}코가 필요해요",
    diagram: "증감이 놓이는 자리",
  },
  curve: {
    title: "목선 · 암홀 곡선",
    hint: "한쪽에서 줄일 코수를 여러 단에 나눠 곡선을 만들어요. 도안 표기로 보여줘요.",
    stitches: "줄일 코수 (한쪽)",
    rows: "걸칠 단수",
    firstBindOff: "첫 코막음",
    firstBindOffHint:
      "진동 밑에서 한 번에 막는 코수예요. 목선처럼 한 번에 막지 않으면 0으로 두세요.",
    everyRow: "매 단",
    everyOtherRow: "두 단마다",
    notationLegend: "코수-단수-횟수",
    stepFirst: "{stitches}코를 한 번에",
    step: "{stitches}코를 {interval}단마다 {times}번",
    result: "{stitches}코 · {rows}단",
    plainRows: "평단 {n}단",
    steep: "한 번에 {n}코를 막아요. 단수를 늘리면 곡선이 완만해져요.",
    impossible: "줄일 단이 없어요. 최소 {n}단이 필요해요.",
    nothing: "줄일 코가 없어요.",
    diagram: "곡선 모양",
  },
  action: {
    create: "만들기",
    save: "저장",
    cancel: "취소",
    edit: "수정",
    delete: "삭제",
    back: "뒤로",
    close: "닫기",
  },
  /*
    입력이 잘못됐을 때 하는 말.

    전에는 오류 자리에 그 칸의 라벨을 넣었다("이름"). 이름 칸 밑에 "이름"이
    떠도 무엇이 잘못됐는지는 알 수 없다. 그리고 크기 검사는 아무 말 없이
    돌아섰다 — 버튼을 눌러도 아무 일도 일어나지 않으면 고장난 것으로 읽힌다.
  */
  validate: {
    nameRequired: "이름을 넣어주세요",
    sizeRequired: "1 이상 숫자로 넣어주세요",
    maxStitches: "최대 {n}코",
    maxRows: "최대 {n}단",
  },
  install: {
    title: "앱으로 설치",
    installed: "앱으로 실행 중이에요",
    hint: "홈 화면에 설치하면 오프라인에서도 쓸 수 있어요",
    alreadyInstalled: "이미 설치돼 있어요",
    openFromLauncher: "홈 화면이나 앱 목록에서 열면 앱으로 실행돼요",
    action: "설치하기",
    unavailable: "이 브라우저에서는 앱 안에서 설치할 수 없어요",
    // 브라우저마다 메뉴 이름이 다르다. "홈 화면에 추가"는 바로가기만 만들고
    // 앱으로 설치되지 않으므로 구분해서 안내한다.
    manual:
      "Chrome 메뉴에서 '앱 설치'를 눌러주세요. '홈 화면에 추가'는 바로가기만 만들어요.",
  },
  settings: {
    language: "언어 / Language",
    theme: "테마",
    themeSystem: "시스템",
    themeLight: "라이트",
    themeDark: "다크",
    units: "단위계",
  },
  common: {
    notFound: "없는 화면이에요",
    notFoundHint: "주소가 바뀌었거나 지워진 화면일 수 있어요.",
    empty: "아직 없어요",
    loading: "불러오는 중",
  },
};

export type UIStrings = typeof ko;
