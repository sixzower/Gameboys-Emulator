/* Asset transport only: no emulator, save, animation or admin-login replacement. */
(()=>{
 'use strict';
 const SOURCE='https://opceuxrvzwbzuwzmubsh.supabase.co/storage/v1/object/public/gameboysemulator/';
 const prefixes=['covers/','marquee/','skins/','site-assets/','splash/','audio/'];
 function url(value){
  if(typeof value!=='string')return value;
  let key=value.startsWith(SOURCE)?value.slice(SOURCE.length):value.startsWith('oci:')?value.slice(4):value;
  if(key.startsWith('gameboysemulator/'))key=key.slice(17);
  if(!prefixes.some(prefix=>key.startsWith(prefix)))return value;
  try{key=decodeURIComponent(key);}catch{}
  return '/api/asset?key='+encodeURIComponent(key);
 }
 async function upload(blob,key,password){
  if(blob.size>4*1024*1024)throw Error('ไฟล์ภาพเกิน 4 MiB กรุณาย่อไฟล์ก่อนอัปโหลด');
  const response=await fetch('/api/asset-upload?key='+encodeURIComponent(key),{method:'PUT',headers:{'Content-Type':blob.type||'image/jpeg','X-Emulator-Admin':password},body:blob,signal:AbortSignal.timeout(60000)});
  const text=await response.text();let result;try{result=JSON.parse(text);}catch{throw Error('เซิร์ฟเวอร์อัปโหลดไม่พร้อม ('+response.status+')');}
  if(!response.ok||result.verified!==true)throw Error(result.error||'ตรวจสอบไฟล์อัปโหลดไม่สำเร็จ');return result.path;
 }
 async function remove(key,password){
  const response=await fetch('/api/asset-upload?key='+encodeURIComponent(key),{method:'DELETE',headers:{'X-Emulator-Admin':password},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('ลบไฟล์ Oracle ไม่สำเร็จ');
 }
 if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>{navigator.serviceWorker.register('/image-cache-sw.js',{updateViaCache:'none'}).catch(()=>{});},{once:true});
 window.OracleAssets=Object.freeze({url,upload,remove});
})();
