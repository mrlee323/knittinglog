import { db, stamp, touch } from "@/lib/db";
import { openPdf } from "@/features/patternDoc/pdfjs";
import { clampPage, isPdf } from "@/domain/pdfView";
import type { Id, PatternDoc } from "@/types/entities";

/* --- 조회 ----------------------------------------------------------------- */

/** 먼저 넣은 것이 위에. 참고 자료는 모은 순서가 곧 맥락이다(링크와 같은 규칙). */
export const listPatternDocs = (projectId: Id) =>
  db.patternDocs.where("projectId").equals(projectId).sortBy("createdAt");

export const getPatternDoc = (id: Id) => db.patternDocs.get(id);

/* --- 변경 ----------------------------------------------------------------- */

export class NotPdfError extends Error {}

/**
 * PDF를 프로젝트에 붙인다.
 *
 * 넣을 때 페이지 수를 세어 저장한다. 목록에서 "12쪽"을 보여주려면 필요하고,
 * 무엇보다 **여기서 한 번 읽어보지 않으면 열 수 없는 파일을 넣게 된다** —
 * 뜨려고 앉았을 때가 아니라 넣을 때 알아야 한다.
 */
export async function addPatternDoc(projectId: Id, file: File): Promise<Id> {
  if (!isPdf(file)) throw new NotPdfError(file.name);

  // 원본 버퍼를 pdf.js에 넘기면 소유권이 옮겨가 Blob 저장에 쓸 수 없게 되므로
  // 사본을 넘긴다.
  const buffer = await file.arrayBuffer();
  const doc = await openPdf(buffer.slice(0));
  const pageCount = doc.numPages;
  await doc.destroy();

  const record = stamp({
    projectId,
    // 확장자를 뗀 파일 이름이 대개 도안 이름이다
    name: file.name.replace(/\.pdf$/i, "") || "PDF",
    blob: new Blob([buffer], { type: "application/pdf" }),
    pageCount,
  });
  await db.patternDocs.add(record as PatternDoc);
  return record.id;
}

/**
 * 읽던 자리를 남긴다.
 *
 * 페이지를 넘길 때마다 쓴다. 확대율도 함께 남기는데, 도안마다 읽을 수 있는
 * 배율이 다르고(A4 한 장에 40단이 들어간 도안은 크게 키워야 한다) 그걸 매번
 * 다시 맞추는 것도 중단의 비용이다.
 */
export async function setPatternDocProgress(
  id: Id,
  progress: { page: number; zoom: number }
) {
  await db.patternDocs.update(
    id,
    touch({ lastPage: progress.page, lastZoom: progress.zoom })
  );
}

export const renamePatternDoc = (id: Id, name: string) =>
  db.patternDocs.update(id, touch({ name }));

export const deletePatternDoc = (id: Id) => db.patternDocs.delete(id);

/** 이 문서를 열었을 때 시작할 페이지. 문서가 바뀌었을 수 있으니 범위를 본다. */
export const resumePage = (doc: PatternDoc) =>
  clampPage(doc.lastPage ?? 1, doc.pageCount);
