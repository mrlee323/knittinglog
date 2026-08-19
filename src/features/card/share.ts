import { cardFileName } from "@/domain/card";

export type ShareOutcome = "shared" | "downloaded" | "cancelled";

/**
 * 카드를 다른 앱으로 보낸다 — 기획 §13.3.
 *
 * 영감 보관함이 **받는** 쪽이면 이건 **보내는** 쪽이고, 같은 Web Share
 * 인프라를 쓴다. 공유 시트가 없는 곳(PC 브라우저 대부분, iOS의 일부 경로)에서는
 * 내려받기로 떨어진다 — 이미지가 손에 남으면 어디에 올릴지는 사용자가 정한다.
 *
 * **Blob을 미리 만들어두고 부른다.** `navigator.share`는 사용자 동작 안에서
 * 불려야 하는데, 카드를 그리는 동안 await가 몇 번 끼면 그 동작이 끝난 것으로
 * 취급되어 iOS에서 거부된다. 그래서 화면은 카드를 먼저 그려 보여주고, 공유는
 * 두 번째 탭에서 즉시 부른다.
 */
export async function shareCard(
  blob: Blob,
  title: string,
  at: Date
): Promise<ShareOutcome> {
  const name = cardFileName(title, at);
  const file = new File([blob], name, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (cause) {
      // 사용자가 시트를 닫은 것은 실패가 아니다. 그때 내려받기로 이어가면
      // 취소한 사람의 다운로드 폴더에 파일이 쌓인다.
      if ((cause as { name?: string })?.name === "AbortError") return "cancelled";
      // 그 밖의 거부(동작 밖에서 불림 등)는 내려받기로 떨어진다
    }
  }

  download(blob, name);
  return "downloaded";
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // 즉시 해제하면 다운로드가 시작되기 전에 URL이 사라지는 브라우저가 있다
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
