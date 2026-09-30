import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { one, many, query, WARDS, SCHEMES } from '../db.js';
import { config } from '../config.js';
import { upload } from '../middleware/upload.js';
import { putObject, objectKey } from '../lib/storage.js';
import { sendTemplate } from '../lib/sms.js';
import { findCard, maskMobile, maskName, nextCardId, normalizeMobile, isValidMobile } from '../lib/cards.js';
import { validateCardInput } from '../lib/validate.js';

const router = Router();

router.get('/meta', (req, res) => {
  res.json({ wards: WARDS, schemes: SCHEMES, constituency: config.card.constituency, cardPrefix: config.card.prefix });
});

router.get('/stats', async (req, res) => {
  const total = (await one("SELECT COUNT(*) AS n FROM cards WHERE status = 'verified'")).n;
  res.json({ enrolled: total, networkCenters: 18 });
});

// Public verification (what the QR code on the card opens). Deliberately returns masked data only.
router.get('/verify/:cardId', async (req, res) => {
  const card = await findCard(req.params.cardId);
  if (!card) return res.status(404).json({ valid: false, error: 'No card found with this ID.' });
  const expired = card.valid_until && new Date(card.valid_until) < new Date();
  res.json({
    valid: card.status === 'verified' && !expired,
    status: expired ? 'expired' : card.status,
    cardId: card.card_id,
    name: maskName(card.full_name),
    mobile: maskMobile(card.mobile),
    ward: card.ward,
    familyMembers: card.family_members,
    validUntil: card.valid_until,
    constituency: config.card.constituency,
  });
});

// Online application — creates a card in "pending" state for the admin desk to verify.
const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many applications from this device. Please try again later.' } });

router.post('/apply', applyLimiter, upload.single('photo'), async (req, res) => {
  const { data, errors } = validateCardInput(req.body);
  if (errors) return res.status(400).json({ error: errors[0], errors });
  const dup = await one("SELECT card_id FROM cards WHERE mobile = @mobile AND lower(full_name) = lower(@fullName) AND status <> 'suspended'", data);
  if (dup) return res.status(409).json({ error: `An application already exists for this name and mobile (${dup.card_id}).` });

  const { seq, cardId } = await nextCardId();
  let photoKey = null;
  if (req.file) photoKey = await putObject(objectKey('photos', `${cardId}-${Date.now()}.${req.file.ext}`), req.file.buffer, req.file.mimetype);

  await query(`INSERT INTO cards (card_id, seq, full_name, mobile, voter_id, dob, gender, ward, family_members, address, photo_key, status, source)
               VALUES (@cardId, @seq, @fullName, @mobile, @voterId, @dob, @gender, @ward, @familyMembers, @address, @photoKey, 'pending', 'online')`,
    { ...data, cardId, seq, photoKey });

  res.status(201).json({ cardId, message: 'Application received. Our civic desk will verify it within 24 business hours.' });
});

// Helps users who forgot their card number (the "Find Card ID?" link).
router.post('/find-card', applyLimiter, async (req, res) => {
  const mobile = normalizeMobile(req.body.mobile);
  if (!isValidMobile(mobile)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
  const rows = await many('SELECT card_id FROM cards WHERE mobile = @mobile', { mobile });
  // We do not reveal card numbers on screen — they are sent by SMS.
  if (rows.length) {
    const ids = rows.map((r) => r.card_id).join(', ');
    await sendTemplate('cardId', mobile, { var1: ids }, `Your Deoband Vishwas Card number(s): ${ids}`)
      .catch((err) => console.error(`[sms] find-card SMS failed: ${err.message}`));
  }
  res.json({ message: 'If this number is registered, your card number has been sent to it by SMS.' });
});

export default router;
