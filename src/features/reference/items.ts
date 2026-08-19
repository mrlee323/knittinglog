import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseYouTube, type YouTubeRef } from "@/domain/youtube";
import { listPatternDocs } from "@/features/patternDoc/repository";
import {
  listPatternPhotos,
  listReferencePhotos,
} from "@/features/photo/repository";
import { listLinks } from "@/features/reference/repository";
import type { Id, PatternDoc, ProjectPhoto } from "@/types/entities";

/**
 * 작업대에 놓을 수 있는 것들.
 *
 * 도안 이미지·참고 사진·영상은 저장 위치가 다르지만(사진 테이블 / 링크 테이블)
 * 화면에서는 "볼 수 있는 항목" 하나로 다룬다. 작업대와 뜨기 모드가 같은 목록을
 * 쓰기 때문에 이 변환을 한 곳에 둔다.
 */
export type ItemKind = "pdf" | "pattern" | "reference" | "video";

export interface ViewerItem {
  id: Id;
  kind: ItemKind;
  photo?: ProjectPhoto;
  doc?: PatternDoc;
  video?: YouTubeRef;
  title?: string;
  note?: string;
  /** 앱 안에서 재생할 수 없는 영상 */
  embedBlocked?: boolean;
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
  const docs = useLiveQuery(() => listPatternDocs(projectId), [projectId]);
  const links = useLiveQuery(() => listLinks(projectId), [projectId]);

  const items = useMemo<ViewerItem[]>(
    () => [
      // PDF를 맨 앞에 둔다. 상용 도안이 PDF로 오므로, 있으면 그게 이 프로젝트의
      // 도안이다.
      ...(docs ?? []).map((doc): ViewerItem => ({ id: doc.id, kind: "pdf", doc })),
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
                embedBlocked: link.embedBlocked,
              },
            ]
          : [];
      }),
    ],
    [docs, patterns, references, links]
  );

  return {
    items,
    loading: !docs || !patterns || !references || !links,
  };
}

/**
 * 도안을 먼저 보여준다 — 작업대에 들어오는 이유는 대개 도안을 보려는 것이다.
 *
 * PDF가 있으면 그쪽이 우선이다. 상용 도안은 PDF로 오고, 이미지 도안은 그걸
 * 찍거나 캡처한 것일 때가 많다.
 */
export const preferPattern = (items: ViewerItem[]) =>
  items.find((i) => i.kind === "pdf") ??
  items.find((i) => i.kind === "pattern") ??
  items[0];
