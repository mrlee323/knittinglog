import { db, stamp, touch } from "@/lib/db";
import { shrinkImage } from "@/lib/image";
import { listCounters } from "@/features/counter/repository";
import type { Id, ProjectPhoto } from "@/types/entities";

/* --- 조회 ----------------------------------------------------------------- */

/**
 * 진행 기록의 사진. 최근 것이 먼저 — 복귀할 때 보고 싶은 건 마지막 모습이다.
 *
 * kind가 없는 사진은 진행 사진으로 본다. 이 필드가 생기기 전에 저장된 것들이고,
 * 그때는 진행 사진밖에 없었다.
 */
export async function listPhotos(projectId: Id) {
  const photos = await db.projectPhotos
    .where("projectId")
    .equals(projectId)
    .reverse()
    .sortBy("takenAt");
  return photos.filter((p) => p.kind !== "reference");
}

/** 참고 사진(무드보드). 먼저 모은 것이 위에 오도록 오래된 순이다. */
export async function listReferencePhotos(projectId: Id) {
  const photos = await db.projectPhotos
    .where("projectId")
    .equals(projectId)
    .sortBy("takenAt");
  return photos.filter((p) => p.kind === "reference");
}

/**
 * 목록 화면용 대표 사진 묶음.
 *
 * 프로젝트마다 사진을 따로 조회하면 N+1이 된다. 실 색을 한 번에 받아오는
 * projectColors()와 같은 방식으로, 대표로 지정된 것만 한 번에 읽는다.
 */
export async function coverPhotos(): Promise<Map<Id, Blob>> {
  const projects = await db.projects.toArray();
  const covers = projects.filter((p) => p.coverPhotoId);
  const photos = await db.projectPhotos.bulkGet(
    covers.map((p) => p.coverPhotoId as Id)
  );

  const map = new Map<Id, Blob>();
  covers.forEach((project, i) => {
    const blob = photos[i]?.blob;
    if (blob) map.set(project.id, blob);
  });
  return map;
}

/* --- 단수 스탬프 ---------------------------------------------------------- */

/**
 * 찍는 시점의 단수를 함께 남긴다.
 *
 * 어느 카운터를 쓸지는 묻지 않는다 — 사진 한 장에 질문이 붙으면 안 찍는다.
 * 연동 카운터는 파생값이라 제외하고, 첫 카운터(대개 몸판)를 쓴다.
 */
async function rowStamp(projectId: Id) {
  const counters = await listCounters(projectId);
  const main = counters.find((c) => !c.linkedCounterId) ?? counters[0];
  if (!main || main.value <= 0) return {};
  return { atRow: main.value, atCounterLabel: main.label };
}

/* --- 변경 ----------------------------------------------------------------- */

export async function addPhoto(
  projectId: Id,
  file: Blob,
  kind: NonNullable<ProjectPhoto["kind"]> = "progress"
): Promise<Id> {
  const { blob } = await shrinkImage(file);
  // 참고 사진에는 단수를 박지 않는다. 뜨기 전에 모으는 것이라 단수가 없고,
  // 있어도 "그 사진이 찍힌 단"이라는 의미가 성립하지 않는다.
  const progress = kind === "progress" ? await rowStamp(projectId) : {};
  const photo = stamp({
    projectId,
    blob,
    kind,
    takenAt: new Date(),
    ...progress,
  });
  await db.projectPhotos.add(photo as ProjectPhoto);

  // 대표 사진은 진행 사진의 최신을 따라간다. 목록에서 알고 싶은 건 "지금
  // 어디까지 떴는지"이므로 참고 사진이 대표가 되면 안 된다. 사용자가 직접
  // 고른 장이 있으면 그것도 건드리지 않는다.
  const project = await db.projects.get(projectId);
  if (project && !project.coverPinned && kind === "progress") {
    await db.projects.update(projectId, touch({ coverPhotoId: photo.id }));
  }
  return photo.id;
}

/** 직접 고른 대표 사진은 이후에 올린 사진에 밀리지 않는다 */
export const setCover = (projectId: Id, photoId: Id) =>
  db.projects.update(
    projectId,
    touch({ coverPhotoId: photoId, coverPinned: true })
  );

export const updateCaption = (id: Id, caption: string) =>
  db.projectPhotos.update(id, touch({ caption: caption.trim() || undefined }));

/**
 * 사진을 지운다.
 *
 * 대표 사진을 지웠으면 남은 최신 사진으로 승계한다. 비워두면 목록 카드에서
 * 사진이 있는데도 아무것도 안 나오는 상태가 된다.
 */
export async function deletePhoto(id: Id) {
  await db.transaction("rw", [db.projects, db.projectPhotos], async () => {
    const photo = await db.projectPhotos.get(id);
    if (!photo) return;

    await db.projectPhotos.delete(id);

    const project = await db.projects.get(photo.projectId);
    if (project?.coverPhotoId !== id) return;

    const rest = (
      await db.projectPhotos
        .where("projectId")
        .equals(photo.projectId)
        .reverse()
        .sortBy("takenAt")
    ).filter((p) => p.kind !== "reference");
    // 고정해둔 장이 사라졌으면 고정도 함께 푼다. 안 풀면 새 사진을 올려도
    // 대표가 비어 있는 채로 남는다.
    await db.projects.update(
      photo.projectId,
      touch({ coverPhotoId: rest[0]?.id, coverPinned: false })
    );
  });
}
