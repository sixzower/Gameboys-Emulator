'use strict';
// Bounded read-through cache. Native browser HTTP cache remains the primary cache
// for Oracle public artwork. No opaque responses or private ROM data are stored.
const CACHE_NAME='gameboys-public-images-v3';
const MAX_AGE=24*60*60*1000,MAX_ENTRIES=64,MAX_BYTES=32*1024*1024,MAX_IMAGE=4*1024*1024;
const OCI_ORIGIN='https://objectstorage.ap-singapore-1.oraclecloud.com';
const OCI_PATH='/n/ax9vabhnvdmn/b/sixzower-assets/o/';
const ASSET=/^(covers|marquee|skins|site-assets|splash|audio)\//;
const pending=new Map();let writes=Promise.resolve();
self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('gameboys-public-images-')&&key!==CACHE_NAME)await caches.delete(key);
 await self.clients.claim();
})()));
function eligible(request){
 if(request.method!=='GET'||request.destination!=='image'||request.credentials==='include'||request.headers.has('range'))return false;
 if(['no-store','reload','no-cache'].includes(request.cache))return false;
 // Opaque cross-origin images cannot be size-verified: leave their native cache alone.
 if(!['same-origin','cors'].includes(request.mode))return false;
 const url=new URL(request.url);
 if(url.origin===self.location.origin&&url.pathname==='/api/asset')return ASSET.test(url.searchParams.get('key')||'');
 if(url.origin===OCI_ORIGIN&&url.pathname.startsWith(OCI_PATH)){
  try{return ASSET.test(decodeURIComponent(url.pathname.slice(OCI_PATH.length)));}catch{return false;}
 }
 return false;
}
async function retain(request,response){
 if(response.type==='opaque'||response.redirected||!response.ok||response.status!==200)return;
 if(!/^image\//i.test(response.headers.get('content-type')||''))return;
 if(/no-store|private/i.test(response.headers.get('cache-control')||''))return;
 if(Number(response.headers.get('content-length')||0)>MAX_IMAGE)return;
 const buffer=await response.arrayBuffer();
 if(!buffer.byteLength||buffer.byteLength>MAX_IMAGE)return;
 const cache=await caches.open(CACHE_NAME),headers=new Headers(response.headers);
 headers.delete('content-length');headers.delete('content-encoding');
 headers.set('x-gameboys-cached-at',String(Date.now()));
 headers.set('x-gameboys-size',String(buffer.byteLength));
 const entry=new Response(buffer,{status:200,headers});
 writes=writes.catch(()=>{}).then(async()=>{
  await cache.put(request,entry);
  const items=await cache.keys();let size=0,excess=[];
  for(const key of items){const item=await cache.match(key),stamp=Number(item?.headers.get('x-gameboys-cached-at')||0),bytes=Number(item?.headers.get('x-gameboys-size')||0);
   size+=bytes;if(!stamp||Date.now()-stamp>=MAX_AGE)excess.push([key,bytes]);
  }
  for(const [key,bytes] of excess){await cache.delete(key);size-=bytes;}
  const remaining=await cache.keys();let count=remaining.length;
  for(const key of remaining){
   if(count<=MAX_ENTRIES&&size<=MAX_BYTES)break;
   const value=await cache.match(key),bytes=Number(value?.headers.get('x-gameboys-size')||0);
   await cache.delete(key);count--;size-=bytes;
  }
 });
 await writes;
}
async function responseFor(request,e){
 const cache=await caches.open(CACHE_NAME).catch(()=>null);
 if(cache){const hit=await cache.match(request).catch(()=>null);
  if(hit&&Date.now()-Number(hit.headers.get('x-gameboys-cached-at')||0)<MAX_AGE)return hit;
 }
 const key=request.url+'|'+request.mode;
 if(pending.has(key))return (await pending.get(key)).clone();
 const work=fetch(request).then(res=>{
  if(cache)e.waitUntil(retain(request,res.clone()).catch(()=>{}));
  return res;
 }).finally(()=>pending.delete(key));
 pending.set(key,work);
 return (await work).clone();
}
self.addEventListener('fetch',e=>{if(eligible(e.request))e.respondWith(responseFor(e.request,e));});
