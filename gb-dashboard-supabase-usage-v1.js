/* Supabase Storage usage — admin dashboard only.
   Independent client: the site's main "sb" adapter can be pointed at D1.
   No service-role keys, no polling, five-minute usage cache. */
(()=>{
 'use strict';
 if(window.GB_SUPABASE_USAGE)return;
 const TTL=5*60*1000;
 let client=null,cache=null,until=0,inFlight=null;
 function source(){
  if(!client){
   if(!window.supabase?.createClient)throw Error('Supabase Storage SDK ไม่พร้อมใช้งาน');
   client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
   });
  }
  return client.storage.from(BUCKET);
 }
 async function load(){
  const bucket=source(),queue=[''],visited=new Set(),folders={roms:0,covers:0,marquee:0,skins:0,other:0};
  let total=0,files=0,listed=0;
  while(queue.length){
   const prefix=queue.shift();
   if(visited.has(prefix))continue;
   visited.add(prefix);
   if(visited.size>160)throw Error('มีโฟลเดอร์ Supabase Storage มากเกินกำหนด');
   let offset=0;
   while(true){
    const {data,error}=await bucket.list(prefix,{limit:1000,offset});
    if(error)throw Error('อ่าน Supabase Storage ไม่สำเร็จ: '+error.message);
    const entries=Array.isArray(data)?data:[];
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
