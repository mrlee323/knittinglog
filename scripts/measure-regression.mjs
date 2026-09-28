/**
 * 전체 회귀 — 001~013이 서로 부딪히지 않는지 훑는다 (discuss/014).
 *
 *   A. 가로로 넘치지 않는다
 *   B. 글자가 **뜻하지 않게** 잘리지 않는다 — 두 언어에서
 *   C. 하단 내비가 본문을 가리지 않는다
 *   D. 결핍 블록이 화면마다 **1개 이하**다
 *
 * **이 관문만 두 언어를 다 돈다.** 앞선 관문 아홉은 전부 한국어 기준이다
 * (세는 규칙이 `없어요` 같은 한국어 문구에 걸려 있다). 그런데 이 앱의 레이아웃은
 * **한국어 길이에 맞춰** 잡혔다 — `38단 남음`은 짧고 `38 rows left`는 길다.
 * 영어에서 깨지는 자리는 한국어만 재면 절대 안 보인다. 014의 검증 범위가
 * "한국어/영어 문구 길이"를 따로 적은 이유다.
 *
 * **B는 `truncate`를 위반으로 세지 않는다.** 말줄임은 **의도한 자름**이고
 * 이 앱은 목록·카드에서 그걸 쓴다(005·006). 뜻하지 않은 자름은 말줄임 없이
 * 내용이 상자를 넘는 것이다 — `text-overflow`가 `clip`인데 `scrollWidth`가
 * 더 큰 경우다.
 *
 * **C는 `measure-bottom-nav`와 다른 것을 본다.** 거기는 본문 `padding`과 탭바
 * 높이의 **관계**를 보고(004), 여기는 실제로 **마지막 내용이 탭바 아래 깔리는지**를
 * 화면마다 본다. 관계가 맞아도 특정 화면이 `pb-nav`를 안 쓰면 깔린다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-regression.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 결핍 블록 상한. 007이 홈에서 정한 값을 앱 전체로 넓힌다. */
const D_최대 = 1;

/** 014의 검증 범위가 적은 폭 넷. 뷰포트와 safe-area는 같은 기기에서. */
const DEVICES = [
  ["13 mini 375×812", 375, 812, 50, 34],
  ["아이폰14 390×844", 390, 844, 47, 34],
  ["15 Pro Max 430×932", 430, 932, 59, 34],
  ["데스크톱 1280×900", 1280, 900, 0, 0],
];

const 화면 = [
  ["홈", "/"],
  ["목록", "/projects"],
  ["상세", "/projects/p0"],
  ["빈 상세", "/projects/p3"],
  ["설정", "/settings"],
  ["뜨기", "/projects/p0/knit"],
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
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 20000 });
} catch (e) {
  console.error(`환경 문제: ${BASE} 를 열지 못했습니다. npm run dev 가 떠 있습니까?`);
  console.error("  " + e.message);
  await browser.close();
  process.exit(ENV_FAIL);
}

const cdp = await ctx.newCDPSession(page);

/**
 * 014의 검증 범위를 그대로 심는다 — 상태 넷, 사진 있는 것과 없는 것.
 *
 * `p0`은 다 갖춘 진행중, `p3`은 아무것도 없는 계획중이다. 둘이 이 앱의 양 끝이라
 * 레이아웃이 깨진다면 거기서 깨진다.
 */
async function seed() {
  await page.evaluate(async () => {
    const { db } = await import("/knittinglog/src/lib/db.ts");
    await db.delete();
    await db.open();
    const d = (n) => new Date(Date.now() - n * 86400000);
    const base = (id, n = 3) => ({ id, createdAt: d(n), updatedAt: d(n) });
    const png = await (
      await fetch(
        "data:image/png;base64," +
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      )
    ).blob();

    const rows = [
      ["p0", "회색 라글란 스웨터", "sweater", "active"],
      ["p1", "연말 선물용 아주 두꺼운 겨울 양말", "socks", "hibernating"],
      ["p2", "베이비 보닛", "hat", "finished"],
      ["p3", "새로 시작할 목도리", "accessory", "planning"],
    ];
    for (const [id, name, category, status] of rows) {
      await db.projects.add({
        ...base(id), name, craft: "knit", category, status,
        startedAt: status === "planning" ? undefined : d(40),
        pausedAt: status === "hibernating" ? d(12) : undefined,
        pauseReason: status === "hibernating" ? "out-of-yarn" : undefined,
        coverPhotoId: id === "p0" ? "ph0" : undefined,
      });
    }
    // 사진은 p0에만 — "사진 있는 것과 없는 것"이 한 목록에 섞여야 한다(005).
    await db.projectPhotos.add({
      ...base("ph0"), projectId: "p0", blob: png, takenAt: d(3), kind: "progress",
    });
    for (let i = 0; i < 2; i++)
      await db.projectPhotos.add({
        ...base("r" + i), projectId: "p0", blob: png, takenAt: d(3),
        kind: i ? "reference" : "pattern",
      });

    await db.counters.add({
      ...base("c1"), projectId: "p0", label: "몸판", value: 62, target: 100, sortOrder: 0,
    });
    await db.counterMarks.add({
      ...base("m1"), counterId: "c1", atRow: 40, kind: "lifeline",
    });
    for (let i = 0; i < 6; i++)
      await db.counterSessions.add({
        ...base("s" + i, i), counterId: "c1", projectId: "p0",
        startedAt: d(i), endedAt: new Date(d(i).getTime() + 45 * 60000), rowsAdded: 10 + i,
      });
    await db.yarns.add({
      ...base("y1"), skeinCount: 4, name: "울코튼 그레이", colorHex: "#8a8f9a",
      skeinGrams: 50, skeinMeters: 120,
    });
    await db.yarnAllocations.add({
      ...base("a1"), yarnId: "y1", projectId: "p0", skeinsAllocated: 4,
    });
    await db.yarnWeighIns.add({
      ...base("w1"), allocationId: "a1", date: d(3), remainingGrams: 128, atRow: 62,
    });
    await db.needles.add({
      ...base("n1"), craft: "knit", type: "circular", sizeMm: 4.5, occupiedByProjectId: "p0",
    });
    await db.gauges.add({
      ...base("g1"), projectId: "p0", stitchesPer10cm: 22, rowsPer10cm: 30, needleMm: 4.5,
    });
  });
}

const fail = [];

/** 한 화면에서 넷을 한 번에 잰다. */
function probe() {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector("main") ?? document.body;

    // A — 가로 넘침
    const 가로 = Math.max(0, doc.scrollWidth - doc.clientWidth);

    // B — 뜻하지 않은 자름. 말줄임(`ellipsis`)은 의도한 것이라 세지 않는다.
    const 잘림 = [];
    for (const el of main.querySelectorAll("*")) {
      if (el.children.length > 0) continue;
      const t = (el.textContent ?? "").trim();
      if (!t) continue;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === "ellipsis") continue;
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
      /*
        **눈에서 감춘 것은 잘린 것이 아니다.**

        처음 돌렸을 때 `카드로 공유`가 여섯 번 잡혔다. 011이 폰에서 그 라벨을
        `sr-only`로 내렸는데(제목이 세 줄로 접히는 걸 막으려고), `sr-only`는
        1px 상자에 `overflow:hidden`이라 `scrollWidth`가 크게 나온다 —
        **읽으라고 둔 글자가 아니라 스크린리더용 이름**이다.
      */
      if (el.clientWidth <= 1 || el.clientHeight <= 1) continue;
      if (el.scrollWidth - el.clientWidth > 1)
        잘림.push(`${t.slice(0, 16)}(${el.scrollWidth - el.clientWidth}px)`);
    }

    // C — 하단 내비가 본문을 가리나. 내비가 없는 폭(데스크톱 옆 내비)은 건너뛴다.
    /*
      탭바는 `md:hidden`이라 넓은 화면에는 **없다**. 그런데 `display:none`인
      요소의 `getBoundingClientRect()`는 전부 0이라, 그냥 쓰면 탭바 윗변이
      0px이 되어 **본문 전체가 깔린 것으로 잡힌다** — 처음 돌렸을 때 데스크톱
      다섯 화면이 그렇게 잡혔다. 화면에 실제로 떠 있을 때만 본다.
    */
    const navEl = document.querySelector("nav.fixed.inset-x-0");
    const nav =
      navEl && navEl.getBoundingClientRect().height > 0 ? navEl : null;
    let 가림 = 0;
    if (nav) {
      const navTop = nav.getBoundingClientRect().top + scrollY;
      let 바닥 = 0;
      for (const el of main.querySelectorAll("*")) {
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join("")
          .trim();
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (own || el.tagName === "IMG" || el.tagName === "BUTTON")
          바닥 = Math.max(바닥, r.bottom + scrollY);
      }
      가림 = Math.max(0, Math.round(바닥 - navTop));
    }

    // D — 결핍 블록(007의 세는 규칙). 한국어에서만 센다.
    const 결핍 = [];
    for (const el of main.querySelectorAll("*")) {
      if (el.children.length > 0) continue;
      const text = (el.textContent ?? "").trim();
      if (/없어요$|없음$/.test(text)) 결핍.push(text);
    }

    return { 가로, 잘림, 가림, 결핍, 내비: !!nav, 글자수: main.textContent.trim().length };
  });
}

console.log("| 기기 | 언어 | 화면 | 가로넘침 | 잘림 | 탭바가림 | 결핍 |");
console.log("| ---- | ---- | ---- | -------- | ---- | -------- | ---- |");

for (const locale of ["ko", "en"]) {
  await page.evaluate((l) => {
    localStorage.setItem("knittinglog:locale", JSON.stringify(l));
  }, locale);
  await seed();

  for (const [기기, w, h, top, bottom] of DEVICES) {
    await page.setViewportSize({ width: w, height: h });
    await cdp.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top, left: 0, bottom, right: 0 },
    });

    for (const [이름, path] of 화면) {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      // 아래까지 다 그려진 뒤에 잰다 — 탭바 가림은 맨 아래에서만 드러난다.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      const m = await probe();

      if (!m || m.글자수 < 5) {
        console.error(`\n환경 문제: ${기기}/${locale}의 ${이름}(${path})에 내용이 없습니다. 화면 구조가 바뀌었습니까?`);
        await browser.close();
        process.exit(ENV_FAIL);
      }

      const 결핍수 = locale === "ko" ? m.결핍.length : 0;
      const ok = m.가로 === 0 && m.잘림.length === 0 && m.가림 === 0 && 결핍수 <= D_최대;
      console.log(`| ${기기} | ${locale} | ${이름} | ${m.가로}px | ${m.잘림.length} | ${m.가림}px | ${결핍수} |${ok ? "" : " ←"}`);

      if (m.가로 > 0)
        fail.push(`A: ${기기}/${locale} ${이름}에서 가로로 ${m.가로}px 넘친다`);
      if (m.잘림.length)
        fail.push(`B: ${기기}/${locale} ${이름}에서 글자가 잘린다 — ${m.잘림.slice(0, 3).join(", ")}`);
      if (m.가림 > 0)
        fail.push(`C: ${기기}/${locale} ${이름}에서 본문이 탭바에 ${m.가림}px 깔린다`);
      if (결핍수 > D_최대)
        fail.push(`D: ${기기} ${이름}에 결핍 블록이 ${결핍수}개다 (최대 ${D_최대}) — ${m.결핍.join(", ")}`);
    }
  }
}

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
