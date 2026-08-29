import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // routeTree.gen.ts는 TanStack Router가 생성한다. 커밋은 하되 린트·포맷 대상은 아니다.
  // .claude/·.agents/는 에이전트 도구다. 안에 vendored 번들(playwright-core 16만 줄)이
  // 들어 있고, 그 번들의 eslint-disable 주석이 우리 설정에 없는 룰을 가리켜 에러가 난다.
  // 우리가 고칠 코드가 아니므로 대상에서 뺀다.
  globalIgnores([
    "dist",
    "dev-dist",
    "src/routeTree.gen.ts",
    ".claude",
    ".agents",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
]);
