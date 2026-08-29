# knittinglog — 에이전트 안내

여러 코딩 에이전트(Claude Code · Codex)가 이 저장소에서 함께 일한다. 이 파일이
공통 진입점이다. **작업을 시작하기 전에 여기부터 읽는다.**

## 이 앱이 무엇인가

하다 만 뜨개 프로젝트가 쌓여가는 사람들을 위한 기록 중심 뜨개 워크스페이스.
한 줄 정의는 **"언제 멈췄든 그 자리에서 정확히 이어 뜰 수 있게 하는 뜨개
기록장"**이다. 중단은 실패가 아니라 뜨개의 정상 상태이고, 이 앱은 중단을
관리하는 쪽에 선다.

로컬 우선(IndexedDB)·오프라인 우선 PWA. 계정 없음. 한국어·영어.

## 문서

| 문서                                         | 무엇                                   |
| -------------------------------------------- | -------------------------------------- |
| [docs/PLAN.md](docs/PLAN.md)                 | 기획 — 기능 맵, 도안 IR, 결정 사항     |
| [docs/BRIEF.md](docs/BRIEF.md)               | 제품·UI/UX 브리프 — 지금의 방향 지시서 |
| [docs/DESIGN.md](docs/DESIGN.md)             | 디자인 시스템 — 토큰·조판·레이아웃     |
| [docs/REDESIGN.md](docs/REDESIGN.md)         | 화면 개편 계획 — 측정된 문제와 단계    |
| [docs/CHART-EDITOR.md](docs/CHART-EDITOR.md) | 배색 차트 에디터 사양                  |
| [docs/discuss/](docs/discuss/README.md)      | **에이전트끼리 결정을 논의하는 자리**  |

UI 코드를 짜거나 고칠 때는
[.claude/skills/design-system/SKILL.md](.claude/skills/design-system/SKILL.md)의
상태·모션·로딩 규약을 따른다. 코드리뷰 체크리스트가 그 문서 끝에 있다.

## 스택과 규칙

Vite 7 · React 19 · TypeScript · Tailwind 4 · TanStack Router(파일 기반) ·
TanStack Query · Jotai · XState · Zod · Dexie · Vitest.

- **`src/domain/`은 순수하다.** UI를 모르고, 전부 단위 테스트가 붙는다.
  뜨개 계산은 정확도가 곧 신뢰도라 화면이 계산하지 않는다.
- 차트 저장 규약: `y = 0`이 **첫 단(맨 아래)**. 코 번호는 오른쪽부터, 단
  번호는 아래부터.
- 커밋 전 `npm run test` · `npm run type-check` · `npm run lint`.
- 커밋 메시지는 한국어. **무엇을 왜 그렇게 정했는지**를 적는다.
- 머지는 `--no-ff`. PR은 사람이 요청할 때만 만든다.

## 다른 에이전트와 일하는 법

의견이 갈리거나, 되돌리기 어려운 결정을 앞뒀거나, 상대가 정한 것을 뒤집으려
할 때는 **혼자 정하지 말고 [docs/discuss/](docs/discuss/README.md)에 스레드를
연다.** 규약은 그 폴더의 `README.md`에 있고, 요점은 넷이다.

1. `turn`이 자기 이름일 때만 쓴다
2. 남의 글은 고치지 않는다 — 덧붙이기만
3. 근거에는 파일·줄 번호나 잰 숫자를 붙인다
4. 3왕복 안에 끝내고, 안 되면 사람에게 넘긴다

**동의만 하려면 스레드를 열 이유가 없다.** 사람이 두 에이전트를 함께 쓰는
이유는 서로 다른 판단을 보려는 것이다.
