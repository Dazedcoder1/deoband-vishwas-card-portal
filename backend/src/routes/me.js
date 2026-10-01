import { Router } from 'express';
import { many, one, SERVICES } from '../db.js';
import { authenticate, requireRole } from '../lib/auth.js';
import { findCard, serializeCard } from '../lib/cards.js';
import { renderCardPdf } from '../lib/cardPdf.js';

const router = Router();
router.use(authenticate, requireRole('user'));

router.get('/card', async (req, res) => {
  const card = await findCard(req.user.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  const availments = await many('SELECT scheme, facility, amount, status, availed_on AS "availedOn" FROM availments WHERE card_id = @id ORDER BY availed_on DESC LIMIT 20', { id: card.card_id });
  res.json({ card: await serializeCard(card), availments });
});

// ---- Service requests ("Avail this Service") ----
const OPEN = ['requested', 'in_progress'];
const requestCols = `id, service, note, status, admin_note AS "adminNote", created_at AS "createdAt", updated_at AS "updatedAt"`;

router.get('/requests', async (req, res) => {
  const items = await many(`SELECT ${requestCols} FROM service_requests WHERE card_id = @id ORDER BY created_at DESC LIMIT 50`, { id: req.user.cardId });
  res.json({ items });
});

router.post('/requests', async (req, res) => {
  const service = String(req.body.service || '').trim();
  if (!SERVICES.includes(service)) return res.status(400).json({ error: 'Please choose a valid service.' });
  const card = await findCard(req.user.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  if (card.status !== 'verified') return res.status(409).json({ error: 'Your card is still being verified. You can avail services once it is approved.' });

  const open = await one(`SELECT id, status FROM service_requests WHERE card_id = @cardId AND service = @service AND status = ANY(@open) LIMIT 1`,
    { cardId: card.card_id, service, open: OPEN });
  if (open) return res.status(409).json({ error: `You already have an open request for ${service}. Our team will contact you soon.` });

  const item = await one(`INSERT INTO service_requests (card_id, service, note) VALUES (@cardId, @service, @note) RETURNING ${requestCols}`,
    { cardId: card.card_id, service, note: String(req.body.note || '').trim().slice(0, 500) || null });
  console.log(`[request] ${card.card_id} (${card.full_name}) requested "${service}"`);
  res.status(201).json({ item, message: `Request for ${service} received. Our team will contact you on +91 ${card.mobile}.` });
});

router.get('/card/pdf', async (req, res) => {
  const card = await findCard(req.user.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  if (card.status !== 'verified') return res.status(409).json({ error: 'Your card is still being verified. The e-card will be available once approved.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Vishwas-Card-${card.card_id}.pdf"`);
  (await renderCardPdf(card)).pipe(res);
});

export default router;
