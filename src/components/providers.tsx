import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider as JotaiProvider } from "jotai";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* 기본 위치(좌하단)가 하단 탭바의 마지막 탭을 가린다 */}
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      </QueryClientProvider>
    </JotaiProvider>
  );
}
