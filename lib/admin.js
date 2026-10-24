import { createHash, timingSafeEqual } from 'node:crypto';

// One Vercel-only secret: never return it to clients or commit its value.
const PASSWORD_ENV = 'EMULATOR_ADMIN_PASSWORD';
export function adminConfigured() {
  return typeof process.env[PASSWORD_ENV] === 'string' && process.env[PASSWORD_ENV].length > 0;
}
export function validAdminPassword(password) {
  const secret = process.env[PASSWORD_ENV];
  if (typeof secret !== 'string' || !secret ||
      typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 512) return false;
  const submittedHash = createHash('sha256').update(password, 'utf8').digest();
  const expectedHash = createHash('sha256').update(secret, 'utf8').digest();
  return timingSafeEqual(submittedHash, expectedHash);
}
export function verifyAdmin(req) {
  return validAdminPassword(req?.headers?.['x-emulator-admin']);
}
