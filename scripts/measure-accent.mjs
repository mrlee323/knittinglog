/**
 * 강조색이 한 화면에 몇 개인지 센다 (discuss/017).
 *
 *   A. **꽉 채운 강조 단추가 한 화면에 최대 하나**
 *   B. 그 하나가 화면에서 **가장 큰 강조면**이다 — "지금 눌러야 할 것"
 *   C. `docs/DESIGN.md`의 문장과 이 관문이 **같은 것을 말한다**
 *
 * **왜 단추만 세나.** `--accent`로 칠해진 것을 다 세면 홈 4 · 목록 3 · 상세
 * 5였다(017). 그런데 넷은 역할이 다르다 — 상태 알약은 "이게 진행중", 진행
 * 막대는 "여기까지", 활성 탭 글자는 "지금 여기", 단추는 **"이걸 누르세요"**다.
 * 경쟁이 생기는 것은 마지막 하나가 둘일 때다. 실제로 상세에서 `뜨기`와 `완성`이
 * 둘 다 꽉 찬 강조라 **넓은 화면에서 나란히 섰다.**
 *
 * **C가 이 관문의 절반이다.** 015가 남긴 교훈이 "문서와 코드가 각자 맞다고
 * 믿으면 둘 다 틀린다"였다. 그래서 관문이 `DESIGN.md`의 문장을 **문자 그대로**
 * 찾는다 — 문장을 고치면 관문이 깨지고, 그때 둘을 같이 보게 된다.
 *
 * **두 테마를 다 센다.** 강조는 테마마다 다른 색이고, 한쪽만 재면 다른 쪽에서
 * 토큰이 어긋나도 모른다(015가 그렇게 통과했다).
 *
 * 종료코드: 0 통과 · 1 관문 실패 · 2 환경 문제(모듈·브라우저·서버·화면구조)
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/measure-accent.mjs
 */

import { readFileSync } from "node:fs";

const ENV_FAIL = 2;
const GATE_FAIL = 1;

/** 한 화면에 허용되는 꽉 찬 강조 단추 수. */
const A_최대 = 1;

/** `docs/DESIGN.md`가 이 문장을 그대로 들고 있어야 한다. */
const 문장 = "**꽉 채운 강조 단추는 한 화면에 하나다.**";

const PW = process.env.PW || "playwright";
let chromium;
try {
  ({ chromium } = await import(PW.startsWith("/") ? PW + "/index.mjs" : PW));
} catch (e) {
  console.error("환경 문제: playwright를 불러오지 못했습니다.\n  " + e.message);
  console.error("  PW=<playwright 경로> 로 지정하세요.");
  process.exit(ENV_FAIL);
}

/* ── 관문 C — 문서가 아직 같은 말을 하나 ─────────────────────────────── */

let design;
try {
  design = readFileSync(new URL("../docs/DESIGN.md", import.meta.url), "utf8");
} catch (e) {
  console.error("환경 문제: docs/DESIGN.md를 읽지 못했습니다.\n  " + e.message);
  process.exit(ENV_FAIL);
}

const fail = [];

console.log("관문 C — `docs/DESIGN.md`가 아직 같은 말을 하나");
const 있나 = design.includes(문장);
console.log(`  ${있나 ? "○" : "×"} ${문장}`);
if (!있나)
  fail.push(
    `C: docs/DESIGN.md에서 "${문장}"을 찾지 못했다 — 문장을 고쳤으면 이 관문의 \`문장\`도 같이 고친다`
  );

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

/** 상태가 골고루 섞인 데이터. 한 상태만 심으면 알약이 한 종류만 나온다. */
await page.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete();
  await db.open();
  const d = (n) => new Date(Date.now() - n * 86400000);
  const base = (id, n = 3) => ({ id, createdAt: d(n), updatedAt: d(n) });
  const names = ["회색 라글란 스웨터", "연말 선물용 두꺼운 양말", "체크 담요", "베이비 보닛", "새로 시작할 목도리"];
  // 계획중을 꼭 하나 심는다 — `뜨기`가 없는 화면에서 무엇이 주 단추가 되는지가
  // 017의 조건부(`hasKnitButton`)가 도는 유일한 경우다.
  const st = ["active", "hibernating", "active", "finished", "planning"];
  for (let i = 0; i < names.length; i++) {
    await db.projects.add({
      ...base("p" + i, i + 2), name: names[i], craft: "knit", category: "sweater",
      status: st[i], startedAt: d(40),
      pausedAt: st[i] === "hibernating" ? d(9) : undefined,
      pauseReason: st[i] === "hibernating" ? "bored" : undefined,
    });
  }
  await db.counters.add({ ...base("c1"), projectId: "p0", label: "몸판", value: 62, target: 100, sortOrder: 0 });
  await db.counterMarks.add({ ...base("m1"), counterId: "c1", atRow: 40, kind: "lifeline" });
  await db.yarns.add({ ...base("y1"), skeinCount: 3, name: "울코튼 그레이", colorHex: "#8a8f9a" });
  await db.yarnAllocations.add({ ...base("a1"), yarnId: "y1", projectId: "p0", skeinsAllocated: 4 });
  await db.needles.add({ ...base("n1"), craft: "knit", type: "circular", sizeMm: 4.5, occupiedByProjectId: "p0" });
  await db.gauges.add({ ...base("g1"), projectId: "p0", stitchesPer10cm: 22, rowsPer10cm: 30, needleMm: 4.5 });
});

const 화면 = [
  ["홈", "/"],
  ["목록", "/projects"],
  ["상세", "/projects/p0"],
  ["완성 상세", "/projects/p3"],
  ["계획중 상세", "/projects/p4"],
  ["뜨기", "/projects/p0/knit"],
];

/** 첫 화면에 보이는 강조면을 센다. 스크롤해야 보이는 것은 경쟁하지 않는다. */
function 세기() {
  return page.evaluate(() => {
    // `--accent`를 상수로 읽지 않는다. 실제로 계산된 색을 기준으로 비교해야
    // 토큰을 바꿨을 때 관문이 따라온다(015가 상수끼리 비교해 통과했다).
    const probe = document.createElement("div");
    probe.style.color = "var(--accent)";
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    const norm = (c) => {
      const m = c.match(/[\d.]+/g);
      return m ? m.slice(0, 3).map(Number).join(",") : null;
    };
    const A = norm(accent);
    if (!A) return null;

    const 단추 = [];
    const 면 = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      // 첫 화면 밖은 세지 않는다.
      if (r.top >= innerHeight || r.bottom <= 0) continue;
      if (norm(getComputedStyle(el).backgroundColor) !== A) continue;

      const 넓이 = Math.round(r.width * r.height);
      const 이름 = (el.textContent ?? "").trim().slice(0, 16) || el.tagName;
      면.push({ 이름, 넓이 });
      // 누르는 것만 센다. 알약(span)·막대(div)는 "여기다"를 말한다.
      if (el.tagName === "BUTTON" || el.getAttribute("role") === "button")
        단추.push({ 이름, 넓이 });
    }
    면.sort((a, b) => b.넓이 - a.넓이);
    return { accent, 단추, 면 };
  });
}

/* ── 관문 A · B — 화면마다, 두 테마로 ────────────────────────────────── */

/*
  **강조면이 하나도 없으면 통과가 아니다.**

  처음 짠 관문은 `--color-accent`가 다른 이름을 가리키게 깨뜨렸더니 모든 화면이
  0개가 되면서 **"모든 관문 통과"를 찍었다.** 세는 관문의 고유한 함정이다 —
  셀 것이 사라지면 세기는 늘 성공한다.

  홈에는 `뜨기` 단추가 **언제나 있다**(006이 그렇게 정했고 007의 관문 B1이
  지킨다). 그러니 홈에 강조면이 하나도 없으면 화면이 아니라 토큰이 깨진
  것이다 — 관문 실패(1)가 아니라 환경 문제(2)다.
*/
let 강조본적있나 = false;

console.log("\n관문 A · B — 꽉 채운 강조 단추");
for (const theme of ["light", "dark"]) {
  for (const [이름, path] of 화면) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
    }, theme);
    await page.waitForTimeout(600);
    const 걸렸나 = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    if (걸렸나 !== (theme === "dark")) {
      console.error(`\n환경 문제: 테마를 ${theme}로 걸지 못했습니다.`);
      await browser.close();
      process.exit(ENV_FAIL);
    }

    const m = await 세기();
    if (!m) {
      console.error(`\n환경 문제: ${이름}에서 \`--accent\`를 읽지 못했습니다.`);
      await browser.close();
      process.exit(ENV_FAIL);
    }

    if (m.면.length > 0) 강조본적있나 = true;
    if (이름 === "홈" && m.면.length === 0) {
      console.error(`\n환경 문제: 홈(${theme})에 강조면이 하나도 없습니다 — \`--accent\`가 화면에 안 걸렸습니까? (계산된 색 ${m.accent})`);
      await browser.close();
      process.exit(ENV_FAIL);
    }

    const okA = m.단추.length <= A_최대;
    // 단추가 있으면 그게 가장 큰 강조면이어야 한다 — "지금 눌러야 할 것"이
    // 알약이나 막대보다 작으면 무엇을 누르라는 건지 화면이 말하지 못한다.
    const okB =
      m.단추.length === 0 || m.면[0].넓이 === m.단추[0].넓이;
    console.log(
      `  ${okA && okB ? "○" : "×"} [${theme}] ${이름} — 단추 ${m.단추.length}개 ${JSON.stringify(m.단추.map((x) => `${x.이름}(${x.넓이})`))} · 모든 강조면 ${m.면.length}개`
    );
    if (!okA)
      fail.push(
        `A(${theme}): ${이름}에 꽉 찬 강조 단추가 ${m.단추.length}개다 (최대 ${A_최대}) — ${m.단추.map((x) => x.이름).join(", ")}`
      );
    if (!okB)
      fail.push(
        `B(${theme}): ${이름}에서 가장 큰 강조면이 \`${m.면[0].이름}\`(${m.면[0].넓이})인데 단추는 \`${m.단추[0].이름}\`(${m.단추[0].넓이})이다`
      );
  }
}
await page.evaluate(() => document.documentElement.classList.remove("dark"));

if (!강조본적있나) {
  console.error("\n환경 문제: 어느 화면에서도 강조면을 찾지 못했습니다 — 토큰이 깨졌습니까?");
  await browser.close();
  process.exit(ENV_FAIL);
}

await browser.close();
if (fail.length) {
  console.log("\n관문 실패:");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(GATE_FAIL);
}
console.log("\n모든 관문 통과");
