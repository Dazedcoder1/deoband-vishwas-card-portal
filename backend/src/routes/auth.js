import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { one, query } from '../db.js';
import { config } from '../config.js';
import { signToken, authenticate } from '../lib/auth.js';
import { sendOtp } from '../lib/sms.js';
import { verifyWidgetToken } from '../lib/msg91Widget.js';
import { normalizeMobile, isValidMobile, normalizeCardId } from '../lib/cards.js';

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' } });

const hashOtp = (code) => crypto.createHmac('sha256', config.jwtSecret).update(code).digest('hex');

/** Checks mobile + card number belong together. Sends the error response and returns null if not. */
async function findLoginCard(req, res) {
  const mobile = normalizeMobile(req.body.mobile);
  const cardId = normalizeCardId(req.body.cardId);
  if (!isValidMobile(mobile)) { res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' }); return null; }
  if (!cardId) { res.status(400).json({ error: 'Enter your Vishwas Card number.' }); return null; }
  const card = await one('SELECT card_id, full_name, status FROM cards WHERE card_id = @cardId AND mobile = @mobile', { cardId, mobile });
  if (!card) { res.status(404).json({ error: 'No Vishwas Card matches this mobile number and card number.' }); return null; }
  if (card.status === 'suspended') { res.status(403).json({ error: 'This card is suspended. Please contact the helpline.' }); return null; }
  return { mobile, cardId, card };
}

const loginResponse = (card) => {
  const user = { role: 'user', cardId: card.card_id, name: card.full_name };
  return { token: signToken(user), user };
};

const onlyMode = (mode) => (req, res, next) =>
  config.otp.mode === mode ? next() : res.status(400).json({ error: `OTP login is configured for ${config.otp.mode} mode on this server.` });

// ---------------------------------------------------------------------------
// OTP_MODE=widget — MSG91 OTP Widget runs in the browser
// ---------------------------------------------------------------------------

// POST /api/auth/otp/precheck  { mobile, cardId } → confirm the card before the widget sends an OTP
router.post('/otp/precheck', limiter, onlyMode('widget'), async (req, res) => {
  const found = await findLoginCard(req, res);
  if (found) res.json({ ok: true, identifier: `91${found.mobile}` });
});

// POST /api/auth/otp/widget-verify  { mobile, cardId, accessToken }
router.post('/otp/widget-verify', limiter, onlyMode('widget'), async (req, res) => {
  const found = await findLoginCard(req, res);
  if (!found) return;
  const accessToken = String(req.body.accessToken || '');
  if (accessToken.length < 20) return res.status(400).json({ error: 'OTP verification is missing. Please verify the OTP again.' });

  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  if (await one('SELECT 1 AS used FROM used_otp_tokens WHERE token_hash = @tokenHash', { tokenHash })) {
    return res.status(400).json({ error: 'This OTP has already been used. Please request a new one.' });
  }

  let verifiedMobile;
  try {
    verifiedMobile = await verifyWidgetToken(accessToken);
  } catch (err) {
    console.error(`[otp] widget token check failed: ${err.message}`);
    return res.status(err.rejected ? 401 : 502).json({
      error: err.rejected ? 'OTP verification failed or expired. Please request a new OTP.' : 'Could not confirm the OTP with MSG91 right now. Please try again.',
    });
  }
  if (verifiedMobile !== found.mobile) {
    console.warn(`[otp] widget token was for ${verifiedMobile.slice(0, 2)}XXXXXX${verifiedMobile.slice(-2)}, not the card's registered mobile`);
    return res.status(401).json({ error: 'The OTP was verified for a different mobile number.' });
  }

  await query('INSERT INTO used_otp_tokens (token_hash, created_at) VALUES (@tokenHash, @now) ON CONFLICT DO NOTHING', { tokenHash, now: Date.now() });
  res.json(loginResponse(found.card));
});

// ---------------------------------------------------------------------------
// OTP_MODE=server — backend generates the OTP and sends it (MSG91 SendOTP API / console)
// ---------------------------------------------------------------------------

// POST /api/auth/otp/send  { mobile, cardId }
router.post('/otp/send', limiter, onlyMode('server'), async (req, res) => {
  const found = await findLoginCard(req, res);
  if (!found) return;
  const { mobile, cardId } = found;

  const now = Date.now();
  const last = await one('SELECT created_at FROM otps WHERE mobile = @mobile AND card_id = @cardId ORDER BY id DESC LIMIT 1', { mobile, cardId });
  const wait = last ? Math.ceil((last.created_at + config.otp.resendSeconds * 1000 - now) / 1000) : 0;
  if (wait > 0) return res.status(429).json({ error: `Please wait ${wait}s before requesting a new OTP.`, retryAfter: wait });

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await query('UPDATE otps SET used = true WHERE mobile = @mobile AND card_id = @cardId AND used = false', { mobile, cardId });
  const { id: otpId } = await one(`INSERT INTO otps (mobile, card_id, code_hash, expires_at, created_at)
                                   VALUES (@mobile, @cardId, @hash, @expires, @now) RETURNING id`,
    { mobile, cardId, hash: hashOtp(code), expires: now + config.otp.ttlSeconds * 1000, now });

  try {
    await sendOtp(mobile, code);
  } catch (err) {
    console.error(`[sms] OTP to ${mobile} failed: ${err.message}`);
    // Cancel this OTP and allow an immediate retry.
    await query('UPDATE otps SET used = true, created_at = 0 WHERE id = @otpId', { otpId });
    return res.status(502).json({ error: 'We could not send the OTP SMS right now. Please try again in a minute or call the helpline.' });
  }

  res.json({
    message: 'OTP sent to your registered mobile number.',
    resendIn: config.otp.resendSeconds,
    ...(config.otp.devMode ? { devOtp: code } : {}),
  });
});

// POST /api/auth/otp/verify  { mobile, cardId, otp }
router.post('/otp/verify', limiter, onlyMode('server'), async (req, res) => {
  const mobile = normalizeMobile(req.body.mobile);
  const cardId = normalizeCardId(req.body.cardId);
  const otp = String(req.body.otp || '').trim();

  const row = await one('SELECT * FROM otps WHERE mobile = @mobile AND card_id = @cardId AND used = false ORDER BY id DESC LIMIT 1', { mobile, cardId });
  if (!row || row.expires_at < Date.now()) return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  if (row.attempts >= config.otp.maxAttempts) return res.status(429).json({ error: 'Too many wrong attempts. Please request a new OTP.' });

  const ok = crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(row.code_hash));
  if (!ok) {
    await query('UPDATE otps SET attempts = attempts + 1 WHERE id = @id', { id: row.id });
    return res.status(400).json({ error: 'Incorrect OTP. Please check and try again.' });
  }
  await query('UPDATE otps SET used = true WHERE id = @id', { id: row.id });

  const card = await one('SELECT id, card_id, full_name FROM cards WHERE card_id = @cardId', { cardId });
  res.json(loginResponse(card));
});

// POST /api/auth/admin/login  { username, password }
router.post('/admin/login', limiter, async (req, res) => {
  const { username, password } = req.body || {};
  const admin = await one('SELECT * FROM admins WHERE username = @u', { u: String(username || '').trim() });
  if (!admin || !bcrypt.compareSync(String(password || ''), admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid officer username or password.' });
  }
  const user = { role: 'admin', adminId: admin.id, username: admin.username, name: admin.name };
  res.json({ token: signToken(user), user });
});

router.get('/me', authenticate, (req, res) => {
  const { iat, exp, ...user } = req.user;
  res.json({ user });
});

export default router;
