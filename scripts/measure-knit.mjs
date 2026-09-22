/**
 * 뜨기 모드를 잰다 (discuss/012).
 *
 *   A. 단수가 **화면 높이에 비례**한다
 *   B. `+1`이 보조 조작과 **다른 면**이고, 다크에서 **조명 판이 아니다**
 *   C. 도안이 없으면 도안 칸이 **아예 없다**
 *   D. 되돌리기 · 라이프라인 · 화면 꺼짐 방지가 **다 닿는다**
 *   E. 도안을 켜도 `+1`과 보조 조작이 **화면 안에 남는다**
 *
 * **A는 px이 아니라 비율로 잰다.** 고치기 전 단수는 72px 고정이었고, 그게
 * SE(667px)에서 화면의 10.8%, 아이패드(1180px)에서 **6.1%**였다 — 같은 숫자가
 * 큰 화면일수록 작아 보였다. 뜨면서 팔 길이에서 흘끗 보는 숫자라 기준은 절대
 * 크기가 아니라 **화면에서 차지하는 자리**다.
 *
 * **E가 이 관문의 값어치다.** 012를 만들면서 실제로 이 사고를 냈다 — 단수를
 * 13vh로 키웠더니 812px 폰에서 도안을 켠 순간 `+1`과 보조 조작이 화면 밖으로
 * 밀렸다. 도안을 끈 화면만 보면 멀쩡하고, **도안을 켜야만 드러난다.**
 *
 * **B는 두 테마를 다 잰다.** `+1` 면은 강조색을 쓰지 않는다 — 화면 절반을
 * 강조로 채우면 밤에 뜨는 사람 눈에 조명을 비추는 꼴이다. 그 제약이 지켜지는지
 * 다크에서 밝기 차로 확인한다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-knit.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 단수가 화면 높이에서 차지해야 할 최소 비율. */
const A_최소 = 0.11;
/** 다크에서 `+1` 면이 바탕보다 밝아도 되는 한도(0~255). 넘으면 조명 판이다. */
const B_최대밝기차 = 40;
/** 터치 타깃 최소 변. 손에 실을 쥔 채 누른다. */
const D_최소타깃 = 44;

/** 뷰포트와 safe-area는 같은 기기에서 가져온다(003에서 어긋났던 자리). */
const DEVICES = [
  ["SE 375×667", 375, 667, 20, 0],
  ["13 mini 375×812", 375, 812, 50, 34],
  ["아이폰14 390×844", 390, 844, 47, 34],
  ["아이패드 820×1180", 820, 1180, 24, 20],
];

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
await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

const fail = [];

/** 도안이 있는/없는 프로젝트 하나를 심는다. */
async function seed(withPattern) {
  await page.evaluate(async (wp) => {
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
    await db.counterMarks.add({
      ...base("m1"), counterId: "c1", atRow: 40, kind: "lifeline",
    });
    if (wp) {
      const png = await (
        await fetch(
          "data:image/png;base64," +
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
      ).blob();
      await db.projectPhotos.add({
        ...base("pat1"), projectId: "p1", blob: png, takenAt: old, kind: "pattern",
      });
    }
  }, withPattern);
}

async function 열기(dev) {
  const [, w, h, top, bottom] = dev;
  await page.setViewportSize({ width: w, height: h });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top, left: 0, bottom, right: 0 },
  });
  await page.goto(BASE + "/projects/p1/knit", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
}

/** 화면에서 재는 것 전부. 구조가 바뀌면 null이 섞여 환경 문제로 간다. */
function probe() {
  return page.evaluate(() => {
    const H = innerHeight;
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) };
    };

    const 단수 = [...document.querySelectorAll("p")].find(
      (p) => /^\d+$/.test((p.textContent ?? "").trim()) &&
        parseFloat(getComputedStyle(p).fontSize) > 30
    );
    const plus = document.querySelector('button[aria-label="+1"]');
    const 라벨로 = (t) =>
      [...document.querySelectorAll("button")].find(
        (b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === t
      );

    const 보조 = ["되돌리기", "−1", "여기에 라이프라인"].map(라벨로);
    const 해 = 라벨로("화면 켜둠");
    const 도안토글 = 라벨로("도안 나란히 보기");
    // 도안 칸. 볼 것이 없으면 이 요소 자체가 없어야 한다(012).
    const 도안칸 = document.querySelector("main aside, aside");

    return {
      H,
      단수px: 단수 ? Math.round(parseFloat(getComputedStyle(단수).fontSize)) : null,
      plus: plus
        ? { ...box(plus), bg: getComputedStyle(plus).backgroundColor, shadow: getComputedStyle(plus).boxShadow }
        : null,
      보조: 보조.map((b, i) =>
        b ? { ...box(b), bg: getComputedStyle(b).backgroundColor, 이름: ["되돌리기", "−1", "라이프라인"][i] } : null
      ),
      해: 해 ? { ...box(해), 태그: 해.tagName } : null,
      도안토글: 도안토글 ? box(도안토글) : null,
      도안칸: 도안칸 ? box(도안칸) : null,
      바탕: getComputedStyle(document.body).backgroundColor,
      // 안내문이 남아 있으면 잡는다 — 칸만 없애고 글을 어딘가 두면 의미가 없다.
      안내: (document.body.textContent ?? "").includes("작업대에 도안이나"),
    };
  });
}

const 밝기 = (rgb) => {
  const [r, g, b] = rgb.match(/[\d.]+/g).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/* ── 관문 A · C · D — 도안 없는 프로젝트, 네 기기 ────────────────────── */

await seed(false);

console.log("관문 A — 단수가 화면 높이에 비례하나 (도안 없음)");
console.log("| 기기 | 화면 | 단수 | 화면 대비 | 판정 |");
console.log("| ---- | ---- | ---- | --------- | ---- |");
let 마지막 = null;
for (const dev of DEVICES) {
  await 열기(dev);
  const m = await probe();
  if (!m || m.단수px === null || !m.plus) {
    console.error(`\n환경 문제: ${dev[0]}에서 단수 또는 \`+1\`을 찾지 못했습니다. 화면 구조가 바뀌었습니까?`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 비 = m.단수px / m.H;
  const ok = 비 >= A_최소;
  console.log(`| ${dev[0]} | ${m.H}px | ${m.단수px}px | ${(비 * 100).toFixed(1)}% | ${ok ? "통과" : "작다"} |`);
  if (!ok)
    fail.push(`A: ${dev[0]}에서 단수가 화면의 ${(비 * 100).toFixed(1)}%다 (최소 ${A_최소 * 100}%)`);
  마지막 = m;
}

console.log("\n관문 C — 도안이 없을 때 도안 칸");
console.log(`  도안 칸 ${마지막.도안칸 ? `${마지막.도안칸.w}×${마지막.도안칸.h}` : "없음"} · 안내문 ${마지막.안내 ? "있음" : "없음"} · 도안 토글 ${마지막.도안토글 ? "있음" : "없음"}`);
if (마지막.도안칸)
  fail.push(`C: 볼 도안이 없는데 도안 칸이 ${마지막.도안칸.w}×${마지막.도안칸.h}로 그려졌다`);
if (마지막.안내)
  fail.push("C: 볼 도안이 없는데 안내문이 화면에 남아 있다 — 결핍으로 읽힌다");
if (마지막.도안토글)
  fail.push("C: 볼 도안이 없는데 `도안 나란히 보기` 단추가 있다 — 눌러도 빈 칸이 열린다");

console.log("\n관문 D — 되돌리기 · 라이프라인 · 화면 꺼짐 방지가 닿나");
const D항목 = [
  ["화면 꺼짐 방지", 마지막.해],
  ...마지막.보조.map((b) => [b?.이름 ?? "보조", b]),
];
for (const [이름, b] of D항목) {
  if (!b) {
    console.error(`\n환경 문제: \`${이름}\` 단추를 찾지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 타깃 = Math.min(b.w, b.h);
  const 보임 = b.bottom <= 마지막.H;
  const ok = 타깃 >= D_최소타깃 && 보임;
  console.log(`  ${ok ? "○" : "×"} ${이름} — ${b.w}×${b.h} (최소 변 ${타깃}px) · 화면 안 ${보임 ? "예" : "아니오"}`);
  if (타깃 < D_최소타깃)
    fail.push(`D: \`${이름}\`의 타깃이 ${타깃}px이다 (최소 ${D_최소타깃}px)`);
  if (!보임) fail.push(`D: \`${이름}\`이 화면 밖에 있다`);
}

/* ── 관문 B — `+1`이 보조 조작과 다른 면인가 (두 테마) ──────────────── */

console.log("\n관문 B — `+1` 면 (라이트·다크)");
await 열기(DEVICES[2]);
for (const theme of ["light", "dark"]) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
  await page.waitForTimeout(250);
  const 걸렸나 = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );
  if (걸렸나 !== (theme === "dark")) {
    console.error(`\n환경 문제: 테마를 ${theme}로 걸지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const m = await probe();
  const 보조bg = m.보조[1]?.bg;
  const 다른면 = m.plus.bg !== 보조bg;
  const 그림자 = m.plus.shadow !== "none";
  const 면적 = m.plus.w * m.plus.h;
  const 보조면적 = m.보조.reduce((s, b) => s + (b ? b.w * b.h : 0), 0);
  const 밝기차 = 밝기(m.plus.bg) - 밝기(m.바탕);
  console.log(`  [${theme}] +1 ${m.plus.bg} · 보조 ${보조bg} · 그림자 ${그림자 ? "있음" : "없음"}`);
  console.log(`  [${theme}] 면적 ${면적} vs 보조 합 ${보조면적} · 바탕 대비 밝기차 ${밝기차.toFixed(1)} (최대 ${B_최대밝기차})`);
  if (!다른면)
    fail.push(`B(${theme}): \`+1\`이 보조 조작과 같은 면(${보조bg})이다 — 빈 회색 상자로 읽힌다`);
  if (!그림자) fail.push(`B(${theme}): \`+1\`에 그림자가 없다 — 눌리는 면으로 안 보인다`);
  if (면적 <= 보조면적)
    fail.push(`B(${theme}): \`+1\`(${면적})이 보조 조작 합(${보조면적})보다 크지 않다`);
  if (theme === "dark" && 밝기차 > B_최대밝기차)
    fail.push(`B(dark): \`+1\`이 바탕보다 ${밝기차.toFixed(1)} 밝다 (최대 ${B_최대밝기차}) — 밤에 조명 판이 된다`);
}
await page.evaluate(() => document.documentElement.classList.remove("dark"));

/* ── 관문 E — 도안을 켜도 누를 자리가 화면 안에 남나 ────────────────── */

await seed(true);
console.log("\n관문 E — 도안을 켠 채 `+1`과 보조 조작이 화면 안인가");
for (const dev of DEVICES.slice(0, 3)) {
  await 열기(dev);
  const m = await probe();
  if (!m.도안칸) {
    console.error(`\n환경 문제: ${dev[0]}에서 도안을 심었는데 도안 칸이 없습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  if (!m.plus) {
    console.error(`\n환경 문제: ${dev[0]}에서 \`+1\`을 찾지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 아래 = Math.max(m.plus.bottom, ...m.보조.map((b) => (b ? b.bottom : 0)));
  const ok = 아래 <= m.H;
  console.log(`  ${ok ? "○" : "×"} ${dev[0]} — 가장 아래 조작 ${아래}px / 화면 ${m.H}px${ok ? "" : ` → ${아래 - m.H}px 밀려남`}`);
  if (!ok)
    fail.push(`E: ${dev[0]}에서 도안을 켜면 누를 자리가 ${아래 - m.H}px 화면 밖으로 밀린다`);
}

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
