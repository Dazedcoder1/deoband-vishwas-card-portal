// SMS gateway — MSG91 (https://msg91.com) or "console" (prints messages in the backend terminal).
//
// OTP:   our backend generates + verifies the code (hashed, expiry, attempt limits);
//        MSG91's SendOTP API only delivers it, using your DLT-approved OTP template (##OTP##).
// Other: e-card link and "find my card" messages use MSG91's Flow API with DLT templates
//        whose variables are ##var1##, ##var2##, ##var3##.
import { config } from '../config.js';

const { msg91 } = config.sms;
const withCountryCode = (mobile) => `91${String(mobile).replace(/\D/g, '').slice(-10)}`;

async function msg91Request(path, { method = 'POST', query = {}, body } = {}) {
  const url = new URL(path, msg91.baseUrl);
  Object.entries(query).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, v));
  const res = await fetch(url, {
    method,
    headers: { authkey: msg91.authKey, accept: 'application/json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.type === 'error') {
    throw new Error(`MSG91: ${data.message || `HTTP ${res.status}`}`);
  }
  return data;
}

const logToConsole = (mobile, text) => {
  console.log(`\n[sms → +91 ${mobile}] ${text}\n`);
  return { delivered: false, provider: 'console' };
};

/** Deliver a login OTP. Throws if MSG91 rejects it, so the caller can tell the user. */
export async function sendOtp(mobile, code) {
  const minutes = Math.max(1, Math.round(config.otp.ttlSeconds / 60));
  if (config.sms.provider !== 'msg91') {
    return logToConsole(mobile, `${code} is your Deoband Vishwas Card login OTP. Valid for ${minutes} minutes.`);
  }
  const data = await msg91Request('/api/v5/otp', {
    query: {
      template_id: msg91.otpTemplateId,
      mobile: withCountryCode(mobile),
      otp: code,
      otp_expiry: minutes,
    },
  });
  return { delivered: true, provider: 'msg91', requestId: data.request_id || data.message };
}

/**
 * Send a templated (Flow) SMS. `kind` picks the template from .env:
 *   'ecard'  → MSG91_ECARD_TEMPLATE_ID   vars: var1 = name, var2 = card ID, var3 = verify link
 *   'cardId' → MSG91_CARDID_TEMPLATE_ID  vars: var1 = card number(s)
 * Falls back to printing `fallbackText` in the terminal when MSG91 isn't set up for that template.
 */
export async function sendTemplate(kind, mobile, vars, fallbackText) {
  const templateId = { ecard: msg91.ecardTemplateId, cardId: msg91.cardIdTemplateId }[kind];
  if (config.sms.provider !== 'msg91' || !templateId) return logToConsole(mobile, fallbackText);
  const data = await msg91Request('/api/v5/flow', {
    body: { template_id: templateId, short_url: '0', recipients: [{ mobiles: withCountryCode(mobile), ...vars }] },
  });
  return { delivered: true, provider: 'msg91', requestId: data.message };
}

if (config.otp.mode === 'widget') {
  const missing = [['MSG91_AUTH_KEY', msg91.authKey], ['MSG91_WIDGET_ID', msg91.widgetId], ['MSG91_WIDGET_TOKEN_AUTH', msg91.widgetTokenAuth]]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`[otp] OTP_MODE=widget but ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing in .env`);
    process.exit(1);
  }
  console.log(`[otp] Using MSG91 OTP Widget ${msg91.widgetId}`);
}

if (config.sms.provider === 'msg91') {
  const required = [['MSG91_AUTH_KEY', msg91.authKey]];
  if (config.otp.mode === 'server') required.push(['MSG91_OTP_TEMPLATE_ID', msg91.otpTemplateId]);
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`[sms] SMS_PROVIDER=msg91 but ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} missing in .env`);
    process.exit(1);
  }
  console.log(`[sms] Using MSG91${config.otp.mode === 'server' ? ` (OTP template ${msg91.otpTemplateId})` : ''}${msg91.ecardTemplateId ? ', e-card template set' : ''}`);
} else {
  console.log('[sms] SMS_PROVIDER=console — messages are printed here, not sent');
}
