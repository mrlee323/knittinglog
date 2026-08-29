/**
 * 하단 탭바가 본문을 가리지 않는지 잰다 (discuss/004).
 *
 * 탭바는 `pb-safe`라 기기의 홈 인디케이터만큼 두꺼워진다(58px → 92px). 본문의
 * 하단 padding이 그만큼 따라가지 않으면 **마지막 내용이 탭바 아래에 깔린다.**
 * 헤드리스는 안전영역이 0이라 이 결함이 보이지 않는다 — 그래서 잴 때 넣는다.
 *
 * 관문 둘. 깨지면 종료코드 1, 환경 문제는 2.
 *
 *   1. **규칙**  — `.pb-nav`가 실제로 `calc(5rem + env(safe-area-inset-bottom))`로
 *      생성된다. 이건 시뮬레이션이 아니라 브라우저가 읽는 진짜 CSS다.
 *   2. **산술**  — 그 안전영역 값에서 본문 하단 padding ≥ 탭바 높이.
 *
 * **헤드리스는 `env(safe-area-inset-*)`를 0으로 준다.** 에뮬레이션 수단이 없으므로
 * 관문 2에서는 `.pb-safe`와 `.pb-nav`를 **같은 값으로** 덮어 흉내낸다. 그래서 관문
 * 2만으로는 공식이 맞다는 증거가 되지 않고, 관문 1이 그 자리를 메운다.
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-bottom-nav.mjs
 */
const ENV_FAIL = 2, GATE_FAIL = 1;
const PW = process.env.PW || "playwright";
let chromium;
try {
  ({ chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW));
} catch (e) {
  console.error("환경 문제: playwright를 불러오지 못했습니다.\n  " + e.message);
  process.exit(ENV_FAIL);
}
const BASE = process.env.SHOT_BASE ?? "http://localhost:5173/knittinglog";

/** 뷰포트와 safe-area는 같은 기기에서 가져온다(003에서 어긋났던 자리). */
const DEVICES = [
  { name: "헤드리스 390×844 safe0", w: 390, h: 844, top: 0, bottom: 0 },
  { name: "아이폰14 390×844", w: 390, h: 844, top: 47, bottom: 34 },
  { name: "13 mini 375×812", w: 375, h: 812, top: 50, bottom: 34 },
];

const browser = await chromium
  .launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  .catch((e) => { console.error("환경 문제: 브라우저를 띄우지 못했습니다.\n  " + e.message); process.exit(ENV_FAIL); });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
try {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 15000 });
} catch (e) {
  console.error(`환경 문제: ${BASE} 를 열지 못했습니다. npm run dev 가 떠 있습니까?`);
  await browser.close(); process.exit(ENV_FAIL);
}

async function measure(dev, before) {
  await page.setViewportSize({ width: dev.w, height: dev.h });
  await page.evaluate(([t, b, old]) => {
    document.getElementById("m-safe")?.remove();
    document.getElementById("m-old")?.remove();
    if (t || b) {
      const s = document.createElement("style");
      s.id = "m-safe";
      // `.pb-nav`도 함께 덮는다. env()를 쓰는 규칙을 안 덮으면 헤드리스에서 0으로
      // 남아 고친 것이 안 고쳐진 것처럼 보인다 — 처음에 실제로 그렇게 읽혔다.
      s.textContent =
        `.pt-safe{padding-top:${t}px !important}` +
        `.pb-safe{padding-bottom:${b}px !important}` +
        `.pb-nav{padding-bottom:calc(5rem + ${b}px) !important}`;
      document.head.appendChild(s);
    }
    if (old) {
      // 고치기 전 상태를 되살린다 — pb-20(80px) 고정
      const s = document.createElement("style");
      s.id = "m-old";
      s.textContent = `main.pb-nav{padding-bottom:5rem !important}`;
      document.head.appendChild(s);
    }
  }, [dev.top, dev.bottom, before]);
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const nav = document.querySelector("nav.fixed.inset-x-0");
    const pb = parseFloat(getComputedStyle(main).paddingBottom);
    const navH = nav.getBoundingClientRect().height;
    return { pb: Math.round(pb), navH: Math.round(navH) };
  });
}

// ── 관문 1: 진짜 CSS 규칙 ──
const rule = await page.evaluate(() => {
  // `@layer utilities { ... }` 안에 들어 있으므로 한 겹 더 내려간다.
  const find = (rules) => {
    for (const r of rules || []) {
      if ((r.cssText || "").startsWith(".pb-nav")) return r.cssText;
      const inner = r.cssRules && find(r.cssRules);
      if (inner) return inner;
    }
    return null;
  };
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const hit = find(rules);
    if (hit) return hit;
  }
  return null;
});
const ruleOk = !!rule && rule.includes("env(safe-area-inset-bottom)") && rule.includes("5rem");
console.log(`규칙 관문 — ${rule ?? ".pb-nav 규칙을 찾지 못했습니다"}`);
console.log(`  ${ruleOk ? "통과" : "실패"} · 시뮬레이션이 아니라 브라우저가 읽는 CSS\n`);

console.log("| 기기 | 본문 하단 padding | 탭바 높이 | 가려지는 높이 | 판정 |");
console.log("| ---- | ----------------- | --------- | ------------- | ---- |");
let fail = ruleOk ? 0 : 1;
for (const before of [true, false]) {
  for (const dev of DEVICES) {
    const { pb, navH } = await measure(dev, before);
    const hidden = Math.max(0, navH - pb);
    const ok = hidden === 0;
    const tag = before ? "고치기 전 · " : "";
    console.log(`| ${tag}${dev.name} | ${pb}px | ${navH}px | ${hidden}px | ${ok ? "통과" : "가림"} |`);
    if (!before && !ok) fail++;
  }
}
await browser.close();
if (fail) { console.log(`\n관문 실패: ${fail}개 조건에서 본문이 탭바에 가립니다.`); process.exit(GATE_FAIL); }
console.log("\n모든 조건에서 본문이 탭바에 가리지 않습니다.");
