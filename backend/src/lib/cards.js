import { one } from '../db.js';
import { config } from '../config.js';
import { getViewUrl } from './storage.js';
import { publicAppUrl } from './publicUrl.js';

export const normalizeMobile = (m) => String(m || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
export const isValidMobile = (m) => /^[6-9]\d{9}$/.test(m);
export const normalizeCardId = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '');

const formatCardId = (seq) => `${config.card.prefix}-${seq}-${new Date().getFullYear()}`;

/** Reserve the next sequential ID, e.g. DBD-1001-2026 (Postgres sequence → safe under concurrency). */
export async function nextCardId() {
  const { seq } = await one("SELECT nextval('card_seq') AS seq");
  return { seq, cardId: formatCardId(seq) };
}

/** Preview the ID the next card will get, without reserving it (for the admin "draft ID"). */
export async function peekCardId() {
  const { last_value: last, is_called: called } = await one('SELECT last_value, is_called FROM card_seq');
  const seq = called ? last + 1 : last;
  return { seq, cardId: formatCardId(seq) };
}

export function validUntilFrom(date = new Date()) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + config.card.validityYears);
  return d.toISOString().slice(0, 10);
}

const HONORIFICS = /^(smt|shri|shrimati|sri|mr|mrs|ms|miss|dr|km|kumari|md|mohd)\.?$/i;
export const firstName = (n) => String(n || '').split(/\s+/).filter((w) => w && !HONORIFICS.test(w))[0] || String(n || '').trim();

export const verifyUrl = (cardId) => `${publicAppUrl}/verify/${encodeURIComponent(cardId)}`;

export const maskMobile = (m) => (m ? `${m.slice(0, 2)}XXXXXX${m.slice(-2)}` : '');
export const maskName = (n) =>
  String(n || '')
    .split(/\s+/)
    .filter((w) => w && !HONORIFICS.test(w))
    .map((w, i) => (i === 0 ? w : `${w[0]}.`))
    .join(' ');

/** Shape a DB row for API responses. */
export async function serializeCard(row, { withPhoto = true } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    cardId: row.card_id,
    fullName: row.full_name,
    mobile: row.mobile,
    voterId: row.voter_id,
    dob: row.dob,
    gender: row.gender,
    ward: row.ward,
    familyMembers: row.family_members,
    address: row.address,
    status: row.status,
    source: row.source,
    issuedAt: row.issued_at,
    validUntil: row.valid_until,
    createdAt: row.created_at,
    constituency: config.card.constituency,
    verifyUrl: verifyUrl(row.card_id),
    photoUrl: withPhoto && row.photo_key ? await getViewUrl(row.photo_key) : null,
  };
}

export const findCard = (cardId) => one('SELECT * FROM cards WHERE card_id = @id', { id: normalizeCardId(cardId) });
