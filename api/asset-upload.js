import { PutObjectCommand,HeadObjectCommand,DeleteObjectCommand,ListObjectsV2Command } from '@aws-sdk/client-s3';
import { validKey,ASSET_PREFIXES,oracle,bucketFor,verifyAdmin } from '../lib/oracle.js';
// Per-instance read-through inventory optimization: exact list scan at startup/near quota.
// Preserve the 1 GiB ceiling, fail closed on inventory errors, and reserve in-flight bytes.
// Multi-instance/global atomic quota still requires a central ledger (not available here).
const MAX_ASSETS=1024**3,MAX_IMAGE=4*1024**2;
const HEADROOM=128*1024**2,FAST_BUDGET=32*1024**2,FAST_TTL=4000;
const inventories=new Map(),scans=new Map();
async function fullInventory(Bucket){
 let used=0,continuation;
 for(let page=0;page<20;page++){
  const list=await oracle().send(new ListObjectsV2Command({Bucket,ContinuationToken:continuation}));
  used+=(list.Contents||[]).reduce((sum,item)=>sum+Number(item.Size||0),0);
  if(!Number.isFinite(used)||used<0)throw Error('Storage inventory invalid');
  if(used>MAX_ASSETS)throw Object.assign(Error('Oracle asset quota reached'),{status:413});
  if(!list.IsTruncated)return used;
  continuation=list.NextContinuationToken;
  if(!continuation||page===19)throw Error('Cannot verify complete capacity');
 }
 throw Error('Cannot verify complete capacity');
}
async function freshInventory(Bucket){
 let job=scans.get(Bucket);
 if(!job){
  job=fullInventory(Bucket).then(used=>{
   const old=inventories.get(Bucket);
   const entry={used:Math.max(used,old?.used||0),reserved:old?.reserved||0,fastBytes:0,until:Date.now()+FAST_TTL};
   inventories.set(Bucket,entry);
   return entry;
  }).finally(()=>{scans.delete(Bucket)});
  scans.set(Bucket,job);
 }
 return job;
}
async function reserveCapacity(Bucket,size){
 let entry=inventories.get(Bucket);
 const cheap=entry&&entry.until>Date.now()&&
   entry.used+entry.reserved+size+HEADROOM<MAX_ASSETS&&
   entry.fastBytes+size<=FAST_BUDGET;
 if(!cheap)entry=await freshInventory(Bucket);
 if(entry.used+entry.reserved+size>MAX_ASSETS)
  throw Object.assign(Error('Oracle asset quota reached'),{status:413});
 entry.reserved+=size;entry.fastBytes+=size;
 let released=false;
 return wrote=>{
  if(released)return;
  released=true;entry.reserved=Math.max(0,entry.reserved-size);
  if(wrote)entry.used+=size;
 };
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['PUT','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 try{
  if(!await verifyAdmin(req))return res.status(401).json({error:'Unauthorized'});
  const key=validKey(req.query.key,ASSET_PREFIXES);if(req.method==='DELETE'){const Bucket=bucketFor(key);await oracle().send(new DeleteObjectCommand({Bucket,Key:key}));inventories.delete(Bucket);return res.status(200).json({deleted:true});}const limit=MAX_IMAGE;
  if(Number(req.headers['content-length'])>limit)return res.status(413).json({error:'ไฟล์ภาพเกิน 4 MiB กรุณาย่อไฟล์ก่อนอัปโหลด'});
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)return res.status(413).json({error:'File too large'});chunks.push(chunk);}
  if(!size)return res.status(400).json({error:'Empty file'});
  const type=req.headers['content-type']||'application/octet-stream';
  if(!/^image\/(png|jpeg|webp|gif|avif|x-icon|vnd.microsoft.icon)(;|$)/i.test(type)&&!/^audio\/(mpeg|ogg|wav|mp4|webm)(;|$)/i.test(type))return res.status(400).json({error:'Unsupported asset type'});
  const Bucket=bucketFor(key);
  // A short, pessimistic shared-in-instance inventory reduces repeated OCI LISTs.
  // Full scan remains mandatory near the cap, after the tiny budget, or after TTL.
  const release=await reserveCapacity(Bucket,size);
  let storedObject=false;
  try{
   await oracle().send(new PutObjectCommand({Bucket,Key:key,Body:Buffer.concat(chunks),ContentLength:size,ContentType:type,CacheControl:'public, max-age=86400',IfNoneMatch:'*'}));
   storedObject=true;
   const stored=await oracle().send(new HeadObjectCommand({Bucket,Key:key}));
   if(Number(stored.ContentLength)!==size)throw Error('Size verification failed');
   return res.status(200).json({path:'oci:'+key,size,verified:true});
  }finally{release(storedObject);}
 }catch(e){return res.status(e.status|| (e.$metadata?.httpStatusCode===412?409:502)).json({error:e.status===413?'พื้นที่ภาพ Oracle ถึงเพดาน 1 GiB หรือไฟล์ใหญ่เกินกำหนด':e.$metadata?.httpStatusCode===412?'ชื่อไฟล์นี้มีอยู่แล้ว':'บันทึกไฟล์ Oracle ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและสิทธิ์'});}
}
export const config={api:{bodyParser:false},maxDuration:60};
