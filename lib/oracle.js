import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
export const ASSET_PREFIXES=['covers/','marquee/','skins/','site-assets/','splash/','audio/'];
export const FILE_PREFIXES=[...ASSET_PREFIXES,'roms/','downloads/'];
export function validKey(value,prefixes=FILE_PREFIXES){
 if(typeof value!=='string'||value.length>1024||/[\\\x00-\x1f]/.test(value)||value.split('/').some(p=>!p||p==='.'||p==='..')||!prefixes.some(p=>value.startsWith(p)))throw Object.assign(Error('Invalid asset path'),{status:400});return value;
}
export function bucketFor(key){return /^(roms|downloads)\//.test(key)?process.env.OCI_ROMS_BUCKET:process.env.OCI_BUCKET;}
let client;
export function oracle(){
 const required=['OCI_REGION','OCI_NAMESPACE','OCI_BUCKET','OCI_ROMS_BUCKET','OCI_ACCESS_KEY_ID','OCI_SECRET_ACCESS_KEY'];
 if(required.some(k=>!process.env[k]))throw Object.assign(Error('Oracle connection is not configured'),{status:503});
 return client??=new S3Client({region:process.env.OCI_REGION,endpoint:`https://${process.env.OCI_NAMESPACE}.compat.objectstorage.${process.env.OCI_REGION}.oraclecloud.com`,forcePathStyle:true,credentials:{accessKeyId:process.env.OCI_ACCESS_KEY_ID,secretAccessKey:process.env.OCI_SECRET_ACCESS_KEY},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED',maxAttempts:2});
}
const heads=new Map();
export async function objectHead(key){
 const cached=heads.get(key);if(cached&&cached.until>Date.now())return cached.value;
 let value;try{value=await oracle().send(new HeadObjectCommand({Bucket:bucketFor(key),Key:key}),{abortSignal:AbortSignal.timeout(12000)});}catch(e){if(e.$metadata?.httpStatusCode===404||e.name==='NotFound'||e.name==='NoSuchKey')value=null;else throw e;}
 if(heads.size>=256)heads.delete(heads.keys().next().value);heads.set(key,{value,until:Date.now()+(value?60000:10000)});return value;
}
export function sourceUrl(key){
 const base=new URL(process.env.SUPABASE_URL||'https://opceuxrvzwbzuwzmubsh.supabase.co');
 if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))throw Error('Invalid source storage host');
 return `${base.origin}/storage/v1/object/public/${encodeURIComponent(process.env.SUPABASE_BUCKET||'gameboysemulator')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
export async function verifyAdmin(req){
 const password=req.headers['x-emulator-admin'];if(typeof password!=='string'||!password||password.length>512)return false;
 // Reuse the site's existing server-verified admin login, never ship a server secret to the browser.
 const base=new URL(process.env.SUPABASE_URL||'https://opceuxrvzwbzuwzmubsh.supabase.co');if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co'))return false;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return false;
 const r=await fetch(`${base.origin}/rest/v1/rpc/verify_emulator_admin`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_password:password}),signal:AbortSignal.timeout(10000)});
 return r.ok&&await r.json()===true;
}
