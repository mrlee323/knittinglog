/**
 * 주요 화면을 폰·PC 두 폭으로 캡처한다 — docs/REDESIGN.md §6.
 *
 * 화면 개편은 "좋아졌다"로 판정할 수 없다. 단계마다 같은 화면을 같은 조건으로
 * 찍어 나란히 두고, 무엇이 어떻게 달라졌는지 보이게 한다.
 *
 * playwright는 이 앱의 의존성이 아니다(런타임에 쓰지 않는 것을 번들 옆에
 * 두지 않는다). 쓸 때만 임시로 받는다.
 *
 *   npm run dev
 *   npx --yes playwright@latest install chromium   # 처음 한 번
 *   npx --yes -p playwright@latest node scripts/shot.mjs
 *
 * 결과는 .shots/ 아래에 떨어진다(git에 올리지 않는다 — 스크린샷은 이력이
 * 아니라 그때의 확인이고, 바이너리는 diff가 되지 않는다).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.SHOT_BASE ?? "http://localhost:5173/knittinglog";
const OUT = process.env.SHOT_OUT ?? ".shots";

/** 찍을 화면. 데이터가 없으면 빈 상태가 찍히고, 그것도 봐야 하는 화면이다. */
const SCREENS = [
  ["home", "/"],
  ["projects", "/projects"],
  ["project-new", "/projects/new"],
  ["gauge", "/gauge"],
  ["gauge-new", "/gauge/new"],
  ["yarn", "/yarn"],
  ["charts", "/charts"],
  ["settings", "/settings"],
];

const WIDTHS = [
  ["phone", 390, 844],
  ["desktop", 1280, 900],
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

for (const [device, width, height] of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  for (const [name, path] of SCREENS) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    // 캔버스(차트·도식)는 첫 페인트 뒤에 그려진다. 기다리지 않으면 빈 칸이 찍힌다.
    await page.waitForTimeout(700);
    const file = `${OUT}/${device}-${name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }

  await ctx.close();
}

await browser.close();
