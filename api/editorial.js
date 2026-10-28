import { verifyAdmin } from '../lib/admin.js';

// Editorial records are publicly readable, but may only be written through this
// Vercel function after the existing administrator password has been verified.
// SUPABASE_SERVICE_ROLE_KEY remains server-side; no browser receives it.
const API_ORIGIN = 'https://opceuxrvzwbzuwzmubsh.supabase.co';
const FIELDS = new Set(['description','story_text','highlights','romhack_info','rom_version']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LENGTH = { description:2500, story_text:30000, highlights:12000, romhack_info:12000, rom_version:200 };

function fail(message,status=400) {
 return Object.assign(new Error(message), {status});
}
function supabaseConfig(){
 const base = new URL(process.env.SUPABASE_URL || API_ORIGIN);
 if(base.protocol !== 'https:' || base.hostname !== 'opceuxrvzwbzuwzmubsh.supabase.co') throw fail('Unexpected Supabase project URL',503);
 const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw fail('Supabase server credentials not configured',503);
 return {base,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{})}};
}
async function supa(method,query,payload){
 const {base,headers}=supabaseConfig();
 const url=new URL('/rest/v1/rom_hack_content',base);
 for(const [key,value] of Object.entries(query))url.searchParams.set(key,String(value));
 const response=await fetch(url,{
  method,
  headers:{...headers,Accept:'application/json',...(payload?{'Content-Type':'application/json',Prefer:'return=representation'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{}),
  signal:AbortSignal.timeout(11000),
  cache:'no-store'
 });
 if(!response.ok) {
  console.error('Editorial Supabase request failed',method,response.status);
  throw fail('Cannot update the editorial database (HTTP '+response.status+')',502);
 }
 const rows=await response.json();
 if(!Array.isArray(rows))throw fail('Editorial response malformed',502);
 return rows;
}
function parseInput(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw fail('Invalid JSON body');
 const id=String(raw.game_id||'');
 if(!UUID.test(id))throw fail('Invalid game ID');
 const gameName=raw.game_name;
 if(typeof gameName!=='string'||!gameName.trim()||gameName.length>240)throw fail('Invalid game name');
 const patch={};
 for(const key of FIELDS){
  if(!Object.prototype.hasOwnProperty.call(raw,key))continue;
  const value=raw[key];
  if(value!==null && (typeof value!=='string'||value.length>MAX_LENGTH[key]))throw fail('Invalid '+key);
  patch[key]=value;
 }
 if(!Object.keys(patch).length)throw fail('No editorial changes supplied');
 if(Object.prototype.hasOwnProperty.call(patch,'story_text')){
  // The legacy detail view still reads summary; keep both views consistent.
  patch.summary=patch.story_text;
 }
 return {id,name:gameName.trim(),patch};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 if(!verifyAdmin(req))return res.status(401).json({error:'Unauthorized'});
 try{
  if(Number(req.headers['content-length']||0)>50000)throw fail('Payload too large',413);
  const {id,name,patch}=parseInput(req.body);
  const found=await supa('GET',{select:'content_id,game_id',game_id:'eq.'+id,limit:2});
  if(found.length>1)throw fail('Duplicate game IDs in editorial content',409);
  const payload={...patch,game_name:name,updated_at:new Date().toISOString()};
  const rows=found.length
   ?await supa('PATCH',{content_id:'eq.'+found[0].content_id,select:'content_id,game_id,description,summary,story_text,highlights,romhack_info,rom_version'},payload)
   :await supa('POST',{select:'content_id,game_id,description,summary,story_text,highlights,romhack_info,rom_version'},{game_id:id,...payload});
  if(rows.length!==1||String(rows[0].game_id).toLowerCase()!==id.toLowerCase())throw fail('Editorial write could not be verified',502);
  for(const [field,value] of Object.entries(patch))if(rows[0][field]!==value)throw fail('Editorial data verification failed: '+field,502);
  return res.status(200).json({ok:true,game_id:id,updated_at:payload.updated_at});
 }catch(error){
  return res.status(error.status||503).json({error:error.status?error.message:'Editorial service temporarily unavailable'});
 }
}
