import { timingSafeEqual } from 'node:crypto';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// No delete operation. Only explicitly approved asset prefixes can be migrated.
const CATEGORIES = Object.freeze({
  covers: ['covers/'],
  marquee: ['marquee/'],
  skins: ['skins/'],
  other: ['site-assets/', 'splash/', 'audio/'],
  roms: ['roms/'],
  downloads: ['downloads/']
});
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OCI_NAMESPACE', 'OCI_REGION', 'OCI_BUCKET', 'OCI_ROMS_BUCKET', 'OCI_ACCESS_KEY_ID', 'OCI_SECRET_ACCESS_KEY', 'MIGRATION_ADMIN_TOKEN'];
// Keep a conservative per-request memory/time bound on Vercel. Files larger than this need a streaming/background approach.
const MAX_OBJECT_BYTES = 40 * 1024 * 1024;
const MAX_FILES_LIST = 3000;
const MAX_PAGES_PER_PREFIX = 50;

function send(res, status, obj) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(obj);
}
function authorized(req) {
  const expected = Buffer.from(process.env.MIGRATION_ADMIN_TOKEN || '', 'utf8');
  const supplied = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1] || '';
  const actual = Buffer.from(supplied, 'utf8');
  return expected.length >= 24 && expected.length === actual.length && timingSafeEqual(expected, actual);
}
function categoriesToPrefixes(categories) {
  if (!Array.isArray(categories) || categories.length === 0 || categories.some(c => !Object.hasOwn(CATEGORIES, c))) throw new Error('Invalid categories');
  return [...new Set(categories.flatMap(c => CATEGORIES[c]))];
}
function validateKey(key) {
  if (typeof key !== 'string' || key.length > 1024 || key.startsWith('/') || key.includes('\\') || key.split('/').includes('..') || key.split('/').includes('.')) throw new Error('Invalid object key');
  if (!Object.values(CATEGORIES).flat().some(prefix => key.startsWith(prefix))) throw new Error('File is outside allowed asset folders');
  return key;
}
function destinationBucket(key) {
  return key.startsWith('roms/') || key.startsWith('downloads/') ? process.env.OCI_ROMS_BUCKET : process.env.OCI_BUCKET;
}
function encodedKey(key) { return key.split('/').map(encodeURIComponent).join('/'); }
function s3() {
  return new S3Client({
    region: process.env.OCI_REGION,
    endpoint: `https://${process.env.OCI_NAMESPACE}.compat.objectstorage.${process.env.OCI_REGION}.oraclecloud.com`,
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.OCI_ACCESS_KEY_ID, secretAccessKey: process.env.OCI_SECRET_ACCESS_KEY }
  });
}
async function sbFetch(path, options = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/storage/v1/${path}`, {
    ...options,
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 250)}`);
  return response;
}
async function listPrefix(prefix) {
  const bucket = encodeURIComponent(process.env.SUPABASE_BUCKET || 'gameboysemulator');
  const result = [];
  const pending = [prefix.replace(/\/$/, '')];
  while (pending.length) {
    const folder = pending.shift();
    let offset = 0;
    for (let page = 0; page < MAX_PAGES_PER_PREFIX; page++) {
      const response = await sbFetch(`object/list/${bucket}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: folder, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
      });
      const items = await response.json();
      if (!Array.isArray(items)) throw new Error('Unexpected Supabase list response');
      for (const item of items) {
        if (typeof item.name !== 'string') continue;
        const key = `${folder}/${item.name}`;
        if (item.id == null) pending.push(key);
        else {
          validateKey(key);
          result.push({ key, size: Number(item.metadata?.size ?? 0), contentType: item.metadata?.mimetype || null, destination: destinationBucket(key) });
          if (result.length > MAX_FILES_LIST) throw new Error('Too many files: narrow the selected categories');
        }
      }
      if (items.length < 1000) break;
      offset += items.length;
      if (page === MAX_PAGES_PER_PREFIX - 1) throw new Error(`Too many pages in ${folder}`);
    }
  }
  return result;
}
async function head(client, key) {
  try { return await client.send(new HeadObjectCommand({ Bucket: destinationBucket(key), Key: key })); }
  catch (e) { if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404 || e.name === 'NoSuchKey') return null; throw e; }
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!authorized(req)) return send(res, 401, { error: 'Unauthorized' });
  const missing = REQUIRED.filter(name => !process.env[name]);
  if (missing.length) return send(res, 503, { error: `Missing server environment variables: ${missing.join(', ')}` });
  try {
    const { action } = req.body || {};
    if (action === 'list') {
      const prefixes = categoriesToPrefixes(req.body.categories);
      const groups = await Promise.all(prefixes.map(listPrefix));
      const files = groups.flat();
      if (files.length > MAX_FILES_LIST) throw new Error('Too many files');
      return send(res, 200, { files, count: files.length, bytes: files.reduce((s, f) => s + f.size, 0) });
    }
    if (action !== 'copy' && action !== 'verify') return send(res, 400, { error: 'Unknown action' });
    const key = validateKey(req.body.key);
    const client = s3();
    const existing = await head(client, key);
    if (action === 'verify') {
      if (!existing) return send(res, 200, { key, bucket: destinationBucket(key), status: 'missing' });
      const size = Number(existing.ContentLength ?? -1);
      const expectedSize = Number(req.body.expectedSize);
      return send(res, 200, { key, bucket: destinationBucket(key), status: Number.isFinite(expectedSize) && expectedSize > 0 && size !== expectedSize ? 'size-mismatch' : 'verified', size });
    }
    // Never overwrite an existing key. Compare the existing size before deciding to skip.
    if (existing) {
      const expectedSize = Number(req.body.expectedSize);
      if (expectedSize > 0 && Number(existing.ContentLength) === expectedSize) return send(res, 200, { key, bucket: destinationBucket(key), status: 'skipped', size: Number(existing.ContentLength) });
      return send(res, 409, { error: `Oracle object already exists with different/unknown size: ${key}` });
    }
    if (Number(req.body.expectedSize) > MAX_OBJECT_BYTES) return send(res, 413, { error: 'ไฟล์ใหญ่เกิน 40 MB: ต้องใช้การโอนแบบ streaming แยกต่างหาก' });
    const bucket = encodeURIComponent(process.env.SUPABASE_BUCKET || 'gameboysemulator');
    const source = await sbFetch(`object/${bucket}/${encodedKey(key)}`);
    const contentLength = Number(source.headers.get('content-length') || 0);
    if (contentLength > MAX_OBJECT_BYTES) return send(res, 413, { error: 'File too large for this serverless transfer (40 MB)' });
    const buffer = Buffer.from(await source.arrayBuffer());
    if (buffer.length > MAX_OBJECT_BYTES) return send(res, 413, { error: 'File too large for this serverless transfer (40 MB)' });
    const expectedSize = Number(req.body.expectedSize);
    if (expectedSize > 0 && buffer.length !== expectedSize) return send(res, 409, { error: `Source size changed: ${key}` });
    const contentType = source.headers.get('content-type') || 'application/octet-stream';
    await client.send(new PutObjectCommand({ Bucket: destinationBucket(key), Key: key, Body: buffer, ContentLength: buffer.length, ContentType: contentType, IfNoneMatch: '*' }));
    const target = await head(client, key);
    if (!target || Number(target.ContentLength) !== buffer.length) throw new Error('Upload completed but size verification failed');
    return send(res, 200, { key, bucket: destinationBucket(key), status: 'copied', size: buffer.length });
  } catch (e) {
    const status = e.$metadata?.httpStatusCode === 412 ? 409 : 500;
    return send(res, status, { error: String(e.message || e).slice(0, 450) });
  }
}
export const config = { maxDuration: 60 };