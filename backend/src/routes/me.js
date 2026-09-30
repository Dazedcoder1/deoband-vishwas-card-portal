import { Router } from 'express';
import { many } from '../db.js';
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

router.get('/card/pdf', async (req, res) => {
  const card = await findCard(req.user.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  if (card.status !== 'verified') return res.status(409).json({ error: 'Your card is still being verified. The e-card will be available once approved.' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Vishwas-Card-${card.card_id}.pdf"`);
  (await renderCardPdf(card)).pipe(res);
});

export default router;
