/**
 * 하단 탭바가 본문을 가리지 않는지 잰다 (discuss/004).
 *
 * 탭바는 `pb-safe`라 기기의 홈 인디케이터만큼 두꺼워진다(58px → 92px). 본문의
 * 하단 padding이 그만큼 따라가지 않으면 **마지막 내용이 탭바 아래에 깔린다.**
 * 헤드리스는 안전영역이 0이라 이 결함이 보이지 않는다 — 그래서 잴 때 넣는다.
 *
 * 관문 하나. 깨지면 종료코드 1, 환경 문제는 2.
 *
 *   **본문 하단 padding ≥ 탭바 높이** — 그 기기의 진짜 안전영역에서.
 *
 * **CDP `Emulation.setSafeAreaInsetsOverride`로 진짜 `env()`를 준다**(004 검증).
 * 전에는 그런 수단이 없는 줄 알고 `.pb-safe`·`.pb-nav`를 같은 값으로 덮어
 * 흉내냈는데, 그러면 **내가 넣은 값을 내가 다시 읽는 꼴**이라 공식이 틀려도 통과한다.
 * 그 구멍을 메우려고 `.pb-nav`의 CSS 문자열을 대조하는 관문을 따로 뒀었다.
 *
 * **둘 다 걷어냈다**(O1). 진짜 `env()`를 쓰면 재는 것이 하나로 줄고 문자열 대조가
 * 사라진다 — 그 대조는 `5rem`이라는 **밑값을 관문에 못박아** 두고 있어서, 나중에
 * 밑값을 재서 고치면 엉뚱한 이유로 깨졌다. 지금 관문이 보는 것은 이름도 값도 아닌
 * **관계**다.
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
// **클래스를 덮지 않는다.** 브라우저가 `env(safe-area-inset-*)`를 진짜로 그 값으로
// 읽게 만든다 — 덮으면 `env()`를 직접 쓰는 규칙이 0으로 남는다.
const cdp = await ctx.newCDPSession(page);
try {
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 15000 });
} catch (e) {
  console.error(`환경 문제: ${BASE} 를 열지 못했습니다. npm run dev 가 떠 있습니까?`);
  await browser.close(); process.exit(ENV_FAIL);
}

async function measure(dev, before) {
  await page.setViewportSize({ width: dev.w, height: dev.h });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: dev.top, left: 0, bottom: dev.bottom, right: 0 },
  });
  await page.evaluate((old) => {
    document.getElementById("m-old")?.remove();
    if (old) {
      // 고치기 전 상태를 되살린다 — pb-20(80px) 고정. **이것만** 덮는다.
      const s = document.createElement("style");
      s.id = "m-old";
      s.textContent = `main.pb-nav{padding-bottom:5rem !important}`;
      document.head.appendChild(s);
    }
  }, before);
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const nav = document.querySelector("nav.fixed.inset-x-0");
    if (!main || !nav) return null;
    // 잰 `env()`를 함께 찍는다 — 0이면 에뮬레이션이 안 걸린 것이고, 그때는 모든
    // 기기가 같은 값을 내놓으면서 조용히 통과한다.
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;bottom:0;height:env(safe-area-inset-bottom);width:1px";
    document.body.appendChild(probe);
    const envB = probe.getBoundingClientRect().height;
    probe.remove();
    return {
      pb: Math.round(parseFloat(getComputedStyle(main).paddingBottom)),
      navH: Math.round(nav.getBoundingClientRect().height),
      envB: Math.round(envB),
    };
  });
}

// ── 에뮬레이션이 실제로 걸렸나 ──
// 안 걸리면 모든 기기가 env()=0으로 같은 값을 내고 **조용히 통과한다**. 관문
// 실패(1)와 구분해 환경 문제(2)로 끝낸다.
{
  const t = await measure(DEVICES[1], false);
  if (!t) {
    console.error("환경 문제: 화면에서 main 또는 탭바를 찾지 못했습니다.");
    await browser.close();
    process.exit(ENV_FAIL);
  }
  if (t.envB !== DEVICES[1].bottom) {
    console.error(
      `환경 문제: safe-area 에뮬레이션이 안 걸렸습니다 — env(bottom)이 ${t.envB}px, 기대는 ${DEVICES[1].bottom}px.`,
    );
    await browser.close();
    process.exit(ENV_FAIL);
  }
  console.log(`진짜 env()로 잽니다 — ${DEVICES[1].name}에서 env(bottom) ${t.envB}px\n`);
}

console.log("| 기기 | env(bottom) | 본문 하단 padding | 탭바 높이 | 가려지는 높이 | 판정 |");
console.log("| ---- | ----------- | ----------------- | --------- | ------------- | ---- |");
let fail = 0;
for (const before of [true, false]) {
  for (const dev of DEVICES) {
    const { pb, navH, envB } = await measure(dev, before);
    const hidden = Math.max(0, navH - pb);
    const ok = hidden === 0;
    const tag = before ? "고치기 전 · " : "";
    console.log(`| ${tag}${dev.name} | ${envB}px | ${pb}px | ${navH}px | ${hidden}px | ${ok ? "통과" : "가림"} |`);
    if (!before && !ok) fail++;
  }
}
await browser.close();
if (fail) { console.log(`\n관문 실패: ${fail}개 조건에서 본문이 탭바에 가립니다.`); process.exit(GATE_FAIL); }
console.log("\n모든 조건에서 본문이 탭바에 가리지 않습니다.");
