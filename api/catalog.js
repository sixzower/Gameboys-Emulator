import { GetObjectCommand,PutObjectCommand } from '@aws-sdk/client-s3';
import {oracle,bucketFor,verifyAdmin} from '../lib/oracle.js';

// The public catalog contains game metadata only. Player saves never enter this object.
const KEY='site-assets/public-catalog.json';
const MAX_CATALOG_BYTES=1024*1024;
const BASE='https://opceuxrvzwbzuwzmubsh.supabase.co';
function isCatalog(data){
 return !!(data&&Array.isArray(data.games)&&data.games.length&&Array.isArray(data.marquee)&&data.marquee.length&&data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings));
}
async function readTable(name,select,order){
 const base=new URL(process.env.SUPABASE_URL||BASE);
 if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))throw Error('Invalid Supabase origin');
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!service)throw Error('Missing server-side Supabase credentials');
 const url=new URL(`/rest/v1/${name}`,base);
 url.searchParams.set('select',select);
 if(order)url.searchParams.set('order',order);
 if(name==='site_settings')url.searchParams.set('or','(key.like.gameSummary:*,key.like.romBase:*)');
 const response=await fetch(url,{headers:{apikey:service,Authorization:`Bearer ${service}`},signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);
 const rows=await response.json();
 if(!Array.isArray(rows))throw Error('Unexpected table response: '+name);
 return rows;
}
async function readCatalog(){
 const response=await oracle().send(new GetObjectCommand({Bucket:bucketFor(KEY),Key:KEY}),{abortSignal:AbortSignal.timeout(12000)});
 const bytes=Buffer.from(await response.Body.transformToByteArray());
 if(!bytes.length||bytes.length>MAX_CATALOG_BYTES)throw Error('Invalid catalog length');
 const data=JSON.parse(bytes.toString('utf8'));
 if(!isCatalog(data))throw Error('Invalid catalog schema');
 return data;
}
export default async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET'){
  try{
   const catalog=await readCatalog();
   res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=180');
   return res.status(200).json(catalog);
  }catch(error){
   res.setHeader('Cache-Control','no-store');
   return res.status(503).json({error:'Oracle catalog unavailable'});
  }
 }
 if(req.method!=='POST'){
  res.setHeader('Allow','GET, POST');return res.status(405).end();
 }
 res.setHeader('Cache-Control','no-store');
 try{
  if(!await verifyAdmin(req))return res.status(401).json({error:'Unauthorized'});
  const [games,marquee,settingsRows]=await Promise.all([
   readTable('games','id,name,rom_path,cover_path,core,created_at,description,sort_order,has_thai,version','sort_order.asc.nullslast,created_at.asc'),
   readTable('marquee_images','id,image_path,sort_order','sort_order.asc'),
   readTable('site_settings','key,value','key.asc')
  ]);
  if(!games.length||!marquee.length)throw Error('Refusing an empty or partial catalog');
  const settings=Object.fromEntries(settingsRows.filter(x=>typeof x.key==='string').map(x=>[x.key,x.value]));
  const catalog={version:2,generated_at:new Date().toISOString(),games,marquee,settings};
  if(!isCatalog(catalog))throw Error('Invalid refreshed catalog');
  const bytes=Buffer.from(JSON.stringify(catalog),'utf8');
  if(bytes.length>MAX_CATALOG_BYTES)throw Error('Catalog too large');
  const bucket=bucketFor(KEY);
  await oracle().send(new PutObjectCommand({Bucket:bucket,Key:KEY,Body:bytes,ContentType:'application/json; charset=utf-8',CacheControl:'public, max-age=60'}),{abortSignal:AbortSignal.timeout(15000)});
  const stored=await readCatalog();
  if(stored.generated_at!==catalog.generated_at||stored.games.length!==games.length||stored.marquee.length!==marquee.length||Object.keys(stored.settings).length!==Object.keys(settings).length)throw Error('Catalog verification failed');
  return res.status(200).json({ok:true,games:games.length,marquee:marquee.length,settings:Object.keys(settings).length,generated_at:stored.generated_at});
 }catch(error){
  console.error('Oracle catalog refresh failed:',error?.message);
  return res.status(502).json({error:'ซิงก์ข้อมูลเกมไม่สำเร็จ ข้อมูลเดิมยังอยู่ กรุณาลองซิงก์ใหม่'});
 }
}
export const config={maxDuration:60};
