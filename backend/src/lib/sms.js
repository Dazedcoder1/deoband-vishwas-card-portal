// SMS gateway. "console" just logs messages (default for development).
// To go live, add your provider's HTTP call in the switch below (MSG91, Fast2SMS, Twilio, …)
// and set SMS_PROVIDER / SMS_API_KEY / SMS_SENDER_ID in the root .env.
import { config } from '../config.js';

export async function sendSms(mobile, message) {
  switch (config.sms.provider) {
    case 'console':
    default:
      console.log(`\n[sms → +91 ${mobile}] ${message}\n`);
      return { delivered: false, provider: 'console' };
  }
}
