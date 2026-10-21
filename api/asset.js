import { GetObjectCommand,PutObjectCommand,HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validKey,ASSET_PREFIXES,oracle,bucketFor,objectHead,sourceUrl } from '../lib/oracle.js';
async function recoverMissingAsset(key){
 const source=await fetch(sourceUrl(key),{signal:AbortSignal.timeout(15000)});
 if(!source.ok)throw Error('Source asset unavailable');
 const type=source.headers.get('content-type')||'';
 if(!/^(image|audio)\//i.test(type)||Number(source.headers.get('content-length'))>4*1024*1024)throw Error('Source asset not eligible');
 const reader=source.body.getReader(),chunks=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4*1024*1024){await reader.cancel();throw Error('Asset exceeds recovery limit');}chunks.push(Buffer.from(part.value));}}finally{reader.releaseLock();}
 if(!size)throw Error('Empty source asset');
 const body=Buffer.concat(chunks),Bucket=bucketFor(key);
 try{await oracle().send(new PutObjectCommand({Bucket,Key:key,Body:body,ContentLength:size,ContentType:type,IfNoneMatch:'*',Metadata:{'source-storage':'supabase'}}),{abortSignal:AbortSignal.timeout(15000)});}
 catch(e){if(e.$metadata?.httpStatusCode!==412)throw e;}
 const head=await oracle().send(new HeadObjectCommand({Bucket,Key:key}),{abortSignal:AbortSignal.timeout(10000)});
 if(Number(head.ContentLength)!==size)throw Error('Recovered size mismatch');
 return head;
}
export default async function handler(req,res){
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 let key;
 try{
  key=validKey(req.query.key);const asset=ASSET_PREFIXES.some(p=>key.startsWith(p));
  // Public artwork is the hot path: one OCI GET instead of HEAD followed by GET.
  // The Vercel edge caches successful responses, so repeat views avoid the function entirely.
  if(asset&&req.method==='GET'){
   let object;
   try{
    object=await oracle().send(new GetObjectCommand({Bucket:bucketFor(key),Key:key}),{abortSignal:AbortSignal.timeout(20000)});
   }catch(e){
    if(e.$metadata?.httpStatusCode===404||e.name==='NoSuchKey'||e.name==='NotFound'){
     try{await recoverMissingAsset(key);
      object=await oracle().send(new GetObjectCommand({Bucket:bucketFor(key),Key:key}),{abortSignal:AbortSignal.timeout(20000)});
     }catch{}
    }
    if(!object)throw e;
   }
   const size=Number(object.ContentLength||0);
   if(size>4*1024*1024){
    object.Body?.destroy?.();
    const url=await getSignedUrl(oracle(),new GetObjectCommand({Bucket:bucketFor(key),Key:key}),{expiresIn:3600});
    res.setHeader('Cache-Control','private, no-store');return res.redirect(307,url);
   }
   // Buffer before sending headers: truncated origin responses can still fall back safely.
   const body=Buffer.from(await object.Body.transformToByteArray());
   if(!body.length||(size&&body.length!==size))throw Error('Incomplete asset');
   res.setHeader('X-Asset-Storage','oracle');
   res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
   res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
   res.setHeader('Content-Type',object.ContentType||'application/octet-stream');
   res.setHeader('X-Content-Type-Options','nosniff');
   if(object.ETag)res.setHeader('ETag',object.ETag);
   if(req.headers['if-none-match']&&req.headers['if-none-match']===object.ETag)return res.status(304).end();
   res.setHeader('Content-Length',String(body.length));
   return res.status(200).send(body);
  }
  // HEAD requests and private ROM/download objects retain the existing verification path.
  let head;try{head=await objectHead(key);}catch(e){if(!asset)throw e;}
  if(!head&&asset){try{head=await recoverMissingAsset(key);}catch{}}
  if(!head){
   res.setHeader('Cache-Control','public, max-age=15, s-maxage=15');
   res.setHeader('X-Asset-Storage','supabase-fallback');return res.redirect(307,sourceUrl(key));
  }
  res.setHeader('X-Asset-Storage','oracle');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
  if(!asset||Number(head.ContentLength)>4*1024*1024){
   const url=await getSignedUrl(oracle(),new GetObjectCommand({Bucket:bucketFor(key),Key:key}),{expiresIn:3600});
   res.setHeader('Cache-Control','private, max-age=0, no-store');return res.redirect(307,url);
  }
  res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
  if(head.ETag)res.setHeader('ETag',head.ETag);
  if(req.headers['if-none-match']&&req.headers['if-none-match']===head.ETag)return res.status(304).end();
  res.setHeader('Content-Type',head.ContentType||'application/octet-stream');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Length',String(head.ContentLength));
  return res.status(200).end();
 }catch(error){
  if(key&&ASSET_PREFIXES.some(p=>key.startsWith(p))&&!res.headersSent){res.setHeader('Cache-Control','no-store');res.setHeader('X-Asset-Storage','supabase-fallback');return res.redirect(307,sourceUrl(key));}
  res.setHeader('Cache-Control','no-store');return res.status(error.status||502).json({error:'Unable to read asset'});
 }
}
export const config={maxDuration:60};
