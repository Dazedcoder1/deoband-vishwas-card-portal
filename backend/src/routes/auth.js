import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { one, query } from '../db.js';
import { config } from '../config.js';
import { signToken, authenticate } from '../lib/auth.js';
import { sendOtp } from '../lib/sms.js';
import { normalizeMobile, isValidMobile, normalizeCardId } from '../lib/cards.js';

const router = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' } });

const hashOtp = (code) => crypto.createHmac('sha256', config.jwtSecret).update(code).digest('hex');

// POST /api/auth/otp/send  { mobile, cardId }
router.post('/otp/send', limiter, async (req, res) => {
  const mobile = normalizeMobile(req.body.mobile);
  const cardId = normalizeCardId(req.body.cardId);
  if (!isValidMobile(mobile)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  if (!cardId) return res.status(400).json({ error: 'Enter your Vishwas Card number.' });

  const card = await one('SELECT card_id, status FROM cards WHERE card_id = @cardId AND mobile = @mobile', { cardId, mobile });
  if (!card) return res.status(404).json({ error: 'No Vishwas Card matches this mobile number and card number.' });
  if (card.status === 'suspended') return res.status(403).json({ error: 'This card is suspended. Please contact the helpline.' });

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
router.post('/otp/verify', limiter, async (req, res) => {
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
  const user = { role: 'user', cardId: card.card_id, name: card.full_name };
  res.json({ token: signToken(user), user });
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
