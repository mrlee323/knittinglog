/**
 * 공유 대상 받기 — 기획 §13.2 영감 보관함.
 *
 * 안드로이드 공유 시트에서 이 앱을 고르면 브라우저가 매니페스트의
 * `share_target.action`으로 **POST**를 보낸다. 서비스워커가 그것을 가로채지
 * 않으면 서버로 나가고, 우리에겐 서버가 없다.
 *
 * 이 파일은 Workbox가 만든 서비스워커 맨 위에서 importScripts로 불려온다
 * (vite.config.ts). 그래서 Workbox의 라우터보다 먼저 fetch 리스너가 붙고,
 * Workbox는 GET만 다루므로 서로 부딪히지 않는다.
 *
 * 받은 것을 **캐시에 잠깐 넣고 페이지로 넘긴다.** 서비스워커에서 IndexedDB에
 * 직접 쓰지 않는 이유는 앱의 Dexie 스키마·버전을 여기서 한 번 더 알아야 하고,
 * 그러면 스키마를 고칠 때 이 파일도 같이 고쳐야 하기 때문이다. 캐시는 스키마가
 * 없다.
 */

const INBOX = "knittinglog-share-inbox";
const META_KEY = "share-inbox-meta";

/** 스코프에서 주소를 만든다 — 배포 서브패스를 여기서 다시 적지 않으려고 */
const scoped = (path) => new URL(path, self.registration.scope).toString();

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "POST") return;
  if (new URL(request.url).pathname !== new URL(scoped("share")).pathname) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(INBOX);

      // 앞선 공유가 아직 안 꺼내진 채 남아 있으면 지운다. 안 지우면 메타는
      // 덮이는데 그때 파일은 남아서, 꺼낼 목록에 없는 이미지가 캐시에 영구히
      // 쌓인다. 새 공유가 이전 것을 대체하는 게 맞다 — 화면은 곧 열린다.
      for (const key of await cache.keys()) await cache.delete(key);

      const meta = { title: "", text: "", url: "", files: [], at: Date.now() };

      try {
        const form = await request.formData();
        meta.title = form.get("title") ?? "";
        meta.text = form.get("text") ?? "";
        meta.url = form.get("url") ?? "";

        const files = form.getAll("images").filter((f) => f && f.size > 0);
        for (let i = 0; i < files.length; i += 1) {
          const key = scoped(`share-inbox-file-${meta.at}-${i}`);
          await cache.put(
            key,
            new Response(files[i], {
              headers: {
                "content-type": files[i].type || "application/octet-stream",
              },
            })
          );
          meta.files.push(key);
        }
      } catch {
        // 폼을 읽지 못해도 화면은 열어준다. 빈 보관함이 열리는 것이
        // 공유가 아무 반응 없이 사라지는 것보다 낫다.
      }

      await cache.put(
        scoped(META_KEY),
        new Response(JSON.stringify(meta), {
          headers: { "content-type": "application/json" },
        })
      );

      // 303이어야 브라우저가 GET으로 다시 요청한다. 302면 POST를 반복한다.
      return Response.redirect(scoped("share?received=1"), 303);
    })()
  );
});
