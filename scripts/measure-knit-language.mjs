/**
 * 니트 시각 언어를 잰다 (discuss/013).
 *
 *   A. 조직이 **세 곳에 실제로 걸린다** — 화면 픽셀에서, 두 테마로
 *   B. 조직이 **사진과 실 색을 이기지 않는다** — 바탕은 속삭임이다
 *   C. `shadow-raised`가 **한 화면에 하나**다
 *   D. `radius-lg`가 **시트와 `+1` 면에만** 쓰인다
 *   E. `docs/DESIGN.md`가 아직 같은 값을 말한다
 *
 * **A는 클래스가 붙었는지가 아니라 픽셀을 본다.** 013을 만들면서 실제로
 * `.knit-faint`가 마크업에 멀쩡히 있는데 화면에는 아무것도 안 걸린 상태를
 * 만들었다 — 그라디언트를 커스텀 속성에 담았더니 `:root`에서 이미 무효가
 * 되어 `none`으로 계산됐다. 클래스를 세는 관문이었다면 통과했을 것이다.
 *
 * **B가 013의 진짜 위험이다.** 질감은 늘릴수록 "뜨개답다"고 느껴지는데,
 * 원칙 1("화면의 주인공은 사진과 실")은 늘릴수록 깨진다. 처음 잡은 값이
 * 채널차 12였고 화면 전체를 덮으니 **무늬 배경**이었다 — `docs/DESIGN.md`가
 * "무늬 배경이 되는 순간 뺀다"고 못 박은 그것이다.
 *
 * **밝은 자리와 어두운 자리를 한 번에 재지 않는다.** `+1` 면은 한가운데에
 * 기호가 있어서 가운데를 자르면 조직이 아니라 글리프를 잰다. 가장자리를
 * 물면 1px 테두리가 채널차를 통째로 먹는다. 안쪽 왼쪽 위만 자른다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-knit-language.mjs
 */

import { readFileSync } from "node:fs";

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 조직이 "걸렸다"고 말할 수 있는 최소 채널차. 아래면 안 걸린 것이다. */
const A_최소 = 4;
/** 작업대 바탕의 상한. 넘으면 무늬 배경이다. */
const B_바탕최대 = 9;
/** 천이 주인공인 자리의 상한. 넘으면 조직이 내용을 이긴다. */
const B_면최대 = 40;
/** 한 화면의 `shadow-raised` 최대 개수. */
const C_최대 = 1;

/** `docs/DESIGN.md`가 그대로 들고 있어야 하는 문장. */
const 문장 = "### 메리야스 조직 (013 — 니트)";

const PW = process.env.PW || "playwright";
let chromium;
try {
  ({ chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW));
} catch (e) {
  console.error("환경 문제: playwright를 불러오지 못했습니다.\n  " + e.message);
  console.error("  PW=<playwright 경로> 로 지정하세요.");
  process.exit(ENV_FAIL);
}

const fail = [];

/* ── 관문 E — 문서가 아직 같은 말을 하나 ─────────────────────────────── */

let design;
try {
  design = readFileSync(new URL("../docs/DESIGN.md", import.meta.url), "utf8");
} catch (e) {
  console.error("환경 문제: docs/DESIGN.md를 읽지 못했습니다.\n  " + e.message);
  process.exit(ENV_FAIL);
}
console.log("관문 E — `docs/DESIGN.md`가 아직 같은 말을 하나");
const 있나 = design.includes(문장);
console.log(`  ${있나 ? "○" : "×"} ${문장}`);
if (!있나)
  fail.push(`E: docs/DESIGN.md에서 "${문장}"을 찾지 못했다 — 절을 고쳤으면 이 관문도 같이 고친다`);

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
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 20000 });
} catch (e) {
  console.error(`환경 문제: ${BASE} 를 열지 못했습니다. npm run dev 가 떠 있습니까?`);
  console.error("  " + e.message);
  await browser.close();
  process.exit(ENV_FAIL);
}

await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

/** 사진은 없고 실은 있는 프로젝트 하나. 조직이 서는 세 자리가 다 나온다. */
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete();
  await db.open();
  const old = new Date(Date.now() - 3 * 86400000);
  const base = (id) => ({ id, createdAt: old, updatedAt: old });
  await db.projects.add({
    ...base("p1"), name: "회색 라글란 스웨터", craft: "knit",
    category: "sweater", status: "active", startedAt: old,
  });
  await db.counters.add({
    ...base("c1"), projectId: "p1", label: "몸판",
    value: 62, target: 100, sortOrder: 0,
  });
  await db.yarns.add({ ...base("y1"), skeinCount: 3, name: "울코튼", colorHex: "#8a8f9a" });
  await db.yarnAllocations.add({
    ...base("a1"), yarnId: "y1", projectId: "p1", skeinsAllocated: 4,
  });
});

async function 테마(t) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, t);
  await page.waitForTimeout(250);
  const 걸렸나 = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );
  if (걸렸나 !== (t === "dark")) {
    console.error(`\n환경 문제: 테마를 ${t}로 걸지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
}

/** 잘라낸 조각에서 가장 큰 채널차. 조직이 실제로 그려졌는지를 픽셀로 본다. */
function 채널차(shot) {
  return page.evaluate(async (s) => {
    const img = new Image();
    img.src = "data:image/png;base64," + s;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const min = [255, 255, 255];
    const max = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4)
      for (let k = 0; k < 3; k++) {
        if (d[i + k] < min[k]) min[k] = d[i + k];
        if (d[i + k] > max[k]) max[k] = d[i + k];
      }
    return Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  }, shot);
}

/** 요소의 **안쪽 왼쪽 위**만 자른다. 가운데는 글리프, 가장자리는 테두리다. */
async function 조각(sel) {
  const box = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    const pad = 10;
    const side = 78;
    const w = Math.min(side, Math.round(r.width) - pad * 2);
    const h = Math.min(side, Math.round(r.height) - pad * 2);
    if (w < 26 || h < 26) return null;
    return { x: Math.round(r.x) + pad, y: Math.round(r.y) + pad, w, h };
  }, sel);
  if (!box) return null;
  const shot = await page.screenshot({
    clip: { x: box.x, y: box.y, width: box.w, height: box.h },
  });
  return 채널차(shot.toString("base64"));
}

/* ── 관문 A · B — 조직이 세 곳에 걸리고, 이기지 않는다 ──────────────── */

console.log("\n관문 A · B — 조직이 화면 픽셀에 걸리나 (라이트·다크)");
console.log("| 테마 | 자리 | 채널차 | 최소 | 최대 | 판정 |");
console.log("| ---- | ---- | ------ | ---- | ---- | ---- |");

for (const theme of ["light", "dark"]) {
  await page.goto(BASE + "/projects", { waitUntil: "networkidle" });
  await 테마(theme);
  await page.waitForTimeout(500);

  // 작업대 바탕 — 마지막 카드 아래의 아무것도 없는 자리
  const y = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("main li")];
    const last = cards[cards.length - 1];
    return last ? Math.round(last.getBoundingClientRect().bottom) + 20 : null;
  });
  if (y === null || y > 700) {
    console.error("\n환경 문제: 목록에서 바탕을 잴 빈 자리를 찾지 못했습니다.");
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 바탕 = await 채널차(
    (await page.screenshot({ clip: { x: 40, y, width: 78, height: 78 } })).toString("base64")
  );

  const 스와치 = await 조각("main .knit-face");
  if (스와치 === null) {
    console.error("\n환경 문제: 목록에서 실 스와치(`main .knit-face`)를 찾지 못했습니다.");
    await browser.close();
    process.exit(ENV_FAIL);
  }

  await page.goto(BASE + "/projects/p1/knit", { waitUntil: "networkidle" });
  await 테마(theme);
  await page.waitForTimeout(500);
  const plus = await 조각('button[aria-label="+1"]');
  if (plus === null) {
    console.error("\n환경 문제: 뜨기 모드에서 `+1` 면을 찾지 못했습니다.");
    await browser.close();
    process.exit(ENV_FAIL);
  }

  const 잰것 = [
    ["작업대 바탕", 바탕, A_최소, B_바탕최대],
    ["실 스와치", 스와치, A_최소, B_면최대],
    ["`+1` 면", plus, A_최소, B_면최대],
  ];
  for (const [이름, 값, 최소, 최대] of 잰것) {
    const ok = 값 >= 최소 && 값 <= 최대;
    console.log(`| ${theme} | ${이름} | ${값} | ${최소} | ${최대} | ${ok ? "통과" : 값 < 최소 ? "안 걸림" : "너무 셈"} |`);
    if (값 < 최소)
      fail.push(`A(${theme}): ${이름}에 조직이 안 걸렸다 — 채널차 ${값} (최소 ${최소})`);
    if (값 > 최대)
      fail.push(`B(${theme}): ${이름}의 조직이 너무 세다 — 채널차 ${값} (최대 ${최대})`);
  }
}

/* ── 관문 C · D — 그림자와 반경이 정한 자리에만 ──────────────────────── */

console.log("\n관문 C · D — `shadow-raised`와 `radius-lg`의 자리");
for (const [이름, path] of [["홈", "/"], ["목록", "/projects"], ["상세", "/projects/p1"], ["뜨기", "/projects/p1/knit"]]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await 테마("light");
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    /*
      토큰 값을 상수로 박지 않는다 — **실제 클래스를 붙인 탐침**의 계산된 값과
      맞춘다.

      처음에는 `style.boxShadow = "var(--shadow-raised)"`로 탐침을 만들었는데,
      Tailwind의 `shadow-raised` 유틸은 `--tw-*`를 엮어 **다른 문자열**을
      계산해서 한 번도 안 맞았다 — 관문이 늘 0개를 세며 통과했다. 클래스를
      그대로 붙여야 같은 문자열이 나온다.
    */
    const probe = document.createElement("div");
    probe.className = "shadow-raised";
    document.body.appendChild(probe);
    const raised = getComputedStyle(probe).boxShadow;
    probe.remove();

    const 띄운것 = [];
    const 큰반경 = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      const 이름 = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 14);
      if (cs.boxShadow === raised) 띄운것.push(이름);
      if (Math.round(parseFloat(cs.borderTopLeftRadius)) === 12) 큰반경.push(이름);
    }
    return { 띄운것, 큰반경, raised };
  });
  /*
    **0개도 통과가 아니다**(017에서 배운 세는 관문의 함정).

    뜨기 모드에는 `+1` 면이 언제나 있고 그 면이 `shadow-raised`를 갖는다.
    거기서 0개가 나오면 화면이 아니라 **재는 쪽이 깨진 것**이다.
  */
  if (이름 === "뜨기" && m.띄운것.length === 0) {
    console.error(`\n환경 문제: 뜨기 모드에서 \`shadow-raised\`를 하나도 찾지 못했습니다 — 탐침이 실제 값과 안 맞습니까? (계산된 값 ${m.raised})`);
    await browser.close();
    process.exit(ENV_FAIL);
  }

  const okC = m.띄운것.length <= C_최대;
  console.log(`  ${okC ? "○" : "×"} ${이름} — shadow-raised ${m.띄운것.length}개 ${JSON.stringify(m.띄운것)}`);
  console.log(`     radius-lg(12px) ${m.큰반경.length}개 ${JSON.stringify(m.큰반경)}`);
  if (!okC)
    fail.push(`C: ${이름}에 \`shadow-raised\`가 ${m.띄운것.length}개다 (최대 ${C_최대}) — ${m.띄운것.join(", ")}`);
  // D — 12px 반경은 시트(이 화면들에는 안 떠 있다)와 `+1` 면에만.
  const 허용 = ["+1", ""];
  const 위반 = m.큰반경.filter((n) => !허용.includes(n) && !n.startsWith("+1"));
  if (위반.length)
    fail.push(`D: ${이름}에서 \`radius-lg\`(12px)가 허용되지 않은 자리에 있다 — ${위반.join(", ")}`);
}

await page.evaluate(() => document.documentElement.classList.remove("dark"));
await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
