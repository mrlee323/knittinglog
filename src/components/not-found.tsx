import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { useStrings } from "@/i18n";

/**
 * 없는 주소.
 *
 * 라우터 기본 화면은 꾸미지 않은 "Not Found" 한 줄이고 돌아갈 길이 없다. 설치된
 * 앱에서는 그게 앱이 깨진 것처럼 보인다.
 *
 * 화면을 없애면 그 주소가 남는다 — "기록" 탭을 없애면서 /stats가 그렇게 됐다.
 * 북마크나 홈 화면 바로가기가 거기를 가리킬 수 있으므로 돌아갈 길이 필요하다.
 */
export function NotFound() {
  const t = useStrings();
  return (
    <Page title={t.common.notFound}>
      <p className="text-text-2 text-small">{t.common.notFoundHint}</p>
      <Link to="/" className="mt-4 inline-block">
        <Button>{t.nav.dashboard}</Button>
      </Link>
    </Page>
  );
}
