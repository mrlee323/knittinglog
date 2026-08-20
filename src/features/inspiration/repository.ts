import { db, stamp, touch } from "@/lib/db";
import { shrinkImage } from "@/lib/image";
import { isEmptyDraft, parseShared, type InspirationDraft } from "@/domain/shared";
import type { Id, Inspiration } from "@/types/entities";

/* --- 조회 ----------------------------------------------------------------- */

/** 최근에 모은 것이 위에. 스크랩은 쌓인 순서보다 방금 본 것이 중요하다. */
export const listInspirations = () =>
  db.inspirations.orderBy("updatedAt").reverse().toArray();

export const getInspiration = (id: Id) => db.inspirations.get(id);

export const listInspirationsForProject = (projectId: Id) =>
  db.inspirations.where("projectId").equals(projectId).toArray();

/**
 * 아직 어느 작품에도 붙이지 않은 것.
 *
 * Dexie는 undefined를 인덱스에 넣지 않으므로 `where("projectId")`로는 찾을 수
 * 없다. 보관함의 기본 상태가 이것이라 전체에서 걸러낸다.
 */
export const listUnassigned = async () =>
  (await listInspirations()).filter((item) => !item.projectId);

/* --- 변경 ----------------------------------------------------------------- */

/**
 * 줄이기에 실패한 원본을 그대로 둘 수 있는 한도.
 *
 * 이 위로는 이미지를 버리고 글만 남긴다 — 못 줄인 원본 하나가 보관함의 저장
 * 공간을 다 쓰는 것보다는 카드에 그림이 없는 편이 낫다.
 */
const RAW_FALLBACK_LIMIT = 4 * 1024 * 1024;

/**
 * 저장할 이미지를 만든다.
 *
 * 진행 사진과 같은 경로로 줄인다 — 원본 그대로 두면 보관함 몇 장에 저장
 * 공간이 다 간다. 다만 **줄이기가 실패해도 던지지 않는다.** 브라우저가
 * 캔버스로 읽지 못하는 형식(HEIC 등)이나 깨진 파일이 공유로 들어올 수 있고,
 * 여기서 던지면 함께 온 주소·메모까지 통째로 사라진다.
 */
async function toStoredImage(image?: Blob): Promise<Blob | undefined> {
  if (!image) return undefined;
  try {
    return (await shrinkImage(image)).blob;
  } catch {
    return image.size <= RAW_FALLBACK_LIMIT ? image : undefined;
  }
}

export async function addInspiration(
  draft: InspirationDraft & { projectId?: Id },
  image?: Blob
): Promise<Id | null> {
  const blob = await toStoredImage(image);
  // 이미지도 글도 없으면 저장할 것이 없다. 빈 카드가 보관함에 쌓이면
  // 훑어볼 수 있는 목록이 아니게 된다.
  if (!blob && isEmptyDraft(draft)) return null;

  const record = stamp({
    blob,
    sourceUrl: draft.url,
    title: draft.title,
    note: draft.note,
    projectId: draft.projectId,
  });
  await db.inspirations.add(record as Inspiration);
  return record.id;
}

/** 어느 작품에 쓸지 정한다. 비우면 보관함으로 돌아간다. */
export const assignInspiration = (id: Id, projectId?: Id) =>
  db.inspirations.update(id, touch({ projectId }));

export const editInspiration = (
  id: Id,
  values: { title?: string; note?: string }
) => db.inspirations.update(id, touch(values));

export const deleteInspiration = (id: Id) => db.inspirations.delete(id);

/* --- 공유로 들어온 것 받기 ------------------------------------------------- */

/**
 * 서비스워커가 캐시에 넣어둔 공유 내용을 꺼내 보관함에 넣는다.
 *
 * 캐시를 **비우고 나서** 저장한다. 저장이 실패해도 캐시가 남아 있으면 다음에
 * 화면을 열 때마다 같은 것이 다시 들어온다 — 같은 핀이 열 장 쌓이는 쪽이
 * 한 장 잃는 것보다 나쁘다.
 */
const INBOX = "knittinglog-share-inbox";
const META_KEY = "share-inbox-meta";

export async function drainSharedInbox(): Promise<Id[]> {
  if (!("caches" in globalThis)) return [];
  const cache = await caches.open(INBOX);
  // 서비스워커는 스코프 기준으로 키를 만든다(public/share-target.js). 여기서
  // location.href 기준으로 만들면 /projects/…/refs 같은 깊은 주소에서 열었을 때
  // 다른 키를 보게 된다.
  const metaUrl = `${location.origin}${import.meta.env.BASE_URL}${META_KEY}`;
  const metaResponse = await cache.match(metaUrl);
  if (!metaResponse) return [];

  const meta = (await metaResponse.json()) as {
    title?: string;
    text?: string;
    url?: string;
    files?: string[];
  };

  const images: Blob[] = [];
  for (const key of meta.files ?? []) {
    const response = await cache.match(key);
    if (response) images.push(await response.blob());
  }

  const draft = parseShared(meta);
  const ids: Id[] = [];

  if (images.length === 0) {
    const id = await addInspiration(draft);
    if (id) ids.push(id);
  } else {
    // 이미지가 여러 장이면 카드도 여러 장이다. 제목·메모는 첫 장에만 붙인다 —
    // 같은 설명이 열 장에 반복되면 목록에서 구별이 안 된다.
    for (const [index, image] of images.entries()) {
      const id = await addInspiration(index === 0 ? draft : {}, image);
      if (id) ids.push(id);
    }
  }

  // **저장한 뒤에 비운다.** 먼저 비우면 저장이 실패했을 때 공유가 조용히
  // 사라지고 되돌릴 길이 없다. 여기까지 왔다는 것은 저장이 끝났다는 뜻이므로
  // 지워도 잃을 것이 없다. 도중에 던지면 캐시가 남아 다시 열 때 재시도된다.
  //
  // 목록에 없는 항목까지 함께 지우려고 캐시를 통째로 버린다 — 남는 것은
  // 어차피 꺼낼 길이 없는 고아다.
  await caches.delete(INBOX);
  return ids;
}
