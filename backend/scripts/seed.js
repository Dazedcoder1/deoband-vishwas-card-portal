// Adds a few demo beneficiaries + benefit records so the dashboards have data.
//   npm run seed
import { initDb, one, query, pool } from '../src/db.js';
import { nextCardId, validUntilFrom } from '../src/lib/cards.js';

const demo = [
  { fullName: 'Rajesh Kumar Sharma', mobile: '9876543210', ward: 'Rankhandi', familyMembers: 5, dob: '1982-08-12', status: 'verified', address: 'Main Bazaar, Rankhandi, Deoband' },
  { fullName: 'Sunita Devi', mobile: '9812376540', ward: 'Ward 12, Deoband Town', familyMembers: 4, dob: '1989-05-04', status: 'verified', address: 'H.No. 44, Mohalla Qila, Near Purani Tehsil, Deoband, Saharanpur - 247554' },
  { fullName: 'Mohammad Irfan', mobile: '9923411098', ward: 'Bastam', familyMembers: 6, dob: '1978-11-18', status: 'verified', address: 'Bastam Village, Deoband' },
  { fullName: 'Meenakshi Tyagi', mobile: '9765432189', ward: 'Kailashpur', familyMembers: 3, dob: '1995-03-23', status: 'pending', address: 'Kailashpur, Deoband' },
  { fullName: 'Satish Chandra', mobile: '9412089234', ward: 'Miragpur', familyMembers: 4, dob: '1968-09-15', status: 'verified', address: 'Miragpur, Deoband' },
];

try {
  await initDb();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}

let added = 0;
const ids = {};
for (const d of demo) {
  const exists = await one('SELECT card_id FROM cards WHERE mobile = @mobile AND full_name = @fullName', d);
  if (exists) { ids[d.fullName] = exists.card_id; continue; }
  const { seq, cardId } = await nextCardId();
  const verified = d.status === 'verified';
  const now = new Date();
  await query(`INSERT INTO cards (card_id, seq, full_name, mobile, dob, ward, family_members, address, status, source, issued_at, valid_until)
               VALUES (@cardId, @seq, @fullName, @mobile, @dob, @ward, @familyMembers, @address, @status, 'admin', @issuedAt, @validUntil)`,
    { ...d, cardId, seq, issuedAt: verified ? now : null, validUntil: verified ? validUntilFrom(now) : null });
  ids[d.fullName] = cardId;
  added++;
}

if (added) {
  const iso = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
  const rows = [
    ['Rajesh Kumar Sharma', 'Free Ambulance Transit', 'Dr. B.R. Ambedkar Hospital Deoband', 1800, iso(2)],
    ['Mohammad Irfan', 'Essential Medicines Support', 'Deoband Jan Aushadhi Centre', 650, iso(5)],
    ['Sunita Devi', 'Patient Assistance (Mitra)', 'OPD Helpdesk Deoband Sub-District Hospital', 0, iso(10)],
    ['Satish Chandra', 'Hospital Bill Support (IPD)', 'Dr. B.R. Ambedkar College of Medical Sciences', 14500, iso(8)],
  ];
  for (const [name, scheme, facility, amount, on] of rows) {
    await query('INSERT INTO availments (card_id, scheme, facility, amount, availed_on) VALUES ($1, $2, $3, $4, $5)', [ids[name], scheme, facility, amount, on]);
  }
}

console.log(`Seed complete — ${added} demo beneficiaries added.`);
console.table(Object.entries(ids).map(([name, cardId]) => ({ name, cardId, mobile: demo.find((d) => d.fullName === name).mobile })));
await pool.end();
