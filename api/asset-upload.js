import { PutObjectCommand,HeadObjectCommand,DeleteObjectCommand,ListObjectsV2Command } from '@aws-sdk/client-s3';
import { validKey,ASSET_PREFIXES,oracle,bucketFor,verifyAdmin } from '../lib/oracle.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['PUT','DELETE'].includes(req.method))return res.status(405).json({error:'PUT only'});
 try{
  if(!await verifyAdmin(req))return res.status(401).json({error:'Unauthorized'});
  const key=validKey(req.query.key,ASSET_PREFIXES);if(req.method==='DELETE'){await oracle().send(new DeleteObjectCommand({Bucket:bucketFor(key),Key:key}));return res.status(200).json({deleted:true});}const limit=4*1024*1024;
  if(Number(req.headers['content-length'])>limit)return res.status(413).json({error:'ไฟล์ภาพเกิน 4 MiB กรุณาย่อไฟล์ก่อนอัปโหลด'});
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)return res.status(413).json({error:'File too large'});chunks.push(chunk);}
  if(!size)return res.status(400).json({error:'Empty file'});
  const type=req.headers['content-type']||'application/octet-stream';
  if(!/^image\/(png|jpeg|webp|gif|avif|x-icon|vnd.microsoft.icon)(;|$)/i.test(type)&&!/^audio\/(mpeg|ogg|wav|mp4|webm)(;|$)/i.test(type))return res.status(400).json({error:'Unsupported asset type'});
  const Bucket=bucketFor(key);
  // Keep the assets bucket below 1 GiB; stop if inventory cannot be verified.
  let used=0,continuation;for(let page=0;page<20;page++){
   const list=await oracle().send(new ListObjectsV2Command({Bucket,ContinuationToken:continuation}));
   used+=(list.Contents||[]).reduce((sum,item)=>sum+Number(item.Size||0),0);
   if(used+size>1024**3)return res.status(413).json({error:'พื้นที่ภาพ Oracle ถึงเพดาน 1 GiB แล้ว'});
   if(!list.IsTruncated)break;continuation=list.NextContinuationToken;if(!continuation||page===19)throw Error('Cannot verify capacity');
  }
  await oracle().send(new PutObjectCommand({Bucket,Key:key,Body:Buffer.concat(chunks),ContentLength:size,ContentType:type,CacheControl:'public, max-age=86400',IfNoneMatch:'*'}));
  const stored=await oracle().send(new HeadObjectCommand({Bucket,Key:key}));if(Number(stored.ContentLength)!==size)throw Error('Size verification failed');
  return res.status(200).json({path:'oci:'+key,size,verified:true});
 }catch(e){return res.status(e.status|| (e.$metadata?.httpStatusCode===412?409:502)).json({error:'บันทึกไฟล์ Oracle ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อและสิทธิ์'});}
}
export const config={api:{bodyParser:false},maxDuration:60};
