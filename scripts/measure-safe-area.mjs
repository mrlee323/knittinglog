/**
 * 001의 1:1 상한이 실기기 안전영역에서도 버티는지 잰다 (002 이월 항목).
 *
 * 관문: 먼저 안전영역 0으로 001의 값(첫 카드 상단 74 · 탭바 상단 786 ·
 * 카드 내부 폭 326)을 재현한다. 재현하지 못하면 새 숫자도 믿을 수 없으므로
 * 거기서 멈춘다.
 */
/**
 * playwright는 이 앱의 의존성이 아니다(shot.mjs와 같은 이유). 쓸 때만 임시로
 * 받고, ESM은 NODE_PATH를 보지 않으므로 경로를 직접 받는다.
 *
 *   npx --yes playwright@latest install chromium        # 처음 한 번
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-safe-area.mjs
 */
const PW = process.env.PW || "playwright";
const { chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW);

const BASE = "http://localhost:5173/knittinglog";
const VIEW = { width: 390, height: 844 };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [page error]", e.message));

await page.goto(BASE + "/", { waitUntil: "networkidle" });

// 홈 첫 카드는 프로젝트가 있어야 그려진다. Vite가 소스를 그대로 서빙하므로
// 앱 자신의 Dexie 모듈을 그대로 쓴다 — 스키마를 손으로 흉내내지 않는다.
const seeded = await page.evaluate(async () => {
  const mod = await import("/knittinglog/src/lib/db.ts");
  const db = mod.db;
  const now = new Date();
  const id = crypto.randomUUID();
  await db.projects.add({
    id, name: "측정용 스웨터", craft: "knit", category: "sweater",
    status: "active", startedAt: now, createdAt: now, updatedAt: now,
  });
  const cid = crypto.randomUUID();
  await db.counters.add({
    id, projectId: id, name: "단수", value: 42, step: 1,
    createdAt: now, updatedAt: now, ...{ id: cid },
  });
  return (await db.projects.count());
});
console.log(`씨드: 프로젝트 ${seeded}개`);

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);

/** 안전영역을 주입한다. 앱이 .pt-safe/.pb-safe 유틸을 쓰므로 그 값을 덮는다. */
async function setInsets(top, bottom) {
  await page.evaluate(
    ([t, b]) => {
      document.getElementById("safe-inject")?.remove();
      if (t === 0 && b === 0) return;
      const s = document.createElement("style");
      s.id = "safe-inject";
      s.textContent = `.pt-safe{padding-top:${t}px !important}.pb-safe{padding-bottom:${b}px !important}`;
      document.head.appendChild(s);
    },
    [top, bottom],
  );
  await page.waitForTimeout(250);
}

async function measure() {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const nav = document.querySelector("nav.fixed.inset-x-0");
    // 첫 카드 = main 안 첫 번째 카드성 블록. Page 제목 아래 첫 요소.
    const card =
      document.querySelector("main a[href*='/projects/']") ||
      document.querySelector("main section, main > div > *");
    const navR = nav?.getBoundingClientRect();
    const cardR = card?.getBoundingClientRect();
    const mainCS = main ? getComputedStyle(main) : null;
    return {
      viewport: window.innerHeight,
      mainPadTop: mainCS ? parseFloat(mainCS.paddingTop) : null,
      mainPadBottom: mainCS ? parseFloat(mainCS.paddingBottom) : null,
      navTop: navR ? Math.round(navR.top) : null,
      navHeight: navR ? Math.round(navR.height) : null,
      cardTop: cardR ? Math.round(cardR.top) : null,
      cardWidth: cardR ? Math.round(cardR.width) : null,
      cardTag: card ? card.tagName + "." + (card.className || "").slice(0, 40) : null,
    };
  });
}

console.log("\n=== 안전영역 0 (헤드리스 = 001의 조건) ===");
await setInsets(0, 0);
const base = await measure();
console.log(base);

console.log("\n=== 안전영역 아이폰14 (위 47 / 아래 34) ===");
await setInsets(47, 34);
const real = await measure();
console.log(real);

console.log("\n=== 차이 ===");
console.log({
  cardTop: `${base.cardTop} → ${real.cardTop}`,
  navTop: `${base.navTop} → ${real.navTop}`,
  navHeight: `${base.navHeight} → ${real.navHeight}`,
  남는높이: `${base.navTop - base.cardTop} → ${real.navTop - real.cardTop}`,
  "nav가 main pb를 넘나": `${real.navHeight} vs pb ${real.mainPadBottom}`,
});

await browser.close();
