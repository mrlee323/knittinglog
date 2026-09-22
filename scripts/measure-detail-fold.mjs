/**
 * 프로젝트 상세의 접힘을 잰다 (discuss/009).
 *
 * 009의 완료 기준은 셋인데, 접는 일의 진짜 위험은 기준에 없다 — **길이 사라지는
 * 것**이다. 빈 섹션을 지우면 화면은 곧바로 짧아지고 깨끗해 보이는데, 그 안에
 * 있던 `+`가 같이 사라져서 **들어갈 방법이 없어진다.** 관문 C·E가 그것만 본다.
 *
 *   A. 빈 프로젝트 상세가 **1.5 화면**을 넘지 않는다
 *   B. 결핍 블록("…없어요", "…없음")이 **0개**다
 *   C. 접힌 다섯의 문이 다 있고, 누르면 그 섹션이 **제자리에서** 열린다
 *   D. 수정·복제·삭제가 본문에 없고 `⋯` 메뉴에 있다
 *   E. `StartGuide`의 버튼이 접힌 섹션을 **실제로 연다**
 *
 * **A는 화면 수로 잰다, px로 재지 않는다.** 기기마다 화면이 다른데 픽셀 상한을
 * 박으면 어느 기기 얘기인지 알 수 없고, 013이 글자 크기를 건드리면 엉뚱한
 * 이유로 깨진다. 여기서 보는 것은 "빈 프로젝트가 몇 화면인가"다 — 고치기 전
 * 13 mini에서 2.36 화면이었고 1.5를 넘으면 실패다.
 *
 * **E가 없으면 C만으로는 모자라다.** `StartGuide`는 칩이 아니라 자기 버튼으로
 * 섹션을 여는데, 그 버튼은 009 전에는 스크롤만 했다. 스크롤만 남겨두면 버튼을
 * 눌러도 **아무 일도 일어나지 않는다** — 화면에 그 섹션이 없기 때문이다.
 * 이건 관문 없이는 절대 안 보이는 종류의 고장이다.
 *
 * **손잡이(`[data-section]` · `[data-fill]`)가 없으면 환경 문제(2)다.**
 * 통과가 아니다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-detail-fold.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 빈 프로젝트 상세의 상한. 화면 수다 — 픽셀이 아니다. */
const A_최대화면 = 1.5;
/** 결핍 블록 상한. 007이 홈에서 1로 잡았고, 여기서는 안내가 따로 있어 0이다. */
const B_최대 = 0;

/** 접는 다섯. `FillRow`의 `FILL_KEYS`와 같은 순서·같은 이름이어야 한다. */
const KEYS = ["piece", "counter", "gauge", "yarn", "needle"];
/** 본문에 있으면 안 되는 관리 동작. 메뉴 안에는 있어야 한다. */
const 관리 = ["수정", "삭제", "이대로 다시 뜨기"];

const PW = process.env.PW || "playwright";
let chromium;
try {
  ({ chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW));
} catch (e) {
  console.error("환경 문제: playwright를 불러오지 못했습니다.\n  " + e.message);
  console.error("  PW=<playwright 경로> 로 지정하세요.");
  process.exit(ENV_FAIL);
}

const BASE = process.env.SHOT_BASE ?? "http://localhost:5173/knittinglog";

const browser = await chromium
  .launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  .catch((e) => {
    console.error("환경 문제: 브라우저를 띄우지 못했습니다.\n  " + e.message);
    console.error("  CHROMIUM_PATH=/경로/chromium 으로 지정하세요.");
    process.exit(ENV_FAIL);
  });

// 가장 빡빡한 기기에서 잰다(008에서 13 mini가 판정을 정했다).
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
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
  insets: { top: 50, left: 0, bottom: 34, right: 0 },
});

/** 기준 언어는 한국어다. B가 `없어요`·`없음`에 걸려 있다. */
await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

const fail = [];

/** DB를 비우고 아무것도 없는 프로젝트 하나만 심는다. */
async function seedEmpty() {
  await page.evaluate(async () => {
    const { db } = await import("/knittinglog/src/lib/db.ts");
    await db.delete();
    await db.open();
    const now = new Date();
    await db.projects.add({
      id: "p1",
      name: "회색 라글란 스웨터",
      craft: "knit",
      category: "sweater",
      status: "planning",
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function 상세() {
  await page.goto(BASE + "/projects/p1", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

/** 화면에서 재는 것 전부. */
function probe() {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return null;

    // 007과 같은 세는 규칙 — 잎 요소만 센다. 조상까지 세면 같은 문장이
    // 여러 번 잡힌다.
    const 결핍 = [];
    for (const el of main.querySelectorAll("*")) {
      if (el.children.length > 0) continue;
      const text = (el.textContent ?? "").trim();
      if (/없어요$|없음$/.test(text)) 결핍.push(text);
    }

    const 버튼글 = (root) =>
      [...root.querySelectorAll("button, a")]
        .map((b) => (b.textContent ?? "").trim())
        .filter(Boolean);

    return {
      높이: Math.round(document.documentElement.scrollHeight),
      화면: innerHeight,
      결핍,
      칩: [...main.querySelectorAll("[data-fill]")].map((b) =>
        b.getAttribute("data-fill")
      ),
      섹션: [...main.querySelectorAll("[data-section]")].map((s) =>
        s.getAttribute("data-section")
      ),
      본문버튼: 버튼글(main),
      메뉴버튼: !!document.querySelector("[data-project-menu-button]"),
    };
  });
}

/* ── 관문 A · B — 빈 프로젝트의 길이와 결핍 ───────────────────────────── */

await seedEmpty();
await 상세();

const m = await probe();
if (!m) {
  console.error("\n환경 문제: main을 찾지 못했습니다.");
  await browser.close();
  process.exit(ENV_FAIL);
}
if (!m.메뉴버튼) {
  console.error("\n환경 문제: `[data-project-menu-button]`을 찾지 못했습니다. 화면 구조가 바뀌었습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}

const 화면수 = m.높이 / m.화면;
console.log("관문 A — 빈 프로젝트 상세의 길이 (13 mini 375×812)");
console.log(`  문서 높이 ${m.높이}px · 화면 ${m.화면}px → ${화면수.toFixed(2)} 화면 (최대 ${A_최대화면})`);
if (화면수 > A_최대화면)
  fail.push(`A: 빈 프로젝트 상세가 ${화면수.toFixed(2)} 화면이다 (최대 ${A_최대화면})`);

console.log("\n관문 B — 결핍 블록");
console.log(`  ${m.결핍.length}개 ${JSON.stringify(m.결핍)} (최대 ${B_최대})`);
if (m.결핍.length > B_최대)
  fail.push(`B: 결핍 블록이 ${m.결핍.length}개다 (최대 ${B_최대}) — ${JSON.stringify(m.결핍)}`);

/* ── 관문 C — 접힌 다섯의 문이 다 있고, 눌러야 열린다 ────────────────── */

console.log("\n관문 C — 접힌 섹션의 문");
console.log(`  칩 ${JSON.stringify(m.칩)}`);
console.log(`  펼쳐진 섹션 ${JSON.stringify(m.섹션)}`);

const 빠진문 = KEYS.filter((k) => !m.칩.includes(k));
if (빠진문.length)
  fail.push(`C: 들어갈 문이 없는 섹션이 있다 — ${빠진문.join(", ")}`);
if (m.섹션.length > 0)
  fail.push(`C: 비어 있는데 펼쳐진 섹션이 있다 — ${m.섹션.join(", ")}`);

for (const key of KEYS.filter((k) => m.칩.includes(k))) {
  await page.click(`[data-fill="${key}"]`);
  await page.waitForTimeout(400);
  const after = await probe();
  const 열렸나 = after.섹션.includes(key);
  const 칩사라짐 = !after.칩.includes(key);
  console.log(`  ${열렸나 && 칩사라짐 ? "○" : "×"} ${key} — 섹션 ${열렸나 ? "열림" : "안 열림"} · 칩 ${칩사라짐 ? "사라짐" : "남음"}`);
  if (!열렸나) fail.push(`C: \`${key}\` 칩을 눌렀는데 섹션이 열리지 않았다`);
  if (!칩사라짐) fail.push(`C: \`${key}\`가 열렸는데 칩이 그대로 남아 있다`);
}

/* ── 관문 D — 관리 동작은 본문이 아니라 메뉴에 ───────────────────────── */

await 상세();
const d1 = await probe();
console.log("\n관문 D — 수정·복제·삭제의 자리");
const 본문에 = 관리.filter((label) => d1.본문버튼.includes(label));
console.log(`  본문에 있는 관리 동작 ${JSON.stringify(본문에)} (0개여야 한다)`);
if (본문에.length) fail.push(`D: 관리 동작이 본문에 남아 있다 — ${본문에.join(", ")}`);

await page.click("[data-project-menu-button]");
await page.waitForTimeout(400);
const 메뉴 = await page.evaluate(() => {
  const sheet = document.querySelector("[data-project-menu]");
  if (!sheet) return null;
  return [...sheet.querySelectorAll("button, a")]
    .map((b) => (b.textContent ?? "").trim().split("\n")[0])
    .filter(Boolean);
});
if (메뉴 === null) {
  console.error("\n환경 문제: `⋯`를 눌렀는데 `[data-project-menu]`가 열리지 않았습니다.");
  await browser.close();
  process.exit(ENV_FAIL);
}
console.log(`  메뉴 안 ${JSON.stringify(메뉴)}`);
for (const label of 관리) {
  const 있나 = 메뉴.some((x) => x.startsWith(label));
  if (!있나) fail.push(`D: 메뉴에 \`${label}\`이(가) 없다 — 길이 사라졌다`);
}
await page.keyboard.press("Escape").catch(() => {});

/* ── 관문 E — StartGuide의 버튼이 접힌 섹션을 실제로 연다 ────────────── */

await 상세();
console.log("\n관문 E — `StartGuide`의 버튼이 접힌 섹션을 여나");

const 안내버튼 = await page.evaluate(() => {
  // 안내 카드는 자기 단계의 버튼을 하나만 갖는다. 링크(다른 화면)면 이 관문의
  // 대상이 아니다 — 여는 것은 이 화면 안의 섹션으로 가는 버튼뿐이다.
  const guide = [...document.querySelectorAll("main section")].find((s) =>
    s.querySelector("h2")?.textContent?.includes("다음은")
  );
  const b = guide?.querySelector("button");
  return b ? (b.textContent ?? "").trim() : null;
});
if (!안내버튼) {
  console.error("\n환경 문제: `StartGuide`의 버튼을 찾지 못했습니다. 안내가 첫 단계를 내놓지 않습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}

const 전 = (await probe()).섹션;
await page.click("main section button");
await page.waitForTimeout(500);
const 후 = (await probe()).섹션;
console.log(`  \`${안내버튼}\`를 눌렀다 — 섹션 ${JSON.stringify(전)} → ${JSON.stringify(후)}`);
if (후.length <= 전.length)
  fail.push(`E: \`${안내버튼}\`를 눌렀는데 아무 섹션도 열리지 않았다 — 버튼이 아무 일도 안 하는 것처럼 보인다`);

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
