import { addInspiration } from "@/features/inspiration/repository";
import { importPatternFile } from "@/features/stitchChart/file";
import { parseShared } from "@/domain/shared";
import type { Id } from "@/types/entities";

/**
 * 공유로 들어온 것을 꺼내 제자리에 넣는다.
 *
 * 받는 것이 두 종류다 — 사진·링크는 **스크랩**으로, 도안 파일은 **기호 도안**으로
 * 간다. 그래서 이 함수는 어느 한 기능에 속하지 않는다. 스크랩 리포지토리 안에
 * 두면 도안 기능이 스크랩을 거쳐 들어오는 모양이 된다.
 *
 * 갈림은 **content-type**으로 한다. 서비스워커가 파일을 캐시에 넣을 때 타입을
 * 함께 넣어두므로(public/share-target.js) 여기서 다시 판단할 수 있다.
 */

const INBOX = "knittinglog-share-inbox";
const META_KEY = "share-inbox-meta";

export interface SharedResult {
  /** 스크랩에 들어간 것 */
  scraps: Id[];
  /** 기호 도안으로 들어간 것 */
  patterns: { id: Id; name: string }[];
  /** 도안 파일인데 읽지 못한 것 */
  failedPatterns: number;
}

const isPatternFileType = (file: File) =>
  file.type === "application/json" || /\.json$/i.test(file.name);

export async function drainSharedInbox(): Promise<SharedResult> {
  const empty: SharedResult = { scraps: [], patterns: [], failedPatterns: 0 };
  if (!("caches" in globalThis)) return empty;

  const cache = await caches.open(INBOX);
  // 서비스워커는 스코프 기준으로 키를 만든다. location.href 기준으로 만들면
  // 깊은 주소에서 열었을 때 다른 키를 보게 된다.
  const metaUrl = `${location.origin}${import.meta.env.BASE_URL}${META_KEY}`;
  const metaResponse = await cache.match(metaUrl);
  if (!metaResponse) return empty;

  const meta = (await metaResponse.json()) as {
    title?: string;
    text?: string;
    url?: string;
    files?: string[];
  };

  const files: File[] = [];
  for (const key of meta.files ?? []) {
    const response = await cache.match(key);
    if (!response) continue;
    const blob = await response.blob();
    // 캐시에는 이름이 남지 않으므로 타입과 키에서 되짚는다
    const name = key.split("/").pop() ?? "shared";
    files.push(new File([blob], name, { type: blob.type }));
  }

  const patternFiles = files.filter(isPatternFileType);
  const images = files.filter((f) => !isPatternFileType(f));

  const result: SharedResult = { scraps: [], patterns: [], failedPatterns: 0 };

  for (const file of patternFiles) {
    // 한 파일이 실패해도 나머지와 사진은 살린다
    const imported = await importPatternFile(file).catch(() => null);
    if (imported?.ok && imported.added) result.patterns.push(...imported.added);
    else result.failedPatterns += 1;
  }

  const draft = parseShared(meta);
  if (images.length === 0) {
    // 도안 파일만 왔으면 글은 도안 쪽 맥락이므로 스크랩을 만들지 않는다
    if (patternFiles.length === 0) {
      const id = await addInspiration(draft);
      if (id) result.scraps.push(id);
    }
  } else {
    // 이미지가 여러 장이면 카드도 여러 장이다. 제목·메모는 첫 장에만 붙인다 —
    // 같은 설명이 열 장에 반복되면 목록에서 구별이 안 된다.
    for (const [index, image] of images.entries()) {
      const id = await addInspiration(index === 0 ? draft : {}, image);
      if (id) result.scraps.push(id);
    }
  }

  // **저장한 뒤에 비운다.** 먼저 비우면 저장이 실패했을 때 공유가 조용히 사라지고
  // 되돌릴 길이 없다. 도중에 던지면 캐시가 남아 다시 열 때 재시도된다.
  await caches.delete(INBOX);
  return result;
}
