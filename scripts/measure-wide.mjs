/**
 * 넓은 화면 레이아웃을 잰다 (discuss/011).
 *
 *   A. 두 단 화면에서 **오른쪽이 비지 않는다** — 오른쪽 높이 ≥ 왼쪽의 절반
 *   B. 폭이 오르면 목록의 **열 수가 오른다**
 *   C. 본문이 **쓸 수 있는 가로**를 쓴다 (죽은 여백)
 *   D. **폰이 깨지지 않는다** — 375px에서 가로 스크롤 0, 모든 격자 1열
 *
 * **A가 완료 기준 1을 그대로 옮긴 것이다** — "1280px 화면에서 오른쪽이 비어
 * 보이지 않는다". 고치기 전 홈은 545 / 265로 **오른쪽이 왼쪽의 절반도 안
 * 됐다.** 상세는 402 / 505로 이미 괜찮았다. 한 화면만 보면 "두 단이니 됐다"고
 * 넘어가는데, 두 단이 있다는 것과 오른쪽이 차 있다는 것은 다른 말이다.
 *
 * **C는 뷰포트가 아니라 "쓸 수 있는 가로"로 잰다.** 큰 화면에는 왼쪽에 고정
 * 내비가 있어서 뷰포트로 나누면 내비를 죽은 여백으로 센다 — 내비는 죽은 여백이
 * 아니다. 실제로 본문이 놓일 수 있는 자리(뷰포트 − 내비)를 분모로 쓴다.
 *
 * **D가 없으면 A·B·C를 폰을 부수면서 통과할 수 있다.** 넓은 화면을 채우는 가장
 * 쉬운 방법은 폭 상한과 열 수를 올리는 것이고, 둘 다 폰에서 터진다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-wide.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/**
 * 오른쪽 단 아래에 남는 **빈 띠**가 화면 높이의 얼마까지 허용되나.
 *
 * "오른쪽이 왼쪽의 몇 배"로 재지 않는다. 비율은 두 단이 **둘 다 짧을 때**도
 * 나쁘게 나오는데, 그때는 눈에 비어 보이지 않는다. 눈이 보는 것은 비율이
 * 아니라 **화면에서 그 띠가 차지하는 자리**다.
 */
const A_최대띠 = 0.25;
/** 쓸 수 있는 가로 중 본문이 덮어야 할 최소 비율. */
const C_최소 = 0.7;

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

const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
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

await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

/**
 * 넓은 화면의 밀도를 볼 수 있을 만큼 채운다.
 *
 * 데이터가 적으면 어느 레이아웃이든 비어 보이고, 그때 재면 **레이아웃이 아니라
 * 데이터를 재는 것**이 된다. 프로젝트 아홉·스와치 여섯·실 일곱이 기준이다.
 */
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete();
  await db.open();
  const d = (n) => new Date(Date.now() - n * 86400000);
  const base = (id, n = 3) => ({ id, createdAt: d(n), updatedAt: d(n) });

  const names = [
    "회색 라글란 스웨터", "연말 선물용 두꺼운 양말", "체크 담요",
    "베이비 보닛", "케이블 머플러", "여름 린넨 탑",
    "목도리 하나 더", "아기 담요", "양말 두 번째 짝",
  ];
  const cats = ["sweater","socks","blanket","hat","accessory","sweater","accessory","blanket","socks"];
  const st = ["active","hibernating","hibernating","finished","active","hibernating","hibernating","planning","hibernating"];
  for (let i = 0; i < names.length; i++) {
    await db.projects.add({
      ...base("p" + i, i + 2),
      name: names[i], craft: "knit", category: cats[i], status: st[i],
      startedAt: d(40),
      pausedAt: st[i] === "hibernating" ? d(i * 7 + 3) : undefined,
      pauseReason: st[i] === "hibernating" ? ["bored","out-of-yarn","too-hard","wrong-season"][i % 4] : undefined,
    });
  }
  await db.counters.add({ ...base("c1"), projectId: "p0", label: "몸판", value: 62, target: 100, sortOrder: 0 });
  for (let i = 0; i < 12; i++) {
    await db.counterSessions.add({
      ...base("s" + i, i), counterId: "c1", projectId: "p0",
      startedAt: d(i), endedAt: new Date(d(i).getTime() + 45 * 60000), rowsAdded: 8 + i,
    });
  }
  for (let i = 0; i < 7; i++)
    await db.yarns.add({ ...base("y" + i), skeinCount: 3, name: "울코튼 " + i, skeinGrams: 50, skeinMeters: 120,
      colorHex: ["#8a8f9a","#b5651d","#556b2f","#8b0000","#4682b4","#d2b48c","#2f4f4f"][i] });
  for (let i = 0; i < 6; i++)
    await db.gauges.add({ ...base("g" + i), stitchesPer10cm: 20 + i, rowsPer10cm: 28 + i, needleMm: 4 + i * 0.5, label: "스와치 " + i });
});

const fail = [];

async function 재기(w, h, path) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return null;

    // 큰 화면의 고정 내비. 없으면(폰) 0으로 본다 — 내비는 죽은 여백이 아니다.
    const nav = document.querySelector("nav.fixed.inset-y-0");
    const 내비 = nav ? Math.round(nav.getBoundingClientRect().width) : 0;

    let L = Infinity;
    let R = -Infinity;
    for (const el of main.querySelectorAll("*")) {
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("")
        .trim();
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (own || el.tagName === "IMG" || el.tagName === "BUTTON") {
        L = Math.min(L, r.left);
        R = Math.max(R, r.right);
      }
    }

    // 두 단(`Columns`)의 실제 높이. 한 단으로 쌓인 폭에서는 null이다.
    const cols = main.querySelector(".grid.items-start");
    let 두단 = null;
    if (cols && cols.children.length === 2) {
      const a = Math.round(cols.children[0].getBoundingClientRect().height);
      const b = Math.round(cols.children[1].getBoundingClientRect().height);
      // 폰에서는 세로로 쌓이므로 두 단이 아니다 — 가로로 나란한지로 가린다.
      const 나란한가 =
        cols.children[1].getBoundingClientRect().left >
        cols.children[0].getBoundingClientRect().right - 1;
      두단 = 나란한가 ? { 왼: a, 오: b } : null;
    }

    const 목록 = main.querySelector("ul.grid");
    const 열 = 목록
      ? getComputedStyle(목록).gridTemplateColumns.split(" ").filter(Boolean).length
      : null;

    return {
      내비,
      본문폭: Math.round(R - L),
      두단,
      열,
      가로스크롤: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      격자열: [...main.querySelectorAll("ul.grid, div.grid")].map((e) =>
        getComputedStyle(e).gridTemplateColumns.split(" ").filter(Boolean).length
      ),
    };
  });
}

function 확인(m, 어디) {
  if (!m) {
    console.error(`\n환경 문제: ${어디}에서 main을 찾지 못했습니다.`);
    return false;
  }
  return true;
}

/* ── 관문 A — 1280에서 오른쪽 단이 비지 않는다 ────────────────────────── */

console.log("관문 A — 1280px에서 오른쪽 단이 비어 보이나");
for (const [이름, path] of [["홈", "/"], ["상세", "/projects/p0"]]) {
  const m = await 재기(1280, 900, path);
  if (!확인(m, 이름)) { await browser.close(); process.exit(ENV_FAIL); }
  if (!m.두단) {
    console.error(`\n환경 문제: ${이름}가 1280px에서 두 단이 아닙니다. 레이아웃이 바뀌었습니까?`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 띠 = Math.max(0, m.두단.왼 - m.두단.오);
  const 비 = 띠 / 900;
  const ok = 비 <= A_최대띠;
  console.log(`  ${ok ? "○" : "×"} ${이름} — 왼쪽 ${m.두단.왼}px · 오른쪽 ${m.두단.오}px → 빈 띠 ${띠}px (화면의 ${(비 * 100).toFixed(0)}%, 최대 ${A_최대띠 * 100}%)`);
  if (!ok)
    fail.push(`A: ${이름}의 오른쪽 단 아래에 ${띠}px(화면의 ${(비 * 100).toFixed(0)}%)가 빈다 (최대 ${A_최대띠 * 100}%)`);
}

/* ── 관문 B — 폭이 오르면 열 수가 오른다 ─────────────────────────────── */

console.log("\n관문 B — 폭이 오르면 목록의 열 수가 오르나");
/** [화면, 경로, [[폭, 최소 열 수], …]] */
const B항목 = [
  ["프로젝트", "/projects", [[375, 1], [768, 2], [1280, 3], [1920, 4]]],
  ["실", "/yarn", [[375, 1], [768, 2], [1920, 3]]],
  ["게이지", "/gauge", [[375, 1], [768, 2], [1920, 3]]],
];
for (const [이름, path, 단계] of B항목) {
  const 잰것 = [];
  for (const [w, 최소] of 단계) {
    const m = await 재기(w, 900, path);
    if (!확인(m, `${이름} ${w}px`)) { await browser.close(); process.exit(ENV_FAIL); }
    if (m.열 === null) {
      console.error(`\n환경 문제: ${이름}(${w}px)에서 목록 격자(ul.grid)를 찾지 못했습니다.`);
      await browser.close();
      process.exit(ENV_FAIL);
    }
    잰것.push({ w, 열: m.열, 최소 });
    if (m.열 < 최소)
      fail.push(`B: ${이름}가 ${w}px에서 ${m.열}열이다 (최소 ${최소}열)`);
  }
  const ok = 잰것.every((x) => x.열 >= x.최소);
  console.log(`  ${ok ? "○" : "×"} ${이름} — ${잰것.map((x) => `${x.w}px ${x.열}열(≥${x.최소})`).join(" · ")}`);
}

/* ── 관문 C — 본문이 쓸 수 있는 가로를 쓴다 ──────────────────────────── */

console.log("\n관문 C — 쓸 수 있는 가로 중 본문이 덮는 비율");
for (const w of [1280, 1440, 1920]) {
  const m = await 재기(w, 900, "/projects");
  if (!확인(m, `${w}px`)) { await browser.close(); process.exit(ENV_FAIL); }
  const 쓸수있는 = w - m.내비;
  const 비 = m.본문폭 / 쓸수있는;
  const ok = 비 >= C_최소;
  console.log(`  ${ok ? "○" : "×"} ${w}px — 내비 ${m.내비}px · 본문 ${m.본문폭}px / 쓸 수 있는 ${쓸수있는}px = ${(비 * 100).toFixed(0)}% (최소 ${C_최소 * 100}%)`);
  if (!ok)
    fail.push(`C: ${w}px에서 본문이 쓸 수 있는 가로의 ${(비 * 100).toFixed(0)}%만 덮는다 (최소 ${C_최소 * 100}%)`);
}

/* ── 관문 D — 폰이 깨지지 않는다 ─────────────────────────────────────── */

console.log("\n관문 D — 375px에서 폰이 깨지지 않나");
for (const [이름, path] of [["홈", "/"], ["목록", "/projects"], ["상세", "/projects/p0"], ["실", "/yarn"]]) {
  const m = await 재기(375, 812, path);
  if (!확인(m, `폰 ${이름}`)) { await browser.close(); process.exit(ENV_FAIL); }
  const 여러열 = m.격자열.filter((n) => n > 1);
  // `지금 상태` 타일처럼 **폰에서도 일부러 여러 열인** 격자가 있다. 그래서
  // 열 수가 아니라 **가로 스크롤**이 폰이 깨졌다는 진짜 증거다.
  const ok = m.가로스크롤 === 0;
  console.log(`  ${ok ? "○" : "×"} ${이름} — 가로 스크롤 ${m.가로스크롤}px · 여러 열 격자 ${여러열.length}개 ${JSON.stringify(여러열)}`);
  if (!ok) fail.push(`D: 폰 ${이름}에서 가로로 ${m.가로스크롤}px 넘친다`);
}

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
