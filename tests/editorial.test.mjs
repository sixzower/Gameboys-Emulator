import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/editorial.js';

const ID='11111111-1111-4111-8111-111111111111';
const name='Pokemon Test';
function response(){
 const out={statusCode:200,headers:{},body:null};
 return {out,setHeader(k,v){out.headers[k]=v;return this;},
 status(n){out.statusCode=n;return this;},json(v){out.body=v;return this;}};
}
function req(body,password='editor-test-pass'){
 return {method:'POST',headers:{'x-emulator-admin':password,'content-length':'150'},body};
}
const restore=()=>{delete process.env.EMULATOR_ADMIN_PASSWORD;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SUPABASE_URL;};
test('editorial endpoint validates administrator before any database operation',async()=>{
 process.env.EMULATOR_ADMIN_PASSWORD='editor-test-pass';
 const prev=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('never');};
 try{const res=response();await handler(req({game_id:ID,game_name:name,description:'Text'},'wrong'),res);
  assert.equal(res.out.statusCode,401);assert.equal(calls,0);}
 finally{globalThis.fetch=prev;restore();}
});
test('invalid game ID is rejected before the Supabase request',async()=>{
 process.env.EMULATOR_ADMIN_PASSWORD='editor-test-pass';
 const prev=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('never');};
 try{const res=response();await handler(req({game_id:'not-a-uuid',game_name:name,description:'Text'}),res);
  assert.equal(res.out.statusCode,400);assert.equal(calls,0);}
 finally{globalThis.fetch=prev;restore();}
});
test('description is written to existing matching ID and confirmed',async()=>{
 process.env.EMULATOR_ADMIN_PASSWORD='editor-test-pass';process.env.SUPABASE_SERVICE_ROLE_KEY='eyJexample-test-key';
 const prev=globalThis.fetch,operations=[];
 globalThis.fetch=async(url,opts)=>{
  operations.push({method:opts.method,url:String(url),headers:opts.headers});
  if(opts.method==='GET')return Response.json([{content_id:12,game_id:ID}]);
  if(opts.method==='PATCH')return Response.json([{content_id:12,game_id:ID,description:'New text',story_text:null,summary:null,highlights:null,romhack_info:null,rom_version:null}]);
  throw Error('unexpected');
 };
 try{const res=response();await handler(req({game_id:ID,game_name:name,description:'New text'}),res);
  assert.equal(res.out.statusCode,200);assert.equal(res.out.body.ok,true);
  assert.deepEqual(operations.map(o=>o.method),['GET','PATCH']);
  assert.match(operations[1].url,/content_id=eq%5C.12|content_id=eq.12/);}
 finally{globalThis.fetch=prev;restore();}
});
test('story editing publishes both story_text and legacy summary',async()=>{
 process.env.EMULATOR_ADMIN_PASSWORD='editor-test-pass';process.env.SUPABASE_SERVICE_ROLE_KEY='eyJexample-test-key';
 const prev=globalThis.fetch;let patched=null;
 globalThis.fetch=async(url,opts)=>{
  if(opts.method==='GET')return Response.json([{content_id:5,game_id:ID}]);
  patched=JSON.parse(opts.body);
  return Response.json([{content_id:5,game_id:ID,...patched,description:null,highlights:null,romhack_info:null,rom_version:null}]);
 };
 try{const res=response();await handler(req({game_id:ID,game_name:name,story_text:'Story'}),res);
  assert.equal(res.out.statusCode,200);assert.equal(patched.story_text,'Story');assert.equal(patched.summary,'Story');}
 finally{globalThis.fetch=prev;restore();}
});
