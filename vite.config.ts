import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      workbox: {
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
        name: "knittinglog",
        short_name: "knittinglog",
        description: "언제 멈췄든 그 자리에서 이어 뜰 수 있게 하는 뜨개 기록장",
        lang: "ko",
        theme_color: "#8a6f5c",
        background_color: "#faf7f4",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
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
