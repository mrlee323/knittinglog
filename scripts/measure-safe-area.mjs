/**
 * 홈 첫 카드의 사진을 키웠을 때 첫 화면이 버티는지 잰다 (discuss/003).
 *
 * 관문 둘을 코드로 둔다 — 눈으로 읽는 관문은 지켜지지 않는다.
 *   CTA   — `뜨기` 전체가 탭바 위에 보이고, 탭바까지 24px 이상 남는다
 *   둘째   — 둘째 카드가 100px 이상 보인다 (001이 상한을 정한 근거)
 *
 * **종료코드를 가른다.** 환경 문제와 관문 실패가 같은 코드면 "관문이 있다"는
 * 증거로 쓸 수 없다(003 · 검증).
 *   0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버)
 *
 * **뷰포트와 safe-area는 같은 기기에서 가져온다.** 59/34를 390×844에 붙이면
 * 없는 기기를 재게 된다 — 003에서 실제로 그 오류가 났다.
 *
 * **사진 높이는 비율로 낸다.** 카드 내부 폭이 기기마다 다르므로(390→326,
 * 375→311) 고정 px로 재면 기기 간 비교가 성립하지 않는다.
 *
 * playwright는 이 저장소의 의존성이 아니다(shot.mjs와 같은 이유).
 *
 *   npm run dev
 *   npx --yes playwright@latest install chromium          # 처음 한 번
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-safe-area.mjs
 *
 *   # 브라우저가 표준 위치에 없으면
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/measure-safe-area.mjs
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

/** 결정된 상한(003). 이 비율이 모든 기기를 통과하지 못하면 관문 실패다. */
const 상한 = "4:3";

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

/** 사진 비율. 높이는 카드 내부 폭에서 낸다. */
const RATIOS = [
  ["없음", 0],
  ["4:3", 3 / 4],
  ["9:8", 8 / 9],
  ["8:7", 7 / 8],
  ["1:1", 1],
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
    value: 42, step: 1, sortOrder: 0, createdAt: now, updatedAt: now,
  });
  const paused = new Date(now.getTime() - 30 * 864e5);
  await db.projects.add({
    id: "measure-project-2", name: "측정용 양말", craft: "knit", category: "socks",
    status: "hibernating", pauseReason: "out-of-yarn", startedAt: paused,
    pausedAt: paused, createdAt: paused, updatedAt: paused,
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

async function apply(dev, ratio) {
  await page.setViewportSize({ width: dev.w, height: dev.h });
  const cardW = await page.evaluate(() => {
    const c = document.querySelector("main a[href*='/projects/']");
    if (!c) return null;
    const cs = getComputedStyle(c);
    return Math.round(c.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
  });
  const photoH = ratio > 0 && cardW ? Math.round(cardW * ratio) : 0;
  await page.evaluate(
    ([t, b, h]) => {
      document.getElementById("m-safe")?.remove();
      document.getElementById("m-photo")?.remove();
      if (t || b) {
        const s = document.createElement("style");
        s.id = "m-safe";
        s.textContent = `.pt-safe{padding-top:${t}px !important}.pb-safe{padding-bottom:${b}px !important}`;
        document.head.appendChild(s);
      }
      if (h > 0) {
        const card = document.querySelector("main a[href*='/projects/']");
        const sp = document.createElement("div");
        sp.id = "m-photo";
        sp.style.cssText = `height:${h}px;flex:0 0 ${h}px;background:#ddd`;
        card.parentElement.insertBefore(sp, card);
      }
    },
    [dev.top, dev.bottom, photoH],
  );
  await page.waitForTimeout(200);
  return { cardW, photoH };
}

async function read() {
  return page.evaluate(() => {
    const nav = document.querySelector("nav.fixed.inset-x-0");
    const cta = document.querySelector("main a[href*='/knit'] button, main a[href*='/knit']");
    const second = document.querySelector("main section ul li a, main section ul li > *");
    const n = nav?.getBoundingClientRect();
    const c = cta?.getBoundingClientRect();
    const s2 = second?.getBoundingClientRect();
    return {
      navTop: n ? Math.round(n.top) : null,
      navHeight: n ? Math.round(n.height) : null,
      ctaBottom: c ? Math.round(c.bottom) : null,
      secondTop: s2 ? Math.round(s2.top) : null,
      found: !!c && !!s2,
    };
  });
}

const fail = [];

// ── 재현 관문: 001의 값이 다시 나오는가 ──
const bl = DEVICES.find((d) => d.baseline);
await apply(bl, 0);
const base = await read();
console.log(`재현 관문 — 탭바 상단 ${base.navTop} (001: 786) · 높이 ${base.navHeight} (001: 58)`);
if (!base.found) {
  console.error("환경 문제: CTA 또는 둘째 카드를 찾지 못했습니다. 화면 구조가 바뀌었습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}
if (base.navTop !== 786 || base.navHeight !== 58) fail.push("재현 관문: 001의 값이 다시 나오지 않았다");

console.log("\n| 사진 | 기기 | 카드 폭 | 사진 높이 | CTA 여유 | 둘째 카드 | 판정 |");
console.log("| ---- | ---- | ------- | --------- | -------- | --------- | ---- |");
const rows = [];
for (const [rname, ratio] of RATIOS) {
  for (const dev of DEVICES) {
    const { cardW, photoH } = await apply(dev, ratio);
    const r = await read();
    const gap = r.navTop - r.ctaBottom;
    const seen2 = r.navTop - r.secondTop;
    const ctaOk = r.ctaBottom <= r.navTop && gap >= 여유_최소;
    const secondOk = seen2 >= 둘째_최소;
    const ok = ctaOk && secondOk;
    rows.push({ rname, dev: dev.name, gap, seen2, ctaOk, secondOk, ok });
    console.log(
      `| ${rname} | ${dev.name} | ${cardW}px | ${photoH}px | ${gap}px | ${seen2 > 0 ? seen2 + "px" : "안 보임"} | ${ok ? "통과" : !ctaOk ? "CTA 탈락" : "둘째 탈락"} |`,
    );
  }
}

console.log("\n비율별 최악 조건:");
for (const [rname] of RATIOS) {
  if (rname === "없음") continue;
  const rs = rows.filter((r) => r.rname === rname && !r.dev.includes("safe0"));
  const worst = rs.reduce((a, b) => (a.seen2 <= b.seen2 ? a : b));
  console.log(
    `  ${rname}: ${worst.dev}에서 둘째 카드 ${worst.seen2}px — ${worst.ok ? `통과 (여유 ${worst.seen2 - 둘째_최소}px)` : "탈락"}`,
  );
}

const survivors = RATIOS.filter(([n]) => n !== "없음").filter(([n]) =>
  rows.filter((r) => r.rname === n).every((r) => r.ok),
);
console.log(`\n모든 기기를 통과하는 비율: ${survivors.length ? survivors.map(([n]) => n).join(", ") : "없음"}`);
if (!survivors.some(([n]) => n === 상한))
  fail.push(`결정된 상한 ${상한}이 모든 기기를 통과하지 못한다`);

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
