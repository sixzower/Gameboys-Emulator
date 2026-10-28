/* Supabase Storage usage — admin dashboard only.
   Direct authenticated-by-publishable-key Storage REST; the site's main "sb" adapter uses D1.
   No service-role keys, no polling, five-minute usage cache. */
(()=>{
 'use strict';
 if(window.GB_SUPABASE_USAGE)return;
 const TTL=5*60*1000;
 let cache=null,until=0,inFlight=null;
 // D1 mode does not load supabase-js: use the documented Storage listing REST endpoint.
 async function list(prefix,offset,signal){
  const response=await fetch(SUPABASE_URL+'/storage/v1/object/list/'+encodeURIComponent(BUCKET),{
   method:'POST',cache:'no-store',signal,
   headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({prefix,limit:1000,offset})
  });
  const body=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(body))throw Error('Supabase Storage '+response.status+' · อ่านข้อมูลไม่สำเร็จ');
  return body;
 }
 async function load(){
  const signal=AbortSignal.timeout(16000),queue=[''],visited=new Set(),folders={roms:0,covers:0,marquee:0,skins:0,other:0};
  let total=0,files=0,listed=0;
  while(queue.length){
   const prefix=queue.shift();
   if(visited.has(prefix))continue;
   visited.add(prefix);
   if(visited.size>160)throw Error('มีโฟลเดอร์ Supabase Storage มากเกินกำหนด');
   let offset=0;
   while(true){
    const entries=await list(prefix,offset,signal);
    for(const item of entries){
     if(!item||!item.name)continue;
     const path=prefix?prefix+'/'+item.name:item.name;
     if(item.id!=null){
      files++;
      const bytes=Number(item.metadata?.size);
      if(Number.isFinite(bytes)&&bytes>=0){
       total+=bytes;
       const kind=Object.hasOwn(folders,path.split('/')[0])?path.split('/')[0]:'other';
       folders[kind]+=bytes;
      }
     }else if(!visited.has(path)){
      queue.push(path);
     }
    }
    listed+=entries.length;
    if(listed>50000)throw Error('รายการไฟล์ Supabase Storage เกินขอบเขตตรวจสอบ');
    if(entries.length<1000)break;
    offset+=1000;
   }
  }
  return {total,files,folders,at:Date.now()};
 }
 function read(){
  if(cache&&Date.now()<until)return Promise.resolve(cache);
  if(inFlight)return inFlight;
  inFlight=load().then(result=>{
   cache=result;until=Date.now()+TTL;return result;
  }).finally(()=>{inFlight=null});
  return inFlight;
 }
 function invalidate(){cache=null;until=0}
 window.GB_SUPABASE_USAGE=Object.freeze({read,invalidate});
 document.getElementById('dashRefreshBtn')?.addEventListener('click',invalidate,{capture:true});
})();
