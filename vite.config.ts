import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * GitHub Pages는 프로젝트 사이트를 /<repo>/ 아래에 얹는다.
 *
 * 개발에서도 같은 서브패스를 쓴다. 루트(/)로 개발하고 서브패스로 배포하면
 * 서비스워커 스코프·매니페스트 경로·라우터 basepath가 로컬에서는 멀쩡하고
 * 배포에서만 깨진다 — PWA에서 가장 잡기 어려운 종류의 버그다.
 */
const BASE = "/knittinglog/";

export default defineConfig({
  base: BASE,
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      workbox: {
        // 서브패스 배포에서 딥링크(예: /knittinglog/projects)로 처음 들어오면
        // Pages가 404를 준다. 그래서 빌드 때 404.html을 index.html 사본으로
        // 만들고(아래 스크립트), 설치 후에는 이 navigateFallback이 받는다.
        navigateFallback: `${BASE}index.html`,
        // Pretendard 동적 서브셋은 32KB짜리 92조각이라 전부 프리캐시하면
        // 첫 로딩이 3MB가 된다. 대신 한 번 받은 조각은 캐시에 남겨서
        // 오프라인에서도 같은 글자가 같은 서체로 나오게 한다.
        // 못 받은 조각은 시스템 한글 서체로 떨어질 뿐 앱은 그대로 동작한다.
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: "CacheFirst",
            options: {
              cacheName: "knittinglog-fonts",
              expiration: { maxEntries: 96, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        id: BASE,
        name: "knittinglog",
        short_name: "knittinglog",
        description: "언제 멈췄든 그 자리에서 이어 뜰 수 있게 하는 뜨개 기록장",
        lang: "ko",
        // 디자인 시스템의 canvas 색. 안드로이드 스플래시와 상태바가 이 값을 쓴다.
        theme_color: "#fbfaf9",
        background_color: "#fbfaf9",
        display: "standalone",
        orientation: "portrait",
        scope: BASE,
        start_url: BASE,
        // 자기 자신을 선언해두면 브라우저 탭에서 navigator.getInstalledRelatedApps()
        // 로 "이미 설치됐는지"를 알 수 있다. 이게 없으면 설치된 앱을 브라우저로
        // 열었을 때 "이미 설치됨"과 "설치 불가"를 구분할 방법이 없다.
        related_applications: [
          { platform: "webapp", url: `${BASE}manifest.webmanifest` },
        ],
        icons: [
          { src: `${BASE}icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${BASE}icon-512.png`, sizes: "512x512", type: "image/png" },
          // maskable은 별도 파일이어야 한다. 안전영역(안쪽 80%) 밖은 잘리므로
          // 같은 이미지를 any/maskable로 겸용하면 런처에서 모티프가 잘린다.
          //
          // SVG는 여기 넣지 않는다. sizes:"any"가 붙은 SVG를 Chrome이 최적
          // 아이콘으로 골라버리고, 안드로이드 WebAPK 생성 서버는 아이콘을
          // 서버에서 래스터화해야 해서 거기서 실패한다 — "설치 중"에서
          // 끝나지 않는 증상이 이걸로 난다. SVG는 favicon 자리에만 둔다.
          {
            src: `${BASE}icon-maskable-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: `${BASE}icon-maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  // Vite는 PORT 환경변수를 스스로 읽지 않는다. 여기서 받아줘야 여러 세션이
  // 각자 다른 포트로 dev 서버를 띄울 수 있다.
  server: { port: Number(process.env.PORT) || 5173 },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
