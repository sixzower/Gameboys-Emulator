import { adminConfigured, validAdminPassword } from '../lib/admin.js';

// Per-instance throttling; Vercel Firewall/distributed rate limits are recommended in production.
const failures = new Map();
const WINDOW_MS = 5 * 60_000;
const MAX_FAILURES = 8;
const MAX_TRACKED = 2048;
function clientKey(req) {
  const forwarded = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!adminConfigured()) {
    return res.status(503).json({ ok: false, error: 'ระบบล็อกอินยังไม่ได้ตั้งค่า EMULATOR_ADMIN_PASSWORD บน Vercel' });
  }
  const key = clientKey(req), now = Date.now();
  let entry = failures.get(key);
  if (entry && now - entry.started >= WINDOW_MS) { failures.delete(key); entry = undefined; }
  if (entry && entry.count >= MAX_FAILURES) {
    res.setHeader('Retry-After', String(Math.ceil((WINDOW_MS - (now - entry.started)) / 1000)));
    return res.status(429).json({ ok: false, error: 'ลองรหัสผิดหลายครั้ง กรุณาลองใหม่ในอีกสักครู่' });
  }
  if (typeof req.body?.password !== 'string' || Buffer.byteLength(req.body.password, 'utf8') > 512) {
    return res.status(400).json({ ok: false, error: 'รูปแบบรหัสผ่านไม่ถูกต้อง' });
  }
  if (!validAdminPassword(req.body.password)) {
    if (failures.size >= MAX_TRACKED) failures.delete(failures.keys().next().value);
    failures.set(key, entry ? { ...entry, count: entry.count + 1 } : { count: 1, started: now });
    return res.status(401).json({ ok: false, error: 'รหัสผ่านไม่ถูกต้อง' });
  }
  failures.delete(key);
  return res.status(200).json({ ok: true });
}
