export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Static dosyalar (uzantısı olan) normal servis edilsin
  if (/\.\w+$/.test(url.pathname)) {
    return env.ASSETS.fetch(request);
  }

  // SPA route'ları için index.html döndür
  return env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
}
