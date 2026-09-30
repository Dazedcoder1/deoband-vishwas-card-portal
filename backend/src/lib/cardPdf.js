// Generates a 2-page CR80 (85.6 × 54 mm, standard PVC ID size) PDF:
// page 1 = official card artwork with Card ID + verification QR, page 2 = beneficiary details.
import path from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { BACKEND_ROOT, config } from '../config.js';
import { getObjectBuffer } from './storage.js';
import { verifyUrl } from './cards.js';

const TEMPLATE = path.join(BACKEND_ROOT, 'assets', 'card-template.png');
// Template artwork is 1011 × 639 px. Boxes measured on that artwork:
const ART = { w: 1011, h: 639, idBox: { x: 58, y: 494, w: 277, h: 48 }, qr: { x: 816, y: 458, w: 107, h: 106 } };

const MM = 72 / 25.4;
const PAGE = { w: 85.6 * MM, h: 54 * MM };
const PURPLE = '#3D1E75';
const GOLD = '#C9982E';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export async function renderCardPdf(card) {
  const doc = new PDFDocument({ size: [PAGE.w, PAGE.h], margin: 0, info: { Title: `Vishwas Card ${card.card_id}`, Author: 'Deoband Vishwas Card' } });
  const sx = PAGE.w / ART.w;
  const sy = PAGE.h / ART.h;

  const qrPng = await QRCode.toBuffer(verifyUrl(card.card_id), { margin: 1, width: 400, errorCorrectionLevel: 'M' });

  // ---------- Front ----------
  doc.image(TEMPLATE, 0, 0, { width: PAGE.w, height: PAGE.h });
  const b = ART.idBox;
  doc.roundedRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy, 4 * sx).fill('#FFFFFF');
  doc.fillColor('#111111').font('Helvetica-Bold').fontSize(8.2)
    .text(card.card_id, b.x * sx + 3, b.y * sy + (b.h * sy - 8.2) / 2 + 0.6, { width: b.w * sx - 6, lineBreak: false });
  const q = ART.qr;
  doc.rect(q.x * sx, q.y * sy, q.w * sx, q.h * sy).fill('#FFFFFF');
  doc.image(qrPng, q.x * sx, q.y * sy, { width: q.w * sx, height: q.h * sy });

  // ---------- Back ----------
  doc.addPage({ size: [PAGE.w, PAGE.h], margin: 0 });
  doc.rect(0, 0, PAGE.w, PAGE.h).fill('#FFFFFF');
  doc.rect(0, 0, PAGE.w, 20).fill(PURPLE);
  doc.rect(0, 20, PAGE.w, 1.4).fill(GOLD);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text('DEOBAND VISHWAS CARD', 8, 6.2, { lineBreak: false });
  doc.fillColor('#E5B44E').font('Helvetica-Bold').fontSize(5.2)
    .text('BENEFICIARY DETAILS', 0, 7.6, { width: PAGE.w - 8, align: 'right', lineBreak: false });

  // Photo
  const px = 8, py = 28, pw = 44, ph = 54;
  doc.roundedRect(px - 1, py - 1, pw + 2, ph + 2, 3).lineWidth(1).stroke(GOLD);
  let photoDrawn = false;
  if (card.photo_key) {
    try {
      const buf = await getObjectBuffer(card.photo_key);
      doc.save().roundedRect(px, py, pw, ph, 2.5).clip();
      doc.image(buf, px, py, { cover: [pw, ph], align: 'center', valign: 'center' });
      doc.restore();
      photoDrawn = true;
    } catch (err) {
      console.warn('[pdf] could not embed photo', err.message);
    }
  }
  if (!photoDrawn) {
    doc.roundedRect(px, py, pw, ph, 2.5).fill('#EDE7F6');
    doc.fillColor('#7A7582').font('Helvetica').fontSize(5).text('PHOTO', px, py + ph / 2 - 2.5, { width: pw, align: 'center' });
  }

  // Details
  const rows = [
    ['Name', card.full_name],
    ['Card ID', card.card_id],
    ['Mobile', `+91 ${card.mobile}`],
    ['Village / Ward', card.ward],
    ['Family Members', String(card.family_members)],
    ['Issued', fmtDate(card.issued_at || card.created_at)],
    ['Valid Until', fmtDate(card.valid_until)],
  ];
  let y = 27;
  const lx = 60, vx = 114, vw = PAGE.w - vx - 44;
  for (const [label, value] of rows) {
    doc.fillColor('#7A7582').font('Helvetica').fontSize(5.2).text(label.toUpperCase(), lx, y + 0.6, { lineBreak: false });
    doc.fillColor('#1C1B22').font('Helvetica-Bold').fontSize(6.4).text(value || '—', vx, y, { width: vw, height: 8, ellipsis: true, lineBreak: false });
    y += 9.4;
  }

  // Small QR on back
  doc.image(qrPng, PAGE.w - 40, 30, { width: 32, height: 32 });
  doc.fillColor('#494551').font('Helvetica').fontSize(3.8).text('Scan to verify', PAGE.w - 42, 63.5, { width: 36, align: 'center' });

  // Footer
  doc.rect(0, PAGE.h - 22, PAGE.w, 22).fill('#F6F3FA');
  doc.fillColor(PURPLE).font('Helvetica-Bold').fontSize(5.4)
    .text(`Helpline: ${config.helpline}   •   Valid for ${config.card.constituency.replace(/\s*\(.*\)/, '')} Assembly Constituency`, 8, PAGE.h - 18.5, { width: PAGE.w - 16, lineBreak: false });
  doc.fillColor('#494551').font('Helvetica').fontSize(4.4)
    .text('This card is the property of the Deoband Vishwas Card initiative. If found, please return to the Civic Welfare Desk, GT Road, Deoband.', 8, PAGE.h - 11, { width: PAGE.w - 16, lineBreak: true });

  doc.end();
  return doc;
}
