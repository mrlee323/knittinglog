/**
 * 홈 첫 카드가 첫 화면 예산 안에 있는지 잰다 (discuss/003 · discuss/006).
 *
 * **실물을 잰다.** 003 때는 큰 사진 카드가 없어서 `height:Npx` 스페이서를 끼워
 * 흉내냈고, 003 자신이 "지금 값은 예산이지 결과가 아니다. 005·006에서 실제
 * 카드가 생긴 뒤 다시 돌려야 한다"고 적어뒀다. 006이 그 카드를 만들었다.
 *
 * 관문 넷. 순서가 중요하다 — 0이 깨지면 아래는 전부 무의미하다.
 *   0. 실물을 재고 있나 — 첫 카드의 사진 요소를 찾는다. 못 찾으면 **종료코드 2**
 *   1. 사진 높이 ≤ 카드 내부 폭 × 3/4 (`aspect-[4/3]` 상한) · 둘째 카드 100px 이상
 *   2. `뜨기` 전체가 탭바 위에 보이고 24px 이상 남는다
 *   3. **카운터가 없어도 `뜨기`가 있다**
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 * safe-area는 CDP로 진짜 값을 준다. 클래스를 덮어 흉내내면 `env()`를 직접 쓰는
 * 규칙이 0으로 남는다 — 004에서 실제로 그랬다.
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-safe-area.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

const PW = process.env.PW || "playwright";
let chromium;
try {
  ({ chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW));
} catch (e) {
  console.error("환경 문제: playwright를 불러오지 못했습니다.");
  console.error("  " + e.message);
  console.error("  PW=<playwright 경로> 로 지정하거나 npx --yes -p playwright@latest 로 받으세요.");
  process.exit(ENV_FAIL);
}

const BASE = process.env.SHOT_BASE ?? "http://localhost:5173/knittinglog";
const 여유_최소 = 24;    // 터치 목표 44px의 절반 (003 · 기획)
/**
 * 둘째 카드가 보여야 하는 높이. **사람이 100px로 확정했다**(003).
 *
 * 무엇으로 이루어진 값인지는 재뒀다 — 기다리는 줄 하나가 65px, 줄 간격이 8px이다.
 * 그러니 100px은 **한 줄 + 간격 + 다음 줄의 27px**이다. 줄 높이가 바뀌면 이 값이
 * 무엇을 보장하는지도 바뀌므로 그때 다시 재야 한다.
 */
const 둘째_최소 = 100;

/**
 * 기기. **뷰포트와 safe-area를 같은 줄에 둔다.**
 * 13 mini는 화면이 가장 낮아 가장 불리하다 — 큰 기기만 재면 통과가 낙관 쪽으로
 * 치우친다(003 · 검증).
 */
const DEVICES = [
  { name: "헤드리스 390×844 safe0", w: 390, h: 844, top: 0, bottom: 0, baseline: true },
  { name: "아이폰14 390×844", w: 390, h: 844, top: 47, bottom: 34 },
  { name: "15 Pro 393×852", w: 393, h: 852, top: 59, bottom: 34 },
  { name: "13 mini 375×812", w: 375, h: 812, top: 50, bottom: 34 },
];


const browser = await chromium
  .launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  .catch((e) => {
    console.error("환경 문제: 브라우저를 띄우지 못했습니다.");
    console.error("  " + e.message);
    console.error("  CHROMIUM_PATH=/경로/chromium 으로 지정하세요.");
    process.exit(ENV_FAIL);
  });

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("  [page error]", e.message));
// **클래스를 덮지 않고 진짜 `env()`를 준다.** 흉내내면 `env()`를 직접 쓰는 규칙이
// 0으로 남아 고친 것이 안 고쳐진 것처럼 읽힌다 — 004에서 실제로 그랬다.
const cdp = await ctx.newCDPSession(page);

try {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 15000 });
} catch (e) {
  console.error(`환경 문제: ${BASE} 를 열지 못했습니다. npm run dev 가 떠 있습니까?`);
  console.error("  " + e.message);
  await browser.close();
  process.exit(ENV_FAIL);
}

// DB를 비우고 고정으로 둘을 넣는다. 남은 데이터가 있으면 재현 관문이 무의미하다.
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete();
  await db.open();
  const now = new Date();
  await db.projects.add({
    id: "measure-project", name: "측정용 스웨터", craft: "knit", category: "sweater",
    status: "active", startedAt: now, createdAt: now, updatedAt: now,
  });
  await db.counters.add({
    id: "measure-counter", projectId: "measure-project", label: "단수", kind: "row",
    value: 42, step: 1, sortOrder: 0, target: 200, createdAt: now, updatedAt: now,
  });
  // 첫 카드의 사진이 실물이어야 관문 0이 의미를 갖는다.
  const c = document.createElement("canvas");
  c.width = 400; c.height = 300;
  const g = c.getContext("2d");
  g.fillStyle = "#6b7f6e"; g.fillRect(0, 0, 400, 300);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  await db.projectPhotos.add({
    id: "measure-photo", projectId: "measure-project", blob,
    takenAt: now, createdAt: now, updatedAt: now,
  });
  await db.projects.update("measure-project", { coverPhotoId: "measure-photo" });
  const paused = new Date(now.getTime() - 30 * 864e5);
  await db.projects.add({
    id: "measure-project-2", name: "측정용 양말", craft: "knit", category: "socks",
    status: "hibernating", pauseReason: "out-of-yarn", startedAt: paused,
    pausedAt: paused, createdAt: paused, updatedAt: paused,
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

/** 기기를 바꾼다. **클래스를 덮지 않는다** — CDP로 진짜 safe-area를 준다. */
async function apply(dev) {
  await page.setViewportSize({ width: dev.w, height: dev.h });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: dev.top, left: 0, bottom: dev.bottom, right: 0 },
  });
  await page.waitForTimeout(250);
}

async function read() {
  return page.evaluate(() => {
    const nav = document.querySelector("nav.fixed.inset-x-0");
    // 첫 카드 = "이어서 뜨기" 절의 카드. 그 안의 사진과 `뜨기` 버튼을 잡는다.
    const card = document.querySelector("main section > div.border-line");
    const photo = card?.querySelector("img");
    const cta = document.querySelector("main a[href*='/knit'] button");
    // 둘째 카드 = "기다리는 중"의 첫 줄. 001이 상한을 정할 때 쓴 조건이다.
    const second = document.querySelector("main section ul li a");
    const n = nav?.getBoundingClientRect();
    const c = cta?.getBoundingClientRect();
    const s2 = second?.getBoundingClientRect();
    const cr = card?.getBoundingClientRect();
    const pr = photo?.getBoundingClientRect();
    const cs = card ? getComputedStyle(card) : null;
    const innerW = cr && cs
      ? Math.round(cr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
      : null;
    return {
      navTop: n ? Math.round(n.top) : null,
      ctaBottom: c ? Math.round(c.bottom) : null,
      secondTop: s2 ? Math.round(s2.top) : null,
      cardInnerW: innerW,
      photoH: pr ? Math.round(pr.height) : null,
      hasCard: !!card,
      hasPhoto: !!photo,
      hasCta: !!cta,
      hasSecond: !!second,
    };
  });
}

const fail = [];

// ── 관문 0 — 실물을 재고 있나 ──
// 이게 깨지면 아래 판정이 전부 무의미하다. 통과가 아니라 **환경 문제**로 끝낸다.
await apply(DEVICES[0]);
const base = await read();
console.log("관문 0 — 실물 확인");
for (const [what, ok] of [
  ["첫 카드", base.hasCard],
  ["첫 카드의 사진", base.hasPhoto],
  ["`뜨기` 버튼", base.hasCta],
  ["둘째 카드", base.hasSecond],
]) {
  console.log(`  ${what}: ${ok ? "찾음" : "**못 찾음**"}`);
}
if (!base.hasCard || !base.hasPhoto || !base.hasCta || !base.hasSecond) {
  console.error("\n환경 문제: 화면에서 잴 것을 찾지 못했습니다. 구조가 바뀌었습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}

// ── 관문 1·2 — 기기별로 잰다 ──
console.log("\n| 기기 | 카드 내부 폭 | 사진 높이 | 상한(폭×3/4) | CTA 여유 | 둘째 카드 | 판정 |");
console.log("| ---- | ------------ | --------- | ------------ | -------- | --------- | ---- |");
for (const dev of DEVICES) {
  await apply(dev);
  const r = await read();
  const cap = Math.round(r.cardInnerW * (3 / 4));
  const gap = r.navTop - r.ctaBottom;
  const seen2 = r.navTop - r.secondTop;
  const photoOk = r.photoH <= cap;
  const ctaOk = r.ctaBottom <= r.navTop && gap >= 여유_최소;
  const secondOk = seen2 >= 둘째_최소;
  const why = photoOk ? (ctaOk ? (secondOk ? "통과" : "둘째 탈락") : "CTA 탈락") : "사진 탈락";
  console.log(
    `| ${dev.name} | ${r.cardInnerW}px | ${r.photoH}px | ${cap}px | ${gap}px | ${seen2 > 0 ? seen2 + "px" : "안 보임"} | ${why} |`,
  );
  if (!photoOk) fail.push(`${dev.name}: 사진 ${r.photoH}px가 상한 ${cap}px를 넘는다`);
  if (!ctaOk) fail.push(`${dev.name}: \`뜨기\` 여유가 ${gap}px (최소 ${여유_최소})`);
  if (!secondOk) fail.push(`${dev.name}: 둘째 카드가 ${seen2}px (최소 ${둘째_최소})`);
}

// ── 관문 3 — 카운터가 없어도 `뜨기`가 있다 ──
// 006 이전에는 `projectCounters.length > 0`일 때만 그렸다. 그러면 "눌러야 할 것이
// 하나로 선명하다"는 그 하나가 없는 화면이 생긴다.
console.log("\n관문 3 — 카운터 없는 프로젝트만 있을 때");
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.counters.clear();
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
await apply(DEVICES[1]);
const noCounter = await read();
console.log(`  \`뜨기\` 버튼: ${noCounter.hasCta ? "있다" : "**없다**"}`);
if (!noCounter.hasCta) fail.push("카운터가 없으면 `뜨기` 버튼이 사라진다");

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
