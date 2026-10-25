import { verifyAdmin } from '../lib/admin.js';
// Read-only, admin-only Vercel traffic usage endpoint. VERCEL_API_TOKEN is
// exclusively server-side; Vercel observability access can be plan-dependent.
// No numerical warning state is presented unless the API supplies real bytes
// AND the operator has configured the plan's true applicable budget.
const TEAM_ID=process.env.VERCEL_TEAM_ID||'team_alWV4EJfBxMV0A0v8Zbq1oO1';
const PROJECT_ID=process.env.VERCEL_PROJECT_ID||'prj_3eDubXqurByVdSD17BUlYjG3v29K';
let cached=null,inflight=null;
async function queryVercelUsage(){
 const token=process.env.VERCEL_API_TOKEN;
 if(!token)throw Object.assign(Error('ยังไม่ได้ตั้ง VERCEL_API_TOKEN บน Vercel'),{status:503});
 const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
 const params=new URLSearchParams({teamId:TEAM_ID});
 const upstream=await fetch('https://api.vercel.com/v2/observability/query?'+params,{
  method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({
   metric:'vercel.request.fdt_total_bytes',scope:{type:'project',projectId:PROJECT_ID},
   aggregation:'sum',startTime:start.toISOString(),endTime:now.toISOString(),limit:1
  }),
  signal:AbortSignal.timeout(9000)
 });
 if(!upstream.ok)throw Object.assign(Error('Vercel Observability ยังไม่อนุญาตให้อ่านข้อมูล Usage ('+upstream.status+')'),{status:503});
 const result=await upstream.json();
 const list=result.summary||result.result?.summary;
 const raw=list?.[0]?.vercel_request_fdt_total_bytes_sum;
 const bytes=Number(raw);
 if(!Array.isArray(list)||!list.length||!Number.isFinite(bytes)||bytes<0)
  throw Object.assign(Error('Vercel ยังไม่ส่งข้อมูล Fast Data Transfer ที่ตรวจสอบได้'),{status:503});
 const configured=Number(process.env.VERCEL_FDT_LIMIT_BYTES);
 return {
  source:'Vercel Observability',metric:'Fast Data Transfer',scope:'project',
  usedBytes:bytes,
  limitBytes:Number.isSafeInteger(configured)&&configured>0?configured:null,
  periodStart:start.toISOString(),periodEnd:now.toISOString(),
  updatedAt:now.toISOString()
 };
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 if(!verifyAdmin(req))return res.status(401).json({error:'Unauthorized'});
 try{
  if(cached&&Date.now()<cached.until)return res.status(200).json(cached.value);
  if(!inflight)inflight=queryVercelUsage().then(value=>{cached={until:Date.now()+300000,value};return value;})
   .finally(()=>{inflight=null;});
  return res.status(200).json(await inflight);
 }catch(error){
  return res.status(error.status||503).json({error:error.message||'Vercel Usage unavailable'});
 }
}
