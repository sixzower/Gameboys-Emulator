import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {S3Client} from '@aws-sdk/client-s3';
import handler from '../api/asset.js';
import upload from '../api/asset-upload.js';
import {validKey} from '../lib/oracle.js';
function response(){return {headers:{},code:200,status(n){this.code=n;return this;},setHeader(k,v){this.headers[k]=v;return this;},json(v){this.body=v;return this;},end(){return this;},send(v){this.body=v;return this;},redirect(n,v){this.code=n;this.location=v;return this;}};}
for(const k of ['OCI_REGION','OCI_NAMESPACE','OCI_BUCKET','OCI_ROMS_BUCKET','OCI_ACCESS_KEY_ID','OCI_SECRET_ACCESS_KEY'])process.env[k]='test';
process.env.SUPABASE_URL='https://opceuxrvzwbzuwzmubsh.supabase.co';
test('reject traversal, arbitrary URLs and save/API namespaces',()=>{for(const s of ['../covers/a','covers/../a','https://example.com/a','saves/player','covers/','covers/\\a','covers/./a'])assert.throws(()=>validKey(s));assert.equal(validKey('covers/a b.png'),'covers/a b.png');});
test('asset API rejects invalid routes without contacting storage',async()=>{const r=response();await handler({method:'GET',query:{key:'saves/a'},headers:{}},r);assert.equal(r.code,400);});
test('missing Oracle copies fall back to the original exact key',async()=>{S3Client.prototype.send=async()=>{throw Object.assign(Error('missing'),{name:'NotFound'});};const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Source unavailable');};const r=response();await handler({method:'GET',query:{key:'covers/missing.png'},headers:{}},r);globalThis.fetch=originalFetch;assert.equal(r.code,307);assert.equal(r.headers['X-Asset-Storage'],'supabase-fallback');assert.match(r.location,/supabase.co\/storage\/v1\/object\/public\/gameboysemulator\/covers\/missing.png$/);});
test('small Oracle images preserve exact bytes, MIME, length and CDN caching',async()=>{S3Client.prototype.send=async c=>c.constructor.name==='HeadObjectCommand'?{ContentLength:3,ContentType:'image/png',ETag:'"abc"'}:{Body:{transformToByteArray:async()=>new Uint8Array([1,2,3])}};const r=response();await handler({method:'GET',query:{key:'covers/exact.png'},headers:{}},r);assert.equal(r.code,200);assert.deepEqual([...r.body],[1,2,3]);assert.equal(r.headers['X-Asset-Storage'],'oracle');assert.match(r.headers['Cache-Control'],/s-maxage=86400/);assert.equal(r.headers['Content-Length'],'3');});
test('conditional request returns 304 without transferring the object',async()=>{let calls=0;S3Client.prototype.send=async()=>{calls++;return {ContentLength:3,ContentType:'image/png',ETag:'"304"'};};const r=response();await handler({method:'GET',query:{key:'covers/conditional.png'},headers:{'if-none-match':'"304"'}},r);assert.equal(r.code,304);assert.equal(calls,1);});
test('anonymous writes and deletes are rejected',async()=>{for(const method of ['PUT','DELETE']){const r=response();await upload({method,query:{key:'covers/denied.png'},headers:{}},r);assert.equal(r.code,401);}});
test('client maps public assets only, preserves external ROM URLs and old providers',()=>{const window={addEventListener(){}};vm.runInNewContext(fs.readFileSync(new URL('../oracle-client.js',import.meta.url),'utf8'),{window,navigator:{}});const fn=window.OracleAssets.url;assert.equal(fn('covers/a.png'),'/api/asset?key=covers%2Fa.png');assert.equal(fn('oci:marquee/a b.jpg'),'/api/asset?key=marquee%2Fa%20b.jpg');assert.equal(fn('r2:roms/a.gba'),'r2:roms/a.gba');assert.equal(fn('https://example.com/roms/a.3ds'),'https://example.com/roms/a.3ds');assert.equal(fn('saves/player'),'saves/player');});

test('recovers a missing public image without overwriting or deleting the source',async()=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(new Uint8Array([7,8,9]),{headers:{'content-type':'image/png','content-length':'3'}});
 let headCount=0,writes=0;S3Client.prototype.send=async c=>{if(c.constructor.name==='HeadObjectCommand'){if(!headCount++)throw Object.assign(Error('missing'),{name:'NotFound'});return {ContentLength:3,ContentType:'image/png'};}if(c.constructor.name==='PutObjectCommand'){writes++;assert.equal(c.input.IfNoneMatch,'*');assert.deepEqual([...c.input.Body],[7,8,9]);return {};}if(c.constructor.name==='GetObjectCommand')return {Body:{transformToByteArray:async()=>new Uint8Array([7,8,9])}};throw Error('Unexpected storage mutation');};
 try{const r=response();await handler({method:'GET',query:{key:'covers/recover.png'},headers:{}},r);assert.equal(r.code,200);assert.equal(writes,1);assert.equal(r.headers['X-Asset-Storage'],'oracle');}finally{globalThis.fetch=originalFetch;}
});
