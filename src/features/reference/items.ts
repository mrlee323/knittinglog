import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseYouTube, type YouTubeRef } from "@/domain/youtube";
import {
  listPatternPhotos,
  listReferencePhotos,
} from "@/features/photo/repository";
import { listLinks } from "@/features/reference/repository";
import type { Id, ProjectPhoto } from "@/types/entities";

/**
 * 작업대에 놓을 수 있는 것들.
 *
 * 도안 이미지·참고 사진·영상은 저장 위치가 다르지만(사진 테이블 / 링크 테이블)
 * 화면에서는 "볼 수 있는 항목" 하나로 다룬다. 작업대와 뜨기 모드가 같은 목록을
 * 쓰기 때문에 이 변환을 한 곳에 둔다.
 */
export type ItemKind = "pattern" | "reference" | "video";

export interface ViewerItem {
  id: Id;
  kind: ItemKind;
  photo?: ProjectPhoto;
  video?: YouTubeRef;
  title?: string;
  note?: string;
}

export interface WorkbenchItems {
  items: ViewerItem[];
  /** 아직 불러오는 중 */
  loading: boolean;
}

export function useWorkbenchItems(projectId: Id): WorkbenchItems {
  const patterns = useLiveQuery(
    () => listPatternPhotos(projectId),
    [projectId]
  );
  const references = useLiveQuery(
    () => listReferencePhotos(projectId),
    [projectId]
  );
  const links = useLiveQuery(() => listLinks(projectId), [projectId]);

  const items = useMemo<ViewerItem[]>(
    () => [
      ...(patterns ?? []).map(
        (photo): ViewerItem => ({ id: photo.id, kind: "pattern", photo })
      ),
      ...(references ?? []).map(
        (photo): ViewerItem => ({ id: photo.id, kind: "reference", photo })
      ),
      // 못 읽는 주소는 목록에서 뺀다. 재생할 수 없는 항목을 트레이에 두면
      // 어느 게 눌러지는지 매번 확인해야 한다.
      ...(links ?? []).flatMap((link): ViewerItem[] => {
        const video = parseYouTube(link.url);
        return video
          ? [
              {
                id: link.id,
                kind: "video",
                video,
                title: link.title,
                note: link.note,
              },
            ]
          : [];
      }),
    ],
    [patterns, references, links]
  );

  return {
    items,
    loading: !patterns || !references || !links,
  };
}

/** 도안을 먼저 보여준다 — 작업대에 들어오는 이유는 대개 도안을 보려는 것이다 */
export const preferPattern = (items: ViewerItem[]) =>
  items.find((i) => i.kind === "pattern") ?? items[0];
