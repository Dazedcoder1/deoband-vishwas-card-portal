// Server-side check for the MSG91 OTP Widget.
// The browser verifies the OTP with MSG91 and gets an access token; we ask MSG91 whether that
// token is genuine and find out WHICH mobile number it proves. We fail closed: if MSG91 doesn't
// confirm the token, or we can't tell which number it belongs to, the login is refused.
import { config } from '../config.js';

const { msg91 } = config.sms;
const last10 = (v) => String(v ?? '').replace(/\D/g, '').slice(-10);
const isMobile = (v) => /^(91)?[6-9]\d{9}$/.test(String(v ?? '').replace(/\D/g, ''));

function decodeJwtPayload(token) {
  try {
    const part = String(token).split('.')[1];
    return part ? JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) : null;
  } catch {
    return null;
  }
}

function findMobile(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return null;
  for (const key of ['mobile', 'phone', 'identifier', 'number', 'msisdn', 'mobile_number', 'phone_number']) {
    if (isMobile(obj[key])) return last10(obj[key]);
  }
  for (const v of Object.values(obj)) {
    const found = typeof v === 'object' ? findMobile(v, depth + 1) : null;
    if (found) return found;
  }
  return null;
}

/** Returns the 10-digit mobile number MSG91 verified for this token. Throws if not verified. */
export async function verifyWidgetToken(accessToken) {
  if (!msg91.authKey) throw new Error('MSG91_AUTH_KEY is not set');
  const res = await fetch(new URL('/api/v5/widget/verifyAccessToken', msg91.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ authkey: msg91.authKey, 'access-token': accessToken }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data.type).toLowerCase() !== 'success') {
    const err = new Error(`MSG91 rejected the token: ${data.message || `HTTP ${res.status}`}`);
    err.rejected = true;
    throw err;
  }
  // Prefer the number MSG91 reports; only then fall back to the (now MSG91-confirmed) token's payload.
  const mobile = findMobile(data) || (isMobile(data.message) ? last10(data.message) : null) || findMobile(decodeJwtPayload(accessToken));
  if (!mobile) throw new Error('MSG91 confirmed the token but no mobile number could be read from it');
  return mobile;
}

export const widgetConfigured = () => Boolean(msg91.widgetId && msg91.widgetTokenAuth && msg91.authKey);
