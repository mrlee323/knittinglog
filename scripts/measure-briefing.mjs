/**
 * 프로젝트 상세의 복귀 브리핑을 잰다 (discuss/008).
 *
 * 008의 완료 기준은 셋이고, 관문도 셋이다. 넷째(D)는 007이 없앤 화면이
 * 되돌아오지 않게 지키는 것이다.
 *
 *   A. `뜨기` 버튼까지 스크롤이 없다 — **세 기기의 진짜 safe-area에서**
 *   B. 브리핑이 008이 요구한 사실을 다 담는다
 *   C. 수정·삭제·복제가 `뜨기`보다 약하다
 *   D. 없는 건 말하지 않는다 (재료 줄이 통째로 사라진다)
 *
 * **A는 기기를 셋 다 잰다.** 예산이 가장 빡빡한 기기가 판정을 정한다 —
 * 아이폰14가 270px, 15 Pro가 266px, 13 mini가 235px이다(008 검증). 390×844만
 * 재면 13 mini에서 `뜨기`가 탭바 아래로 내려가도 관문이 초록이다. 그게
 * WORKLIST의 "반복되는 실패 하나"다.
 *
 * **safe-area는 CDP로 진짜 값을 준다.** 클래스를 덮어 흉내내면 내가 넣은 값을
 * 내가 다시 읽는 꼴이라 공식이 틀려도 통과한다(O1이 004에서 걷어낸 구멍).
 * 에뮬레이션이 실제로 걸렸는지 먼저 확인하고, 안 걸렸으면 관문 실패가 아니라
 * 환경 문제(2)로 멈춘다 — 안 걸리면 세 기기가 같은 값을 내며 조용히 통과한다.
 *
 * **B는 텍스트를 찾는 게 아니라 심은 사실을 되찾는다.** 심은 실 이름·바늘
 * 굵기·잰 무게·자료 수를 그대로 찾는다. `실`이라는 낱말만 세면 문구만 있고
 * 값이 틀려도 통과한다.
 *
 * **손잡이(`[data-briefing]`)가 없으면 환경 문제(2)다.** 통과가 아니다 —
 * 카드가 사라졌는데 관문이 초록인 게 이 저장소가 반복한 실패다.
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-briefing.mjs
 */

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 뷰포트와 safe-area는 같은 기기에서 가져온다(003에서 어긋났던 자리). */
const DEVICES = [
  { name: "아이폰14 390×844", w: 390, h: 844, top: 47, bottom: 34 },
  { name: "15 Pro 393×852", w: 393, h: 852, top: 59, bottom: 34 },
  { name: "13 mini 375×812", w: 375, h: 812, top: 50, bottom: 34 },
];

/** 심는 값. B가 이 값들을 화면에서 그대로 되찾는다. */
const 심은 = {
  실이름: "울코튼 그레이",
  바늘mm: 4.5,
  잔량g: 128,
  자료수: 3,
  단수: 62,
  목표: 100,
  라이프라인: 40,
};

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

/** 기준 언어는 한국어다. B가 한국어 문구에 걸려 있다. */
await page.evaluate(() => {
  localStorage.setItem("knittinglog:locale", JSON.stringify("ko"));
});

const fail = [];

/**
 * DB를 비우고 프로젝트 하나를 심는다.
 *
 * `full`이면 008이 요구한 것을 다 채운 "두 달 만에 다시 연" 프로젝트,
 * 아니면 카운터 하나뿐인 갓 만든 프로젝트다(관문 D).
 */
async function seed(full, 심은) {
  await page.evaluate(
    async ({ full, s }) => {
      const { db } = await import("/knittinglog/src/lib/db.ts");
      await db.delete();
      await db.open();

      const now = new Date();
      const 오래전 = new Date(now.getTime() - 12 * 86400000);
      const base = (id) => ({ id, createdAt: 오래전, updatedAt: 오래전 });

      await db.projects.add({
        ...base("p1"),
        name: "회색 라글란 스웨터",
        craft: "knit",
        category: "sweater",
        status: "active",
        startedAt: 오래전,
        coverPhotoId: full ? "ph0" : undefined,
      });
      await db.counters.add({
        ...base("c1"),
        projectId: "p1",
        label: "몸판",
        value: s.단수,
        target: full ? s.목표 : undefined,
        sortOrder: 0,
      });
      if (!full) return;

      await db.counterMarks.add({
        ...base("m1"),
        counterId: "c1",
        atRow: s.라이프라인,
        kind: "lifeline",
      });

      // 1×1 PNG. 사진은 크기가 아니라 **있다/없다**만 보면 된다.
      const png = await (
        await fetch(
          "data:image/png;base64," +
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
      ).blob();
      await db.projectPhotos.add({
        ...base("ph0"),
        projectId: "p1",
        blob: png,
        takenAt: 오래전,
        kind: "progress",
      });
      for (let i = 0; i < s.자료수; i++) {
        await db.projectPhotos.add({
          ...base("ref" + i),
          projectId: "p1",
          blob: png,
          takenAt: 오래전,
          kind: i === 0 ? "pattern" : "reference",
        });
      }

      await db.yarns.add({
        ...base("y1"),
        name: s.실이름,
        colorHex: "#8a8f9a",
      });
      await db.yarnAllocations.add({
        ...base("a1"),
        yarnId: "y1",
        projectId: "p1",
        skeinsAllocated: 4,
      });
      // 두 번 잰다. **마지막 것만** 합계에 들어가야 한다(domain/yarn).
      await db.yarnWeighIns.add({
        ...base("w1"),
        allocationId: "a1",
        date: new Date(오래전.getTime() - 86400000),
        remainingGrams: s.잔량g + 90,
        atRow: 20,
      });
      await db.yarnWeighIns.add({
        ...base("w2"),
        allocationId: "a1",
        date: 오래전,
        remainingGrams: s.잔량g,
        atRow: s.단수,
      });

      await db.needles.add({
        ...base("n1"),
        craft: "knit",
        type: "circular",
        sizeMm: s.바늘mm,
        occupiedByProjectId: "p1",
      });
    },
    { full, s: 심은 }
  );
}

/** 기기를 갈아끼우고 상세 화면을 맨 위에서 다시 연다. */
async function 기기(dev) {
  await page.setViewportSize({ width: dev.w, height: dev.h });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", {
    insets: { top: dev.top, left: 0, bottom: dev.bottom, right: 0 },
  });
  await page.goto(BASE + "/projects/p1", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

/** 화면에서 재는 것 전부. 손잡이가 없으면 null을 돌려 환경 문제로 만든다. */
function probe() {
  return page.evaluate(() => {
    const card = document.querySelector("[data-briefing]");
    const nav = document.querySelector("nav.fixed.inset-x-0");
    if (!card || !nav) return null;

    // env()가 진짜로 걸렸는지 같이 잰다. 0이면 모든 기기가 같은 값을 낸다.
    const p = document.createElement("div");
    p.style.cssText =
      "position:fixed;bottom:0;height:env(safe-area-inset-bottom);width:1px";
    document.body.appendChild(p);
    const envB = Math.round(p.getBoundingClientRect().height);
    p.remove();

    const 뜨기 = [...card.querySelectorAll("a[href*='/knit'] button")].find(
      (b) => (b.textContent ?? "").trim() === "뜨기"
    );
    const 버튼찾기 = (label) =>
      [...document.querySelectorAll("main button")].find(
        (b) => (b.textContent ?? "").trim() === label
      );

    const 관리 = {};
    for (const label of ["수정", "삭제", "이대로 다시 뜨기"]) {
      const b = 버튼찾기(label);
      관리[label] = b
        ? {
            bottom: Math.round(b.getBoundingClientRect().bottom + scrollY),
            accent: b.className.includes("bg-accent"),
          }
        : null;
    }

    const 재료줄 = card.querySelector("[data-brief-line]");
    return {
      envB,
      navTop: Math.round(nav.getBoundingClientRect().top),
      뜨기bottom: 뜨기
        ? Math.round(뜨기.getBoundingClientRect().bottom)
        : null,
      뜨기문서bottom: 뜨기
        ? Math.round(뜨기.getBoundingClientRect().bottom + scrollY)
        : null,
      뜨기accent: 뜨기 ? 뜨기.className.includes("bg-accent") : false,
      글: (card.textContent ?? "").replace(/\s+/g, " ").trim(),
      사진: card.querySelectorAll("img").length,
      재료줄: 재료줄 ? (재료줄.textContent ?? "").trim() : null,
      관리,
      스크롤높이: Math.round(document.documentElement.scrollHeight),
    };
  });
}

/* ── 관문 A — `뜨기`까지 스크롤이 없다 ─────────────────────────────────── */

await seed(true, 심은);

console.log("관문 A — 다시 연 프로젝트에서 `뜨기`까지 스크롤이 없나");
console.log("| 기기 | env(bottom) | `뜨기` 아랫변 | 탭바 윗변 | 남는 예산 | 판정 |");
console.log("| ---- | ----------- | ------------- | --------- | --------- | ---- |");

let 첫판 = null;
for (const dev of DEVICES) {
  await 기기(dev);
  const m = await probe();
  if (!m) {
    console.error("\n환경 문제: `[data-briefing]` 또는 탭바를 찾지 못했습니다. 화면 구조가 바뀌었습니까?");
    await browser.close();
    process.exit(ENV_FAIL);
  }
  if (m.envB !== dev.bottom) {
    console.error(
      `\n환경 문제: safe-area 에뮬레이션이 안 걸렸습니다 — env(bottom)이 ${m.envB}px, 기대는 ${dev.bottom}px.`
    );
    await browser.close();
    process.exit(ENV_FAIL);
  }
  if (m.뜨기bottom === null) {
    console.error("\n환경 문제: 브리핑 안에서 `뜨기` 버튼을 찾지 못했습니다.");
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 예산 = m.navTop - m.뜨기bottom;
  const ok = 예산 >= 0;
  console.log(
    `| ${dev.name} | ${m.envB}px | ${m.뜨기bottom}px | ${m.navTop}px | ${예산}px | ${ok ? "통과" : "잘림"} |`
  );
  if (!ok)
    fail.push(
      `A(${dev.name}): \`뜨기\`가 탭바보다 ${-예산}px 아래다 — 스크롤 없이는 안 보인다`
    );
  첫판 = m;
}

/* ── 관문 B — 브리핑이 008이 요구한 사실을 담는다 ───────────────────── */

const b = 첫판;
console.log("\n관문 B — 브리핑이 담은 사실 (13 mini에서 읽음)");
console.log(`  브리핑 글: ${b.글}`);
console.log(`  재료 줄: ${b.재료줄}`);
console.log(`  브리핑 안의 사진 ${b.사진}장`);

const 있어야 = [
  ["마지막 작업일", /\d+일 전에 떴어요|오늘 떴어요/],
  ["현재 단수", new RegExp(`\\b${심은.단수}\\b`)],
  ["남은 단수", new RegExp(`${심은.목표 - 심은.단수}단 남음`)],
  ["마지막 라이프라인", new RegExp(`라이프라인 ${심은.라이프라인}단`)],
  ["실 이름", new RegExp(심은.실이름)],
  ["바늘 굵기", new RegExp(`${심은.바늘mm}mm`)],
  ["실 잔량", new RegExp(`실 ${심은.잔량g}g 남음`)],
  ["연결된 도안/자료", new RegExp(`자료 ${심은.자료수}장`)],
];
for (const [이름, re] of 있어야) {
  const ok = re.test(b.글);
  console.log(`  ${ok ? "○" : "×"} ${이름} — ${re}`);
  if (!ok) fail.push(`B: 브리핑에 "${이름}"이(가) 없다 (${re})`);
}
if (b.사진 < 1) fail.push("B: 브리핑에 대표 사진이 없다");

/* ── 관문 C — 관리 동작이 `뜨기`보다 약하다 ──────────────────────────── */

console.log("\n관문 C — 수정·삭제·복제가 `뜨기`보다 약한가 (13 mini)");
console.log(`  \`뜨기\` 아랫변(문서 기준) ${b.뜨기문서bottom}px · bg-accent ${b.뜨기accent}`);
if (!b.뜨기accent) fail.push("C: `뜨기`가 주 버튼(bg-accent)이 아니다");
for (const [label, m] of Object.entries(b.관리)) {
  if (!m) {
    console.error(`\n환경 문제: 상세 화면에서 \`${label}\` 버튼을 찾지 못했습니다.`);
    await browser.close();
    process.exit(ENV_FAIL);
  }
  const 아래 = m.bottom > b.뜨기문서bottom;
  console.log(
    `  ${label} — 아랫변 ${m.bottom}px · bg-accent ${m.accent} · \`뜨기\`보다 ${아래 ? "아래" : "위"}`
  );
  if (m.accent) fail.push(`C: \`${label}\`이(가) \`뜨기\`와 같은 주 버튼이다`);
  if (!아래) fail.push(`C: \`${label}\`이(가) \`뜨기\`보다 위에 있다`);
}

/* ── 관문 D — 없는 건 말하지 않는다 ─────────────────────────────────── */

await seed(false, 심은);
await 기기(DEVICES[2]);
const d = await probe();
if (!d) {
  console.error("\n환경 문제: 빈 프로젝트에서 `[data-briefing]`을 찾지 못했습니다.");
  await browser.close();
  process.exit(ENV_FAIL);
}
console.log("\n관문 D — 실·바늘·자료·사진이 하나도 없는 프로젝트");
console.log(`  브리핑 글: ${d.글}`);
console.log(`  재료 줄 ${d.재료줄 === null ? "없음" : `"${d.재료줄}"`} · 사진 ${d.사진}장`);
if (d.재료줄 !== null)
  fail.push(`D: 가진 게 없는데 재료 줄이 그려졌다 ("${d.재료줄}")`);
if (d.사진 !== 0) fail.push(`D: 사진이 없는데 자리가 ${d.사진}개 생겼다`);

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
