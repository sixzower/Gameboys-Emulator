'use strict';
// A bounded device cache for public Supabase images. Preserve original image quality.
const CACHE_NAME='gameboys-public-images-v1';
const IMAGE_ORIGIN='https://opceuxrvzwbzuwzmubsh.supabase.co';
const IMAGE_PREFIX='/storage/v1/object/public/gameboysemulator/';
const MAX_AGE=24*60*60*1000,MAX_ENTRIES=80,MAX_BYTES=32*1024*1024,MAX_IMAGE_BYTES=2*1024*1024;
const inflight=new Map();
let writes=Promise.resolve();
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function eligible(request){
 const url=new URL(request.url);
 return request.method==='GET'&&request.destination==='image'&&request.mode==='cors'&&
  request.credentials!=='include'&&url.origin===IMAGE_ORIGIN&&url.pathname.startsWith(IMAGE_PREFIX)&&
  !request.headers.has('range')&&!['reload','no-store','no-cache'].includes(request.cache);
}
async function storeImage(cache,request,response){
 if(!response.ok||response.status!==200||!/^image\//i.test(response.headers.get('content-type')||''))return;
 if(/no-store|private/i.test(response.headers.get('cache-control')||''))return;
 const declared=Number(response.headers.get('content-length'));
 if(declared>MAX_IMAGE_BYTES)return;
 // Bound memory even when the response has no Content-Length.
 const reader=response.body?.getReader();if(!reader)return;
 const chunks=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>MAX_IMAGE_BYTES){void reader.cancel();return;}chunks.push(part.value);}}finally{reader.releaseLock();}
 if(!size)return;
 const headers=new Headers(response.headers);headers.set('x-gameboys-cached-at',String(Date.now()));headers.set('x-gameboys-cache-bytes',String(size));
 // The stored body is decoded, so do not retain wire compression headers.
 headers.delete('content-encoding');headers.delete('content-length');
 const stored=new Response(new Blob(chunks),{status:200,headers});
 writes=writes.catch(()=>{}).then(async()=>{
  await cache.delete(request);await cache.put(request,stored);
  const keys=await cache.keys(),items=await Promise.all(keys.map(async key=>({key,response:await cache.match(key)})));
  let count=items.length,bytes=items.reduce((sum,item)=>sum+Number(item.response?.headers.get('x-gameboys-cache-bytes')||0),0);
  for(const item of items){const old=Date.now()-Number(item.response?.headers.get('x-gameboys-cached-at')||0)>=MAX_AGE;
   if(old||count>MAX_ENTRIES||bytes>MAX_BYTES){await cache.delete(item.key);count--;bytes-=Number(item.response?.headers.get('x-gameboys-cache-bytes')||0);}
  }
 });
 await writes;
}
async function imageResponse(request,event){
 let cache;
 try{cache=await caches.open(CACHE_NAME);const hit=await cache.match(request);if(hit&&Date.now()-Number(hit.headers.get('x-gameboys-cached-at')||0)<MAX_AGE)return hit;}catch{}
 const key=request.url+'|'+request.mode+'|'+request.credentials;
 if(inflight.has(key))return (await inflight.get(key)).clone();
 const job=(async()=>{try{
  const response=await fetch(request);
  const saved=cache?storeImage(cache,request,response.clone()).catch(()=>{}):Promise.resolve();
  event.waitUntil(saved.finally(()=>{inflight.delete(key);}));return response;
 }catch(error){inflight.delete(key);throw error;}})();
 inflight.set(key,job);
 return (await job).clone();
}
self.addEventListener('fetch',event=>{if(eligible(event.request))event.respondWith(imageResponse(event.request,event));});