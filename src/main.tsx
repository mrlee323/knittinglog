import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Providers } from "@/components/providers";
import { NotFound } from "@/components/not-found";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// vite의 base와 같은 값이어야 한다. import.meta.env.BASE_URL이 그 값이므로
// 여기서 문자열을 다시 적지 않고 받아쓴다 — 두 곳에 적으면 어긋난다.
const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL,
  // 화면을 없애면 그 주소는 남는다. 라우터 기본 화면은 꾸미지 않은 한 줄이라
  // 설치된 앱에서는 앱이 깨진 것처럼 보인다.
  defaultNotFoundComponent: NotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>
);
