/**
 * 홈 첫 카드의 `뜨기` CTA가 safe-area에서도 첫 화면에 남는지 잰다 (discuss/003).
 *
 * 판정 대상은 카드가 아니라 **CTA**다. 사진을 키우면 CTA가 탭바 아래로 밀리는데,
 * 그 순간 이 앱은 "그 자리에서 이어 뜨는 기록장"이기를 그만둔다.
 *
 * 관문 셋을 코드로 둔다 — 하나라도 깨지면 non-zero로 끝난다. 출력만 하면 다음
 * 사람이 눈으로 읽어야 하고, 눈으로 읽는 관문은 지켜지지 않는다.
 *
 *   1. 재현   — safe-area 0에서 001의 값(탭바 상단 786 · 높이 58)이 다시 나온다
 *   2. CTA    — CTA 전체가 탭바 위에 보인다
 *   3. 여유   — CTA 하단과 탭바 상단 사이 24px 이상
 *
 * 큰 사진 카드는 아직 없다(005·006 예정). 그래서 카드 안에 **스페이서**를 넣어
 * 사진 높이를 흉내낸다. 스페이서는 사진이 아니므로 이것은 시뮬레이션이다.
 *
 *   npm run dev
 *   npx --yes playwright@latest install chromium        # 처음 한 번
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-safe-area.mjs
 */
const PW = process.env.PW || "playwright";
const { chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW);

const BASE = process.env.SHOT_BASE ?? "http://localhost:5173/knittinglog";
const VIEW = { width: 390, height: 844 };
const 여유_최소 = 24;    // 터치 목표 44px의 절반. "보이긴 함"과 "안심하고 누름"의 경계(003 기획)
const 둘째_최소 = 100;   // 001이 상한을 정할 때 쓴 조건 — 둘째 카드가 100px이라도 보인다

/** 안전영역 조건. 47/34는 아이폰14, 59/34는 15 Pro. 둘 다 가정값이다. */
const INSETS = [
  ["safe 0 (헤드리스)", 0, 0],
  ["아이폰14 47/34", 47, 34],
  ["15 Pro 59/34", 59, 34],
];

/** 사진 높이. 폭 326 기준 환산값(001). 0은 지금 화면(큰 사진 없음). */
const PHOTOS = [
  ["없음 (지금)", 0],
  ["4:3", 245],
  ["9:8 (290)", 290],
  ["8:7 (300)", 300],
  ["1:1", 326],
  ["4:5", 408],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [page error]", e.message));

await page.goto(BASE + "/", { waitUntil: "networkidle" });

// **DB를 비우고 하나만 넣는다.** 남아 있는 데이터가 있으면 첫 카드가 측정 대상이
// 아닐 수 있고, 그러면 재현 관문이 무의미해진다.
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete();
  await db.open();
  const now = new Date();
  const pid = "measure-project";
  await db.projects.add({
    id: pid, name: "측정용 스웨터", craft: "knit", category: "sweater",
    status: "active", startedAt: now, createdAt: now, updatedAt: now,
  });
  await db.counters.add({
    id: "measure-counter", projectId: pid, label: "단수", kind: "row",
    value: 42, step: 1, sortOrder: 0, createdAt: now, updatedAt: now,
  });
  // 둘째 카드(기다리는 것)가 있어야 001의 구속 조건을 잴 수 있다.
  const paused = new Date(now.getTime() - 30 * 864e5);
  await db.projects.add({
    id: "measure-project-2", name: "측정용 양말", craft: "knit", category: "socks",
    status: "hibernating", pauseReason: "out-of-yarn", startedAt: paused,
    pausedAt: paused, createdAt: paused, updatedAt: paused,
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);

async function apply(top, bottom, photo) {
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
        if (card) {
          const sp = document.createElement("div");
          sp.id = "m-photo";
          sp.style.cssText = `height:${h}px;flex:0 0 ${h}px;background:#ddd`;
          card.parentElement.insertBefore(sp, card);
        }
      }
    },
    [top, bottom, photo],
  );
  await page.waitForTimeout(200);
}

async function read() {
  return page.evaluate(() => {
    const nav = document.querySelector("nav.fixed.inset-x-0");
    const cta = document.querySelector("main a[href*='/knit'] button, main a[href*='/knit']");
    // 둘째 카드 = "기다리는 것"의 첫 줄. 001이 100px 보임을 상한 근거로 썼다.
    const second = document.querySelector("main section ul li a, main section ul li > *");
    const n = nav?.getBoundingClientRect();
    const c = cta?.getBoundingClientRect();
    const s2 = second?.getBoundingClientRect();
    return {
      navTop: n ? Math.round(n.top) : null,
      navHeight: n ? Math.round(n.height) : null,
      ctaBottom: c ? Math.round(c.bottom) : null,
      secondTop: s2 ? Math.round(s2.top) : null,
      found: !!c,
      foundSecond: !!s2,
    };
  });
}

let fail = [];

// ── 관문 1: 재현 ──
await apply(0, 0, 0);
const base = await read();
console.log(`재현 관문 — 탭바 상단 ${base.navTop} (001: 786) · 높이 ${base.navHeight} (001: 58)`);
if (base.navTop !== 786 || base.navHeight !== 58) fail.push("재현 관문: 001의 값이 다시 나오지 않았다");
if (!base.found) fail.push("CTA를 찾지 못했다");

// ── 표 ──
console.log("\n| 사진 | 안전영역 | CTA 여유 | 둘째 카드 보이는 높이 | 판정 |");
console.log("| ---- | -------- | -------- | --------------------- | ---- |");
const rows = [];
for (const [pname, ph] of PHOTOS) {
  for (const [iname, it, ib] of INSETS) {
    await apply(it, ib, ph);
    const r = await read();
    const gap = r.navTop - r.ctaBottom;
    const seen2 = r.foundSecond ? r.navTop - r.secondTop : null;
    const ctaOk = r.ctaBottom <= r.navTop && gap >= 여유_최소;
    const secondOk = seen2 !== null && seen2 >= 둘째_최소;
    const ok = ctaOk && secondOk;
    rows.push({ pname, iname, gap, seen2, ctaOk, secondOk, ok });
    const why = ok ? "통과" : !ctaOk ? "CTA 탈락" : "둘째 카드 탈락";
    console.log(
      `| ${pname} | ${iname} | ${gap}px | ${seen2 === null ? "없음" : (seen2 > 0 ? seen2 + "px" : "안 보임")} | ${why} |`,
    );
  }
}

// ── 관문 2·3: 1:1이 모든 안전영역 조건에서 통과해야 한다 ──
const oneToOne = rows.filter((r) => r.pname === "1:1");
const bad = oneToOne.filter((r) => !r.ok);
console.log();
if (bad.length) {
  for (const b of bad)
    console.log(`1:1 실패 — ${b.iname}: CTA 여유 ${b.gap}px${b.ctaOk ? "(OK)" : "(부족)"}, 둘째 카드 ${b.seen2}px${b.secondOk ? "(OK)" : "(부족)"}`);
  fail.push(`1:1이 관문을 통과하지 못한다`);
} else {
  console.log(`1:1 통과 — 모든 안전영역 조건에서 CTA 여유 ${여유_최소}px·둘째 카드 ${둘째_최소}px 이상`);
}

await browser.close();
if (fail.length) {
  console.log("\n실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\n모든 관문 통과");
