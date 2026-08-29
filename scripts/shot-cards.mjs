/**
 * 프로젝트 목록의 이미지형 카드를 잰다 (discuss/005).
 *
 * 사진 있음/없음/실만 있음 세 경우를 한 목록에 섞어 넣고, 카드 높이·윗면 비율·
 * 첫 화면에 들어오는 카드 수를 잰다. 화면도 `.shots/`에 남긴다(git에는 올리지
 * 않는다 — 스크린샷은 이력이 아니라 그때의 확인이고 diff가 되지 않는다).
 *
 * safe-area는 CDP로 **진짜** 값을 준다. 클래스를 덮어 흉내내면 `env()`를 직접
 * 쓰는 규칙이 0으로 남아 고친 것이 안 고쳐진 것처럼 읽힌다 — 004에서 실제로
 * 그랬다.
 *
 *   npm run dev
 *   PW=$(find ~/.npm/_npx -maxdepth 4 -type d -name playwright | head -1) \
 *     node scripts/shot-cards.mjs
 */
const { chromium } = await import(process.env.PW + "/index.mjs");
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("[page error]", e.message));
await p.goto("http://localhost:5173/knittinglog/", { waitUntil: "networkidle" });

// 검증이 알려준 방법 — 클래스를 덮지 않고 진짜 env()를 준다.
const cdp = await ctx.newCDPSession(p);
await cdp.send("Emulation.setSafeAreaInsetsOverride", {
  insets: { top: 47, left: 0, bottom: 34, right: 0 },
});

await p.evaluate(async () => {
  const { db } = await import("/knittinglog/src/lib/db.ts");
  await db.delete(); await db.open();
  const now = new Date();
  const mk = async (id, name, cat, status, opts = {}) => {
    const paused = status === "hibernating" ? new Date(now.getTime() - 41 * 864e5) : undefined;
    await db.projects.add({ id, name, craft: "knit", category: cat, status,
      startedAt: now, pausedAt: paused, pauseReason: paused ? "out-of-yarn" : undefined,
      coverPhotoId: opts.photo ? id + "-p" : undefined,
      createdAt: now, updatedAt: now });
    if (opts.photo) {
      const c = document.createElement("canvas"); c.width = 400; c.height = 300;
      const g = c.getContext("2d");
      const grd = g.createLinearGradient(0, 0, 400, 300);
      grd.addColorStop(0, opts.photo); grd.addColorStop(1, "#8a7f6d");
      g.fillStyle = grd; g.fillRect(0, 0, 400, 300);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      await db.projectPhotos.add({ id: id + "-p", projectId: id, blob, takenAt: now, createdAt: now, updatedAt: now });
    }
    if (opts.yarn) {
      await db.yarns.add({ id: id + "-y", name: "실", colorHex: opts.yarn, createdAt: now, updatedAt: now });
      await db.yarnAllocations.add({ id: id + "-a", yarnId: id + "-y", projectId: id, skeinsAllocated: 3, createdAt: now, updatedAt: now });
    }
  };
  await mk("p1", "회색 래글런 스웨터", "sweater", "active", { photo: "#6b7f6e", yarn: "#6b7f6e" });
  await mk("p2", "겨울 양말", "socks", "hibernating", { yarn: "#b5643c" });
  await mk("p3", "이름만 있는 목도리", "scarf", "planning", {});
  await mk("p4", "체크 블랭킷", "blanket", "active", { photo: "#7a6a58", yarn: "#c9b79c" });
});
await p.goto("http://localhost:5173/knittinglog/projects", { waitUntil: "networkidle" });
await p.waitForTimeout(900);

const m = await p.evaluate(() => {
  const nav = document.querySelector("nav.fixed.inset-x-0").getBoundingClientRect();
  const items = [...document.querySelectorAll("main ul li")];
  const cards = items.map((li) => {
    const a = li.querySelector("a");
    const img = li.querySelector("img");
    const fb = li.querySelector("[aria-hidden].bg-sunken");
    const cov = (img || fb)?.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    return {
      이름: li.querySelector("h2")?.textContent,
      카드높이: Math.round(r.height),
      윗면: img ? "사진" : fb ? "대체" : "없음",
      윗면비율: cov ? (cov.width / cov.height).toFixed(2) : null,
      상단: Math.round(r.top), 하단: Math.round(r.bottom),
    };
  });
  const visible = cards.filter((c) => c.상단 < nav.top).length;
  const fully = cards.filter((c) => c.하단 <= nav.top).length;
  return { 탭바상단: Math.round(nav.top), cards, 첫화면에걸친카드: visible, 첫화면에온전한카드: fully };
});
console.log(JSON.stringify(m, null, 2));
await p.screenshot({ path: ".shots/cards-phone.png", fullPage: false });
await p.screenshot({ path: ".shots/cards-phone-full.png", fullPage: true });
await b.close();
