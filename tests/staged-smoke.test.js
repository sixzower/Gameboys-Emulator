import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scriptTags=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
test('index wrapper, Worker configuration and compressed page remain executable',()=>{
 assert.equal(scriptTags.length,3,'three inline outer scripts are expected');
 scriptTags.forEach(([tag,body])=>new vm.Script(body));
 assert.match(source,/useD1:true/);
 assert.match(source,/requestWorkerAdminPassword/);
});
function unpackAndPatch(enabled){
 let rendered='';
 const doc={open(){},write(text){rendered=String(text)},close(){}};
 const ctx={
  atob:value=>Buffer.from(value,'base64').toString('binary'),
  TextDecoder,document:doc,window:{GBD1:{enabled}},
  navigator:{},location:{protocol:'file:',hostname:''},
  console,setTimeout,clearTimeout
 };
 vm.runInNewContext(scriptTags.at(-1)[1],ctx,{timeout:8000});
 return rendered;
}
for(const enabled of [true,false]){
 test(`unpacked scripts compile with D1 ${enabled?'enabled':'disabled'}`,()=>{
  const html=unpackAndPatch(enabled);
  assert.match(html,/<!DOCTYPE html>/i);
  assert.match(html,/function gbCatalog\(\)/);
  assert.match(html,/Promise\.any/);
  assert.match(html,/Math\.min\(\.99,fraction\)/);
  const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length>40);
  for(let i=0;i<scripts.length;i++){
   if(scripts[i][1].includes('src=')||!scripts[i][2].trim())continue;
   assert.doesNotThrow(()=>new vm.Script(scripts[i][2],{filename:'inline-'+i+'.js'}));
  }
  const supabase=html.includes('src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"');
  assert.equal(supabase,!enabled,'unused Supabase library should be removed only in D1 mode');
 });
}
test('Service Worker is syntax-valid and does not cache ROMs',()=>{
 const src=fs.readFileSync(new URL('../image-cache-sw.js',import.meta.url),'utf8');
 new vm.Script(src);
 assert.match(src,/gameboys-public-images-v3/);
 assert.doesNotMatch(src,/roms\//);
});
test('Vercel config keeps COOP/COEP and prevents long cache of the cache worker',()=>{
 const cfg=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.ok(cfg.headers.some(h=>h.source==='/image-cache-sw.js'&&h.headers.some(x=>x.key==='Cache-Control'&&x.value==='no-cache')));
 assert.ok(cfg.headers.some(h=>h.headers.some(x=>x.key==='Cross-Origin-Opener-Policy')));
});
