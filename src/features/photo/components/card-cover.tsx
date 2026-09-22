import { useBlobImage } from "@/features/photo/use-blob-image";

/**
 * 이미지형 카드의 윗면.
 *
 * `CoverThumb`과 다른 점은 **자리를 항상 만든다**는 것이다. 썸네일은 없으면
 * 안 그리는 게 맞았다 — 줄 목록에서 빈 칸은 "빠진 것"으로 읽힌다. 그런데
 * 세로형 카드에서 윗면이 사라지면 카드 모양 자체가 달라져서, 한 목록에
 * 사진 카드와 줄 카드가 섞여버린다.
 *
 * 001이 정한 fallback에서 여기가 맡는 것은 **대표 사진 → 실 색 스와치 →
 * 조용한 빈 상태** 세 단계다. 조각 도면·게이지 눈금은 조각 데이터가 있어야
 * 그릴 수 있어 이 컴포넌트에 넣지 않았다.
 *
 * **큰 색면으로 칠하지 않는다**(docs/DESIGN.md). 한 목록에 사진 카드와 색면
 * 카드가 섞이면 색면이 이긴다 — 편물 사진은 저채도에 복잡하고 색면은 고채도에
 * 단순해서, 사진을 올린 프로젝트가 오히려 덜 보이는 목록이 된다. 실 색은
 * 조용한 바탕 위의 스와치로만 나온다.
 *
 * 비율은 `aspect-[4/3]`이다. 폰에서 이보다 키우면 목록의 둘째 카드가 첫
 * 화면에서 사라진다 — discuss/003에서 잰 값이고 `scripts/measure-safe-area.mjs`가
 * 지킨다.
 *
 * **마지막 단(사진도 실도 없음)의 밀도는 관문이다**(discuss/007).
 * `scripts/measure-empty.mjs`가 윗면을 되읽어 셋을 잰다 — 잉크 비율(A1),
 * 잉크가 닿은 세로줄 비율(A2), 잉크 픽셀의 평균 채널차(A3). A1만 두면 005가
 * 한 번 빠진 자리로 되돌아가고(면 전체 괘선 = 줄공책), A3가 없으면 바탕과
 * 구분되지 않는 잉크로 A1을 채워 관문을 통과할 수 있다.
 */
export function CardCover({ blob, color }: { blob?: Blob; color?: string }) {
  const ref = useBlobImage(blob);

  if (blob) {
    return (
      <img ref={ref} alt="" className="aspect-[4/3] w-full object-cover" />
    );
  }

  return (
    <div
      aria-hidden
      className="bg-sunken relative flex aspect-[4/3] w-full items-center justify-center"
    >
      {/* 단수 눈금 — "아직 단이 쌓이기 전"이라는 뜻이다.
          가로줄을 면 전체에 깔면 노트 괘선처럼 보여서 **무늬 배경**이 된다
          (docs/DESIGN.md: "무늬 배경이 되는 순간 뺀다"). 그래서 자처럼 왼쪽
          가장자리에만 짧게 둔다 — 배경이 아니라 눈금으로 읽힌다. */}
      {/* `opacity-60`을 뺐다. 60%를 걸면 선의 채널차가 14에서 8로 내려가
          바탕과 거의 구분되지 않는다 — 007에서 재보니 이 눈금의 잉크가
          평균 11.1/255였고, 그건 "있지만 안 보이는" 잉크다. */}
      <span
        className="absolute inset-y-0 left-0 w-2.5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 15px, var(--color-line) 15px 16px)",
        }}
      />
      {/* 실 색 스와치 — 001의 fallback에서 사진 다음 단계다.
          정보 줄의 색점보다 크게 두는 이유는, 여기서는 이게 카드의 얼굴이라
          작아지면 남는 것이 회색 면뿐이기 때문이다. 그래도 **면을 다 칠하지는
          않는다** — 테두리를 가진 견본으로 보여야 색면 카드가 사진 카드를
          이기지 않는다(docs/DESIGN.md).
          실도 없으면 점선 자리만 남는다. "아직 기록 전"이라는 뜻이고, 이때
          임의의 색을 만들어 채우지 않는다. */}
      {color ? (
        <span
          aria-hidden
          // 흰색·아주 밝은 실이 바탕에서 사라지지 않도록 링을 깐다.
          className="ring-line relative h-16 w-24 rounded-sm ring-1 ring-inset"
          style={{ background: color }}
        />
      ) : (
        /* 실도 사진도 없을 때 — 001 결정 5의 **마지막 단**이다.
           점선 자리만 두면 356×267 면에 잉크가 0.38%뿐이라(007에서 실측)
           "아직 기록 전"이 아니라 "만들다 만 것"으로 읽힌다. 그렇다고 면을
           칠하거나 그림을 그릴 수는 없다 — 칠할 색 자체가 없고(실이 없다),
           그림체를 정하는 것은 013이다.
           그래서 **이 앱이 이미 가진 좌표계**를 빈 채로 놓는다. 코는
           오른쪽부터, 단은 아래부터 세는 격자다(AGENTS.md). 8px 칸이
           16×12이므로 16코 12단짜리 빈 스와치이고, 이건 발명한 그림이 아니라
           001이 말한 "눈금 구조"를 2차원으로 편 것이다.
           **면을 다 덮지 않는다** — 128×96은 윗면 폭의 36%라 괘선처럼 퍼지지
           않는다(관문 A2). */
        <span
          aria-hidden
          className="border-line-strong relative h-24 w-32 rounded-sm border border-dashed"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, var(--color-line-strong) 0 1px, transparent 1px 8px), repeating-linear-gradient(to bottom, var(--color-line-strong) 0 1px, transparent 1px 8px)",
          }}
        />
      )}
    </div>
  );
}
