// Sends a test OTP through MSG91 to check your SMS setup.
//   npm run check:sms -- 9876543210
import crypto from 'node:crypto';
import { config } from '../src/config.js';
import { sendOtp } from '../src/lib/sms.js';

const mobile = String(process.argv[2] || '').replace(/\D/g, '').slice(-10);
if (!/^[6-9]\d{9}$/.test(mobile)) {
  console.error('Usage: npm run check:sms -- <10-digit mobile number>');
  process.exit(1);
}
if (config.sms.provider !== 'msg91') {
  console.error('SMS_PROVIDER is not "msg91" in .env — set SMS_PROVIDER=msg91 plus MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID.');
  process.exit(1);
}
const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
try {
  const r = await sendOtp(mobile, code);
  console.log(`✓ MSG91 accepted the OTP for +91 ${mobile} (request ${r.requestId}). The phone should receive ${code} shortly.`);
} catch (err) {
  console.error(`✗ ${err.message}`);
  if (/auth/i.test(err.message)) console.error('  → Check MSG91_AUTH_KEY (MSG91 dashboard → Authkey).');
  if (/template/i.test(err.message)) console.error('  → Check MSG91_OTP_TEMPLATE_ID (SendOTP → Templates) and that the DLT template is approved.');
  process.exit(1);
}
