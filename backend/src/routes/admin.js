import { Router } from 'express';
import { one, many, query, SCHEMES } from '../db.js';
import { authenticate, requireRole } from '../lib/auth.js';
import { upload } from '../middleware/upload.js';
import { putObject, deleteObject, objectKey } from '../lib/storage.js';
import { sendSms } from '../lib/sms.js';
import { renderCardPdf } from '../lib/cardPdf.js';
import { validateCardInput } from '../lib/validate.js';
import { firstName, findCard, nextCardId, peekCardId, serializeCard, validUntilFrom, verifyUrl, normalizeCardId } from '../lib/cards.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const today = () => new Date().toISOString().slice(0, 10);
const photoKeyFor = (cardId, ext) => objectKey('photos', `${cardId}-${Date.now()}.${ext}`);

// ---------- Dashboard ----------
router.get('/stats', async (req, res) => {
  const s = await one(`
    SELECT
      (SELECT COUNT(*) FROM cards)                                                            AS "totalCards",
      (SELECT COUNT(*) FROM cards WHERE status = 'verified')                                  AS verified,
      (SELECT COUNT(*) FROM cards WHERE status = 'pending')                                   AS pending,
      (SELECT COUNT(*) FROM cards WHERE status = 'verified' AND issued_at >= date_trunc('day', now())) AS "issuedToday",
      (SELECT COUNT(*) FROM availments WHERE availed_on >= date_trunc('month', now()))        AS "availmentsThisMonth",
      (SELECT COALESCE(SUM(amount), 0) FROM availments)                                       AS "subsidisedTotal"`);
  res.json(s);
});

router.get('/next-id', async (req, res) => res.json(await peekCardId()));

// ---------- Cards ----------
function buildFilter(q) {
  const where = [];
  const params = {};
  if (q.search) {
    where.push('(full_name ILIKE @s OR card_id ILIKE @s OR mobile LIKE @s OR voter_id ILIKE @s)');
    params.s = `%${String(q.search).trim()}%`;
  }
  if (q.ward) { where.push('ward = @ward'); params.ward = q.ward; }
  if (q.status) { where.push('status = @status'); params.status = q.status; }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

router.get('/cards', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize, 10) || 10));
  const { sql, params } = buildFilter(req.query);
  const { n: total } = await one(`SELECT COUNT(*) AS n FROM cards ${sql}`, params);
  const rows = await many(`SELECT * FROM cards ${sql} ORDER BY id DESC LIMIT @limit OFFSET @offset`,
    { ...params, limit: pageSize, offset: (page - 1) * pageSize });
  res.json({ total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)),
    items: await Promise.all(rows.map((r) => serializeCard(r, { withPhoto: false }))) });
});

router.get('/cards/export.csv', async (req, res) => {
  const { sql, params } = buildFilter(req.query);
  const cols = ['card_id', 'full_name', 'mobile', 'voter_id', 'ward', 'family_members', 'address', 'status', 'source', 'issued_at', 'valid_until', 'created_at'];
  const rows = await many(`SELECT ${cols.join(', ')} FROM cards ${sql} ORDER BY id`, params);
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // guard against spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="vishwas-beneficiaries-${today()}.csv"`);
  res.send('﻿' + csv);
});

router.get('/cards/:cardId', async (req, res) => {
  const card = await findCard(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  const availments = await many('SELECT * FROM availments WHERE card_id = @id ORDER BY availed_on DESC', { id: card.card_id });
  res.json({ card: await serializeCard(card), availments });
});

// Create + issue a new card (multipart/form-data with optional "photo")
router.post('/cards', upload.single('photo'), async (req, res) => {
  const { data, errors } = validateCardInput(req.body);
  if (errors) return res.status(400).json({ error: errors[0], errors });

  const { seq, cardId } = await nextCardId();
  const photoKey = req.file ? await putObject(photoKeyFor(cardId, req.file.ext), req.file.buffer, req.file.mimetype) : null;

  const now = new Date();
  await query(`INSERT INTO cards (card_id, seq, full_name, mobile, voter_id, dob, gender, ward, family_members, address, photo_key,
                                  status, source, issued_by, issued_at, valid_until)
               VALUES (@cardId, @seq, @fullName, @mobile, @voterId, @dob, @gender, @ward, @familyMembers, @address, @photoKey,
                       'verified', 'admin', @issuedBy, @issuedAt, @validUntil)`,
    { ...data, cardId, seq, photoKey, issuedBy: req.user.adminId, issuedAt: now, validUntil: validUntilFrom(now) });

  res.status(201).json({ card: await serializeCard(await findCard(cardId)) });
});

// Edit details / change status (verify a pending online application, suspend, …)
router.patch('/cards/:cardId', upload.single('photo'), async (req, res) => {
  const card = await findCard(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  const { data, errors } = validateCardInput(req.body, { partial: true });
  if (errors) return res.status(400).json({ error: errors[0], errors });

  const cols = { fullName: 'full_name', mobile: 'mobile', voterId: 'voter_id', dob: 'dob', gender: 'gender', ward: 'ward', familyMembers: 'family_members', address: 'address' };
  const sets = [];
  const params = { id: card.id };
  for (const [k, col] of Object.entries(cols)) if (data[k] !== undefined) { sets.push(`${col} = @${k}`); params[k] = data[k]; }

  if (req.body.status) {
    if (!['pending', 'verified', 'suspended'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
    sets.push('status = @status'); params.status = req.body.status;
    if (req.body.status === 'verified' && !card.issued_at) {
      const now = new Date();
      sets.push('issued_at = @issuedAt', 'valid_until = @validUntil', 'issued_by = @issuedBy');
      Object.assign(params, { issuedAt: now, validUntil: validUntilFrom(now), issuedBy: req.user.adminId });
    }
  }
  if (req.file) {
    params.photoKey = await putObject(photoKeyFor(card.card_id, req.file.ext), req.file.buffer, req.file.mimetype);
    sets.push('photo_key = @photoKey');
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

  await query(`UPDATE cards SET ${sets.join(', ')}, updated_at = now() WHERE id = @id`, params);
  if (req.file && card.photo_key) await deleteObject(card.photo_key);
  res.json({ card: await serializeCard(await findCard(card.card_id)) });
});

router.get('/cards/:cardId/pdf', async (req, res) => {
  const card = await findCard(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${req.query.inline ? 'inline' : 'attachment'}; filename="Vishwas-Card-${card.card_id}.pdf"`);
  (await renderCardPdf(card)).pipe(res);
});

router.post('/cards/:cardId/sms', async (req, res) => {
  const card = await findCard(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  if (card.status !== 'verified') return res.status(409).json({ error: 'Only verified cards can be sent.' });
  const result = await sendSms(card.mobile,
    `Namaste ${firstName(card.full_name)} ji, your Deoband Vishwas Card ${card.card_id} is active. View/verify: ${verifyUrl(card.card_id)} . Login with this mobile number to download your e-card.`);
  res.json({ message: result.delivered ? 'e-Card link sent by SMS.' : 'SMS logged on the server (no SMS provider configured yet).', ...result });
});

// ---------- Scheme availments ----------
router.get('/availments', async (req, res) => {
  const where = [];
  const p = {};
  if (req.query.scheme) { where.push('a.scheme = @scheme'); p.scheme = req.query.scheme; }
  if (req.query.ward) { where.push('c.ward = @ward'); p.ward = req.query.ward; }
  if (req.query.search) { where.push('(c.full_name ILIKE @s OR c.card_id ILIKE @s)'); p.s = `%${req.query.search}%`; }
  if (req.query.family === 'small') where.push('c.family_members <= 2');
  if (req.query.family === 'medium') where.push('c.family_members BETWEEN 3 AND 5');
  if (req.query.family === 'large') where.push('c.family_members >= 6');
  if (req.query.series) { where.push('c.card_id LIKE @series'); p.series = `%-${String(req.query.series).replace(/\D/g, '')}`; }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const items = await many(`
    SELECT a.id, a.card_id AS "cardId", a.scheme, a.facility, a.amount, a.status, a.notes, a.availed_on AS "availedOn",
           c.full_name AS "fullName", c.ward, c.family_members AS "familyMembers"
    FROM availments a JOIN cards c ON c.card_id = a.card_id ${sql}
    ORDER BY a.availed_on DESC, a.id DESC LIMIT 200`, p);
  res.json({ items });
});

router.post('/availments', async (req, res) => {
  const card = await findCard(normalizeCardId(req.body.cardId));
  if (!card) return res.status(404).json({ error: 'No card found with this ID.' });
  if (card.status !== 'verified') return res.status(409).json({ error: 'Benefits can only be recorded for verified cards.' });
  if (!SCHEMES.includes(req.body.scheme)) return res.status(400).json({ error: 'Select a valid scheme.' });
  const row = await one(`
    INSERT INTO availments (card_id, scheme, facility, amount, status, notes, availed_on, recorded_by)
    VALUES (@cardId, @scheme, @facility, @amount, @status, @notes, @availedOn, @by) RETURNING id`, {
    cardId: card.card_id,
    scheme: req.body.scheme,
    facility: String(req.body.facility || '').slice(0, 150) || null,
    amount: Math.max(0, parseInt(req.body.amount, 10) || 0),
    status: req.body.status === 'pending' ? 'pending' : 'completed',
    notes: String(req.body.notes || '').slice(0, 500) || null,
    availedOn: /^\d{4}-\d{2}-\d{2}$/.test(req.body.availedOn || '') ? req.body.availedOn : today(),
    by: req.user.adminId,
  });
  res.status(201).json({ id: row.id });
});

export default router;
