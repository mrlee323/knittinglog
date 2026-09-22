/**
 * 타이포·숫자 위계를 잰다 (discuss/010).
 *
 *   A. 이름 붙은 숫자가 **본문보다 크다**
 *   B. 같은 사실은 화면이 바뀌어도 **같은 크기**다
 *   C. 섹션 제목 > 본문 > 보조 설명 — 크기로 갈린다
 *   D. 본문보다 작은 글자가 텍스트 잉크의 **60%**를 넘지 않는다
 *   E. `word-break: keep-all` · `tabular-nums`가 **모든 화면에서 실제로** 걸린다
 *
 * **본문 크기를 상수로 박지 않는다.** `body`의 계산된 `font-size`를 읽어 그것을
 * 기준으로 비교한다. 15px을 관문에 박아두면 `index.css`의 `--text-body`를 고친
 * 날 관문이 눈치채지 못하고, 그게 015가 통과했던 방식이다.
 *
 * **B가 이 관문의 핵심이다.** 고치기 전 `38단 남음`은 상세에서 13px, 뜨기에서
 * 13px이었고 `/ 목표`는 홈 15px · 상세 20px · 뜨기 13px이었다 — **같은 사실이
 * 화면마다 다른 위계**였다. 한 화면만 보면 어디도 이상하지 않아서, 화면을
 * 가로질러 재지 않으면 절대 안 보인다.
 *
 * **D는 면적이 아니라 잉크로 잰다.** 글자 수 × 크기²다. 요소의 `width`로 재면
 * 한 줄짜리 큰 글자가 짧아서 작게 잡히고, 빽빽한 작은 글자가 크게 잡힌다 —
 * 눈이 받는 인상과 반대로 센다.
 *
 * **E는 이미 참인 것을 잠근다.** `body`에 한 번 건 상속 규칙이라 어느 자손이
 * 덮으면 조용히 깨진다. "규칙은 있는데 화면에는 안 걸려 있다"가 이 저장소가
 * 반복한 실패다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-type.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 본문보다 작은 글자가 덮어도 되는 잉크의 최대 비율. */
const D_최대 = 0.6;

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

await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

/** 위계를 볼 수 있을 만큼 채워진 프로젝트 하나. */
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete();
  await db.open();
  const old = new Date(Date.now() - 3 * 86400000);
  const base = (id) => ({ id, createdAt: old, updatedAt: old });
  await db.projects.add({
    ...base("p1"),
    name: "회색 라글란 스웨터",
    craft: "knit",
    category: "sweater",
    status: "active",
    startedAt: old,
  });
  await db.counters.add({
    ...base("c1"),
    projectId: "p1",
    label: "몸판",
    value: 62,
    target: 100,
    sortOrder: 0,
  });
  await db.counterMarks.add({
    ...base("m1"),
    counterId: "c1",
    atRow: 40,
    kind: "lifeline",
  });
  await db.yarns.add({ ...base("y1"), name: "울코튼 그레이", colorHex: "#8a8f9a" });
  await db.yarnAllocations.add({
    ...base("a1"),
    yarnId: "y1",
    projectId: "p1",
    skeinsAllocated: 4,
  });
  await db.yarnWeighIns.add({
    ...base("w1"),
    allocationId: "a1",
    date: old,
    remainingGrams: 128,
    atRow: 62,
  });
  await db.needles.add({
    ...base("n1"),
    craft: "knit",
    type: "circular",
    sizeMm: 4.5,
    occupiedByProjectId: "p1",
  });
  await db.gauges.add({
    ...base("g1"),
    projectId: "p1",
    stitchesPer10cm: 22,
    rowsPer10cm: 30,
    needleMm: 4.5,
  });
});

const 화면 = [
  ["홈", "/"],
  ["목록", "/projects"],
  ["상세", "/projects/p1"],
  ["뜨기", "/projects/p1/knit"],
];

const fail = [];

/**
 * 한 화면의 글자를 전부 읽는다.
 *
 * 잎 요소만 세지 않는다 — `<p>62<span>/100</span></p>` 같은 자리에서 `62`는
 * 자식이 있는 요소의 **자기 텍스트**라 잎만 보면 통째로 빠진다. 큰 숫자가
 * 대개 이 모양이라, 잎만 세면 관문이 정작 주인공을 못 본다.
 */
function 글자들() {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const 본문 = parseFloat(getComputedStyle(document.body).fontSize);
    const out = [];
    const walk = (el) => {
      for (const ch of el.children) {
        const own = [...ch.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join("")
          .trim();
        if (own) {
          const r = ch.getBoundingClientRect();
          if (r.width >= 1 && r.height >= 1) {
            const cs = getComputedStyle(ch);
            out.push({
              t: own,
              px: Math.round(parseFloat(cs.fontSize) * 10) / 10,
              num: cs.fontVariantNumeric,
              wb: cs.wordBreak,
            });
          }
        }
        walk(ch);
      }
    };
    walk(main);
    return { 본문, 글자: out };
  });
}

const 수집 = {};
for (const [이름, path] of 화면) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const r = await 글자들();
  if (r.글자.length === 0) {
    console.error(`\n환경 문제: ${이름}(${path})에서 글자를 하나도 찾지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  수집[이름] = r;
}

const 본문 = 수집["상세"].본문;
console.log(`본문 크기는 계산된 스타일에서 읽는다 — ${본문}px (상수로 박지 않는다)\n`);

/** 화면에서 그 글을 가진 요소를 찾는다. 못 찾으면 환경 문제다. */
function 찾기(이름, re) {
  const hit = 수집[이름].글자.find((x) => re.test(x.t));
  return hit ?? null;
}

/* ── 관문 A — 이름 붙은 숫자가 본문보다 크다 ──────────────────────────── */

/** [화면, 무엇, 정규식, 본문 대비 최소 배수] */
const A항목 = [
  ["상세", "단수", /^62$/, 2],
  ["상세", "남은 단수", /^38단 남음$/, 1.1],
  ["상세", "목표 단수", /^\/\s*100$/, 1.1],
  ["상세", "게이지", /^22코 × 30단/, 1.1],
  ["상세", "실 잔량", /^128g$/, 1.1],
  ["상세", "바늘 굵기", /^4\.5mm$/, 1.1],
  ["뜨기", "단수", /^62$/, 2],
  ["뜨기", "남은 단수", /^38단 남음$/, 1.1],
  ["홈", "단수", /^62$/, 2],
];

console.log("관문 A — 이름 붙은 숫자가 본문보다 큰가");
for (const [화면이름, 무엇, re, 배수] of A항목) {
  const hit = 찾기(화면이름, re);
  if (!hit) {
    console.error(`\n환경 문제: ${화면이름}에서 "${무엇}"(${re})을 찾지 못했습니다. 화면 구조가 바뀌었습니까?`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 최소 = 본문 * 배수;
  const ok = hit.px >= 최소;
  console.log(`  ${ok ? "○" : "×"} ${화면이름} ${무엇} ${hit.px}px (최소 ${최소.toFixed(1)}px = 본문×${배수})`);
  if (!ok)
    fail.push(`A: ${화면이름}의 "${무엇}"가 ${hit.px}px이다 (최소 ${최소.toFixed(1)}px)`);
}

/* ── 관문 B — 같은 사실은 화면이 바뀌어도 같은 크기 ──────────────────── */

const B항목 = [
  ["남은 단수", /^38단 남음$/, ["상세", "뜨기"]],
  ["목표 단수", /^\/\s*100$/, ["홈", "상세", "뜨기"]],
  ["단수", /^62$/, ["홈", "상세"]],
];

console.log("\n관문 B — 같은 사실이 화면마다 같은 크기인가");
for (const [무엇, re, 화면들] of B항목) {
  const 잰것 = 화면들.map((이름) => {
    const hit = 찾기(이름, re);
    return { 이름, px: hit ? hit.px : null };
  });
  if (잰것.some((x) => x.px === null)) {
    const 빠진 = 잰것.filter((x) => x.px === null).map((x) => x.이름);
    console.error(`\n환경 문제: "${무엇}"(${re})을 ${빠진.join(", ")}에서 찾지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 값 = [...new Set(잰것.map((x) => x.px))];
  const ok = 값.length === 1;
  console.log(`  ${ok ? "○" : "×"} ${무엇} — ${잰것.map((x) => `${x.이름} ${x.px}px`).join(" · ")}`);
  if (!ok) fail.push(`B: "${무엇}"가 화면마다 다른 크기다 — ${잰것.map((x) => `${x.이름} ${x.px}px`).join(" · ")}`);
}

/* ── 관문 C — 섹션 제목 > 본문 > 보조 설명 ───────────────────────────── */

await page.goto(BASE + "/projects/p1", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const c = await page.evaluate(() => {
  const main = document.querySelector("main");
  const px = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : null);
  const 섹션제목 = [...main.querySelectorAll("[data-section] h2")].map(px);
  const 보조 = px(main.querySelector("[data-brief-line] p"));
  return { 섹션제목, 보조, 본문: parseFloat(getComputedStyle(document.body).fontSize) };
});
if (c.섹션제목.length === 0 || c.보조 === null) {
  console.error("\n환경 문제: 섹션 제목 또는 보조 설명을 찾지 못했습니다. 화면 구조가 바뀌었습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}
const 제목최소 = Math.min(...c.섹션제목);
console.log("\n관문 C — 제목 · 본문 · 보조가 크기로 갈리나");
console.log(`  섹션 제목 ${JSON.stringify(c.섹션제목)} (최소 ${제목최소}px) > 본문 ${c.본문}px > 보조 ${c.보조}px`);
if (!(제목최소 > c.본문))
  fail.push(`C: 섹션 제목이 ${제목최소}px로 본문(${c.본문}px)보다 크지 않다 — 굵기만으로 가른다`);
if (!(c.본문 > c.보조))
  fail.push(`C: 보조 설명이 ${c.보조}px로 본문(${c.본문}px)보다 작지 않다`);

/* ── 관문 D — 본문보다 작은 글자가 잉크의 60%를 넘지 않는다 ──────────── */

console.log("\n관문 D — 본문보다 작은 글자가 덮는 잉크");
for (const [이름] of 화면) {
  const 글자 = 수집[이름].글자;
  let 작은 = 0;
  let 전체 = 0;
  for (const g of 글자) {
    // 잉크 근사 — 글자 수 × 크기². 폭으로 재면 짧은 큰 글자가 작게 잡힌다.
    const ink = g.t.length * g.px ** 2;
    전체 += ink;
    if (g.px < 본문) 작은 += ink;
  }
  const 비율 = 작은 / 전체;
  const ok = 비율 <= D_최대;
  console.log(`  ${ok ? "○" : "×"} ${이름} ${(비율 * 100).toFixed(1)}% (최대 ${D_최대 * 100}%)`);
  if (!ok)
    fail.push(`D: ${이름}의 본문 미만 글자가 잉크의 ${(비율 * 100).toFixed(1)}%다 (최대 ${D_최대 * 100}%)`);
}

/* ── 관문 E — keep-all · tabular-nums가 실제로 걸리나 ────────────────── */

console.log("\n관문 E — 상속 규칙이 화면에 실제로 걸리나");
for (const [이름] of 화면) {
  const 글자 = 수집[이름].글자;
  const kb = 글자.filter((g) => g.wb !== "keep-all");
  const nums = 글자.filter((g) => /\d/.test(g.t) && !g.num.includes("tabular"));
  console.log(`  ${kb.length === 0 && nums.length === 0 ? "○" : "×"} ${이름} — keep-all 아님 ${kb.length}개 · 숫자인데 tabular 아님 ${nums.length}개`);
  if (kb.length)
    fail.push(`E: ${이름}에 \`word-break: keep-all\`이 안 걸린 글자가 ${kb.length}개다 — ${JSON.stringify(kb.slice(0, 3).map((g) => g.t.slice(0, 14)))}`);
  if (nums.length)
    fail.push(`E: ${이름}에 숫자를 담았는데 tabular가 아닌 글자가 ${nums.length}개다 — ${JSON.stringify(nums.slice(0, 3).map((g) => g.t.slice(0, 14)))}`);
}

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
