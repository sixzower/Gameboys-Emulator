import { adminConfigured, verifyAdmin } from '../lib/admin.js';

const DEFAULT_SUPABASE_URL = 'https://opceuxrvzwbzuwzmubsh.supabase.co';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!adminConfigured()) return res.status(503).json({ ok: false, error: 'ระบบแอดมินยังไม่ได้ตั้งค่าบน Vercel' });
  if (!verifyAdmin(req)) return res.status(401).json({ ok: false, error: 'กรุณาเข้าสู่ระบบแอดมินอีกครั้ง' });

  // Retain Supabase only for its database, not for password verification.
  // Mirrors the old RPC: deletes public.play_sessions ONLY; no games or saves are touched.
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return res.status(503).json({ ok: false, error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าเชื่อมต่อฐานข้อมูล' });
    const url = new URL(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) throw Error('Invalid Supabase URL');
    url.pathname = '/rest/v1/play_sessions';
    url.search = '';
    url.searchParams.set('id', 'not.is.null');
    url.searchParams.set('select', 'id');
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=representation',
      },
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) throw Error('Database HTTP ' + response.status);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw Error('Unexpected database response');
    return res.status(200).json({ ok: true, deleted: rows.length });
  } catch (error) {
    console.error('Reset stats failed:', error?.message);
    return res.status(502).json({ ok: false, error: 'รีเซ็ตสถิติไม่สำเร็จ กรุณาลองใหม่' });
  }
}
