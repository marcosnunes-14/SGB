/* Apenas a estrutura pública e arquivos estáticos. Dados pessoais ficam no cofre criptografado. */
const REVISION = 'BUILD';
const CACHE='sgb-aplicativo-'+REVISION;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch('/offline-assets.json',{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('Lista de arquivos do aplicativo indisponível.');
 const manifest=await response.json();const cache=await caches.open(CACHE);
 await cache.addAll(manifest.assets.map(path=>new Request(path,{credentials:'omit',cache:'reload'})));
 const shell=await fetch('/aplicativo',{credentials:'omit',cache:'reload'});if(!shell.ok)throw Error('Não foi possível preparar o aplicativo.');await cache.put('/aplicativo',shell);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('sgb-aplicativo-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();if(event.data==='STATUS')event.ports[0]?.postMessage({ready:true,version:REVISION})});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(url.origin!==self.location.origin||request.method!=='GET'||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),4000);
   try{const response=await fetch(request,{signal:abort.signal});if(url.pathname==='/aplicativo'&&response.ok){const cache=await caches.open(CACHE);await cache.put('/aplicativo',response.clone())}return response}
   catch{
    if(url.pathname==='/aplicativo'){const cached=await caches.match('/aplicativo',{cacheName:CACHE});if(cached)return cached}
    const views={'/relatorio':'report','/relatorio/alunos':'students','/emprestimos/comprovante':'receipt','/etiquetas/imprimir':'labels'};
    if(url.pathname==='/'||url.pathname==='/sistema'||views[url.pathname]){const target=new URL('/aplicativo',url.origin);target.search=url.search;if(views[url.pathname])target.searchParams.set('view',views[url.pathname]);return Response.redirect(target.href,302)}
    return new Response('Esta página precisa de internet. Abra o aplicativo SGB.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
   }finally{clearTimeout(timer)}
  })());return;
 }
 if(url.pathname.startsWith('/_next/static/')||['/sgb-logo.png','/sgb-info-books.jpg','/sgb-info-logo.webp','/sgb-app-192.png','/sgb-app-512.png','/manifest.webmanifest','/vinext-client-entry-manifest.json'].includes(url.pathname))event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response})());
});
