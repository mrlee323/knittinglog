/**
 * 공유로 들어온 것을 스크랩 카드로 정리한다 — 기획 §13.2.
 *
 * 핀터레스트·Threads의 저장 항목을 API로 읽는 길은 막혀 있으므로, 앱을
 * **공유 대상**으로 등록해서 사용자가 보내주는 것을 받는다. 서버도 심사도
 * 필요 없다.
 *
 * 문제는 **앱마다 무엇을 어디에 담아 보내는지가 다르다는 것이다.**
 *
 * - 어떤 앱은 `url`에 주소를 담는다.
 * - 어떤 앱은 `url`을 비우고 `text`에 "제목 https://…" 형태로 함께 담는다.
 * - 어떤 앱은 `title`에 주소를, `text`에 설명을 담는다.
 *
 * 그래서 세 칸을 모두 훑어 주소를 찾아내고, 주소가 아닌 나머지를 제목·메모로
 * 돌린다. 이걸 하지 않으면 카드에 "제목 https://pin.it/abc123"이 통째로 들어가고
 * 눌러도 열리지 않는다.
 */

export interface SharedPayload {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

export interface InspirationDraft {
  url?: string;
  title?: string;
  note?: string;
}

/** 문자열에서 첫 http(s) 주소를 꺼낸다. 없으면 undefined. */
export function extractUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  // 뒤에 붙는 문장부호는 주소에서 뺀다 — "…한번 봐 https://a.com." 같은 공유가 있다
  const match = value.match(/https?:\/\/[^\s<>"']+/);
  if (!match) return undefined;
  return match[0].replace(/[.,)\]}>!?]+$/, "");
}

/** 주소를 뺀 나머지 글자. 제목·메모로 쓴다. */
const withoutUrl = (value: string | null | undefined, url?: string) => {
  if (!value) return "";
  const rest = url ? value.replace(url, " ") : value;
  return rest.replace(/\s+/g, " ").trim();
};

/**
 * 공유 payload를 카드 초안으로 정리한다.
 *
 * 주소는 `url` → `text` → `title` 순으로 찾는다. 앱이 제대로 채워 보냈으면
 * 첫 칸에서 끝나고, 아니면 글자 속에서 찾아낸다.
 *
 * 제목이 주소와 같으면 제목을 비운다 — 카드에 같은 주소가 두 번 보이면
 * 무엇을 저장한 것인지 오히려 알기 어렵다.
 */
export function parseShared(payload: SharedPayload): InspirationDraft {
  const url =
    extractUrl(payload.url) ??
    extractUrl(payload.text) ??
    extractUrl(payload.title);

  const title = withoutUrl(payload.title, url);
  const note = withoutUrl(payload.text, url);

  const draft: InspirationDraft = {};
  if (url) draft.url = url;
  if (title) draft.title = title;
  // 제목과 메모가 같으면 하나만 남긴다. 같은 문장을 두 번 보여줄 이유가 없다.
  if (note && note !== title) draft.note = note;
  return draft;
}

/**
 * 어디서 온 것인지. 카드에 "pinterest.com"처럼 짧게 보여준다.
 *
 * 출처가 보이면 보관함이 훑을 수 있는 목록이 된다 — 핀터레스트에서 모은 것과
 * 유튜브에서 모은 것은 쓰임이 다르다.
 */
export function sourceHost(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // 주소로 파싱되지 않으면 출처를 말하지 않는다. 틀린 출처보다 없는 게 낫다.
    return undefined;
  }
}

/** 카드에 무엇도 남지 않으면 저장할 것이 없다 */
export const isEmptyDraft = (draft: InspirationDraft) =>
  !draft.url && !draft.title && !draft.note;
