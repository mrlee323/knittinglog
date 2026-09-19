/**
 * 빈 상태를 잰다 (discuss/007).
 *
 * **관문 A — 목록 카드의 빈 윗면**(사진도 실도 없는 프로젝트)
 *   A1. 잉크 비율 ≥ 3.0%          — 얼마나 있나
 *   A2. 잉크가 닿은 세로줄 ≤ 60%  — 어디까지 퍼졌나 (005의 줄공책을 막는다)
 *   A3. 잉크 픽셀의 평균 채널차 ≥ 24/255 — 보이기는 하나
 *
 * **A3는 구현이 붙였다.** A1은 `채널차 > 6`인 픽셀을 **1로 세는 이진 판정**이라
 * 채널차 7짜리 픽셀과 160짜리 픽셀을 똑같이 센다. 기준점이 된 실 색 스와치는
 * 잰 값이 6.98%인데 그 잉크의 평균 채널차가 160.5다. 무채 구조로 3%를 채우면
 * 같은 3%라도 채널차가 10대일 수 있고, 그러면 **관문은 통과하는데 화면은
 * 그대로 비어 보인다.** 015에서 토큰 테스트가 복사된 상수끼리 비교해 통과했던
 * 것과 같은 종류다(WORKLIST.md의 "반복되는 실패 하나").
 *
 * **관문 B — 홈**
 *   B1. 프로젝트 0개 — 샘플 정확히 1개 · CTA 정확히 1개 ·
 *       샘플은 `/projects/new`로 가고 **아무것도 저장하지 않는다**
 *   B2. 첫날(프로젝트 1개·계획중·사진/실/카운터/세션 없음) — 결핍 블록 1개 이하
 *
 * **B2의 세는 규칙은 기획이 못 박았다**(007). 탭바 위에 그려진 것 중
 *   (a) 본문이 `없어요`로 끝나는 안내 블록
 *   (b) 값이 정확히 `0`인 통계 타일
 * 의 합이다. **복귀 카드의 단수는 세지 않는다** — 타일이 아니고 006의 앵커다.
 * 기준 언어는 한국어다.
 *
 * 바탕색은 **실제 계산 스타일에서 읽는다.** 상수로 박으면 `index.css`를 고쳐도
 * 관문이 눈치채지 못한다 — 015가 정확히 그렇게 통과했다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-empty.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 관문 값. 바꾸려면 discuss/007에 근거를 적고 바꾼다. */
const A1_최소 = 0.03; // 잉크 비율
const A2_최대 = 0.6; // 잉크가 닿은 세로줄 비율
const A3_최소 = 24; // 잉크 픽셀의 평균 채널차 (0~255)
const B2_최대 = 1; // 첫날 홈의 결핍 블록 수
/** 잉크로 칠 채널차. 005 검증이 쓴 계열과 같다. */
const 잉크_문턱 = 6;

const PW = process.env.PW || "playwright";
let chromium;
try {
  ({ chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW));
} catch (e) {
  console.error("환경 문제: playwright를 불러오지 못했습니다.");
  console.error("  " + e.message);
  console.error("  PW=<playwright 경로> 로 지정하세요.");
  process.exit(ENV_FAIL);
}

const BASE = process.env.SHOT_BASE ?? "http://localhost:5173/knittinglog";

const browser = await chromium
  .launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  .catch((e) => {
    console.error("환경 문제: 브라우저를 띄우지 못했습니다.");
    console.error("  " + e.message);
    console.error("  CHROMIUM_PATH=/경로/chromium 으로 지정하세요.");
    process.exit(ENV_FAIL);
  });

// 폰에서만 잰다(007 — 넓은 화면은 011이다). safe-area는 CDP로 진짜 값을 준다.
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("  [page error]", e.message));

try {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 15000 });
} catch (e) {
  console.error(`환경 문제: ${BASE} 를 열지 못했습니다. npm run dev 가 떠 있습니까?`);
  console.error("  " + e.message);
  await browser.close();
  process.exit(ENV_FAIL);
}

const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setSafeAreaInsetsOverride", {
  insets: { top: 47, left: 0, bottom: 34, right: 0 },
});

/** 기준 언어는 한국어다. 세는 규칙이 `없어요`에 걸려 있다. */
await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

const fail = [];

/** DB를 비우고 주어진 프로젝트만 심는다. 남은 데이터가 있으면 재현이 안 된다. */
async function seed(projects) {
  await page.evaluate(async (list) => {
    const { db } = await import("/knittinglog/src/lib/db.ts");
    await db.delete();
    await db.open();
    const now = new Date();
    for (const p of list) {
      await db.projects.add({
        id: p.id,
        name: p.name,
        craft: "knit",
        category: p.category,
        status: p.status,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  }, projects);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
}

/* ── 관문 A — 목록 카드의 빈 윗면 ──────────────────────────────────────── */

await seed([
  { id: "e1", name: "이름만 있는 목도리", category: "accessory", status: "planning" },
]);
await page.goto(BASE + "/projects", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

const 윗면 = await page.evaluate(() => {
  const fb = document.querySelector("main ul li [aria-hidden].bg-sunken");
  if (!fb) return null;
  const r = fb.getBoundingClientRect();
  return {
    bg: getComputedStyle(fb).backgroundColor,
    x: r.x,
    y: r.y,
    w: r.width,
    h: r.height,
  };
});

console.log("관문 A — 사진도 실도 없는 카드의 윗면");
if (!윗면 || 윗면.w < 8 || 윗면.h < 8) {
  console.error("\n환경 문제: 목록에서 대체 윗면을 찾지 못했습니다. 화면 구조가 바뀌었습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}

// **가장자리 1px을 뺀다.** 요소 크기를 그대로 찍으면 이웃 요소의 경계선 한 줄이
// 딸려 들어오고, 그 한 줄이 폭 전체를 덮어 A2가 100%로 읽힌다 — 실 색 스와치
// 카드를 그렇게 재보다가 잡았다.
const clip = {
  x: 윗면.x + 1,
  y: 윗면.y + 1,
  width: 윗면.w - 2,
  height: 윗면.h - 2,
};
const shot = (await page.screenshot({ clip })).toString("base64");

const ink = await page.evaluate(
  async ({ shot, bg, 문턱 }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + shot;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const [br, bgc, bb] = bg.match(/[\d.]+/g).map(Number);
    const cols = new Set();
    let n = 0;
    let sum = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const o = (y * c.width + x) * 4;
        const diff = Math.max(
          Math.abs(d[o] - br),
          Math.abs(d[o + 1] - bgc),
          Math.abs(d[o + 2] - bb),
        );
        if (diff > 문턱) {
          n += 1;
          sum += diff;
          cols.add(x);
        }
      }
    }
    return {
      w: c.width,
      h: c.height,
      비율: n / (c.width * c.height),
      열: cols.size / c.width,
      평균차: n ? sum / n : 0,
      잉크수: n,
    };
  },
  { shot, bg: 윗면.bg, 문턱: 잉크_문턱 },
);

console.log(`  바탕색(계산 스타일) ${윗면.bg} · 래스터 ${ink.w}×${ink.h}`);
console.log(`  A1 잉크 비율     ${(ink.비율 * 100).toFixed(2)}%  (최소 ${A1_최소 * 100}%)`);
console.log(`  A2 잉크 세로줄   ${(ink.열 * 100).toFixed(1)}%  (최대 ${A2_최대 * 100}%)`);
console.log(`  A3 평균 채널차   ${ink.평균차.toFixed(1)}/255  (최소 ${A3_최소})`);
if (ink.비율 < A1_최소)
  fail.push(`A1: 잉크가 ${(ink.비율 * 100).toFixed(2)}%뿐이다 (최소 ${A1_최소 * 100}%)`);
if (ink.열 > A2_최대)
  fail.push(`A2: 잉크가 세로줄 ${(ink.열 * 100).toFixed(1)}%에 퍼졌다 (최대 ${A2_최대 * 100}%) — 괘선이 됐는지 본다`);
if (ink.평균차 < A3_최소)
  fail.push(`A3: 잉크 평균 채널차가 ${ink.평균차.toFixed(1)}이다 (최소 ${A3_최소}) — 있지만 안 보이는 잉크다`);

/* ── 관문 B1 — 프로젝트 0개 ────────────────────────────────────────────── */

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await seed([]);

const b1 = await page.evaluate(() => {
  const samples = [...document.querySelectorAll("main [data-sample]")];
  const ctas = [...document.querySelectorAll("main a[href*='/projects/new'] button")];
  return {
    샘플: samples.length,
    cta: ctas.length,
    샘플링크: samples[0]?.getAttribute("href") ?? null,
    // 샘플 안에 진짜 뜨기 링크가 있으면 아무것도 없는 앱에서 죽은 링크가 된다
    샘플안의뜨기: samples[0] ? samples[0].querySelectorAll("a[href*='/knit']").length : 0,
  };
});

const 심기전 = await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  const n = await Promise.all(db.tables.map((t) => t.count()));
  return n.reduce((a, b) => a + b, 0);
});

console.log("\n관문 B1 — 프로젝트 0개");
console.log(`  샘플 카드 ${b1.샘플}개 (정확히 1) · CTA ${b1.cta}개 (정확히 1)`);
console.log(`  샘플 링크 ${b1.샘플링크}`);

if (b1.샘플 !== 1) fail.push(`B1: 샘플 카드가 ${b1.샘플}개다 (정확히 1이어야 한다)`);
if (b1.cta !== 1) fail.push(`B1: CTA가 ${b1.cta}개다 (정확히 1이어야 한다)`);
if (b1.샘플안의뜨기 > 0) fail.push("B1: 샘플 안에 진짜 `뜨기` 링크가 있다");
if (!b1.샘플링크 || !b1.샘플링크.endsWith("/projects/new"))
  fail.push(`B1: 샘플이 \`/projects/new\`로 가지 않는다 (${b1.샘플링크})`);

if (b1.샘플 === 1) {
  await page.click("main [data-sample]");
  await page.waitForTimeout(600);
  const 도착 = new URL(page.url()).pathname;
  const 심은후 = await page.evaluate(async () => {
    const { db } = await import("/knittinglog/src/lib/db.ts");
    const n = await Promise.all(db.tables.map((t) => t.count()));
    return n.reduce((a, b) => a + b, 0);
  });
  console.log(`  샘플을 눌렀더니 ${도착} · 저장된 레코드 ${심기전} → ${심은후}`);
  if (!도착.endsWith("/projects/new"))
    fail.push(`B1: 샘플을 눌렀더니 ${도착}로 갔다`);
  if (심은후 !== 심기전)
    fail.push(`B1: 샘플을 눌렀더니 레코드가 ${심기전}→${심은후}로 늘었다 (아무것도 저장하지 않아야 한다)`);
}

/* ── 관문 B2 — 첫날 ────────────────────────────────────────────────────── */

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await seed([
  { id: "d1", name: "이름만 있는 목도리", category: "accessory", status: "planning" },
]);

const b2 = await page.evaluate(() => {
  const main = document.querySelector("main");
  const 문구 = [];
  // (a) 본문이 `없어요`로 끝나는 안내 블록. 잎 요소만 센다 — 조상까지 세면
  //     같은 문장이 여러 번 잡힌다.
  for (const el of main.querySelectorAll("*")) {
    if (el.children.length > 0) continue;
    const text = (el.textContent ?? "").trim();
    if (text.endsWith("없어요")) 문구.push(text);
  }
  // (b) 값이 정확히 `0`인 통계 타일. 복귀 카드의 단수는 타일이 아니라 세지 않는다.
  const 타일 = [];
  for (const a of main.querySelectorAll("a[href*='status=']")) {
    const v = a.querySelector("p")?.textContent?.trim();
    if (v === "0") 타일.push(a.getAttribute("href"));
  }
  const 복귀단수 = document
    .querySelector("main section .text-display")
    ?.textContent?.trim();
  return { 문구, 타일, 복귀단수 };
});

const 결핍 = b2.문구.length + b2.타일.length;
console.log("\n관문 B2 — 첫날(프로젝트 1개 · 계획중 · 사진/실/카운터/세션 없음)");
console.log(`  (a) \`없어요\`로 끝나는 블록 ${b2.문구.length}개 ${JSON.stringify(b2.문구)}`);
console.log(`  (b) 값이 0인 통계 타일 ${b2.타일.length}개 ${JSON.stringify(b2.타일)}`);
console.log(`  복귀 카드의 단수 "${b2.복귀단수}" — 세지 않는다(006의 앵커)`);
console.log(`  합계 ${결핍}개 (최대 ${B2_최대})`);
if (결핍 > B2_최대) fail.push(`B2: 결핍 블록이 ${결핍}개다 (최대 ${B2_최대})`);

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
