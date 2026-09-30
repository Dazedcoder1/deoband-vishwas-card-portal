// PostgreSQL (Neon) data layer.
// Connection string comes from DATABASE_URL in the shared root .env.
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

// Return DATE columns as 'YYYY-MM-DD' strings (no timezone shifting) and BIGINT/COUNT as numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

if (!config.databaseUrl || /YOUR-ENDPOINT|USER:PASSWORD/.test(config.databaseUrl)) {
  console.error(`
[db] DATABASE_URL in your .env is ${config.databaseUrl ? 'still the example placeholder' : 'empty'}.
     1. Neon dashboard → your project → Connect → copy the connection string
     2. Open the .env file in the project root (next to .env.example) and replace the DATABASE_URL line:
        DATABASE_URL=postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require&channel_binding=require
     3. Save the file and run the command again.
`);
  process.exit(1);
}

// Neon gives URLs with sslmode=require. node-postgres already treats that as verify-full (full
// certificate check) but prints a deprecation warning — so we say verify-full explicitly.
// channel_binding=require (also in Neon URLs) is honoured via enableChannelBinding.
function normalizeUrl(raw) {
  const url = new URL(raw);
  const mode = url.searchParams.get('sslmode');
  if (['require', 'prefer', 'verify-ca'].includes(mode)) url.searchParams.set('sslmode', 'verify-full');
  const channelBinding = url.searchParams.get('channel_binding') === 'require';
  url.searchParams.delete('channel_binding');
  return { connectionString: url.toString(), channelBinding };
}
const { connectionString, channelBinding } = normalizeUrl(config.databaseUrl);

export const pool = new pg.Pool({
  connectionString,
  enableChannelBinding: channelBinding,
  max: config.databasePoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});
pool.on('error', (err) => console.error('[db] idle client error', err.message));

/**
 * Run a query with named parameters:  query('SELECT * FROM cards WHERE card_id = @id', { id })
 * Positional arrays work too:         query('SELECT $1::int', [1])
 */
export async function query(text, params = {}) {
  if (Array.isArray(params)) return pool.query(text, params);
  const values = [];
  const index = new Map();
  const sql = text.replace(/(?<![:@\w])@([a-zA-Z_]\w*)/g, (_, name) => {
    if (!(name in params)) throw new Error(`Missing SQL parameter "${name}"`);
    if (!index.has(name)) {
      values.push(params[name]);
      index.set(name, values.length);
    }
    return `$${index.get(name)}`;
  });
  return pool.query(sql, values);
}

export const one = async (text, params) => (await query(text, params)).rows[0];
export const many = async (text, params) => (await query(text, params)).rows;

const SCHEMA = `
CREATE SEQUENCE IF NOT EXISTS card_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id             SERIAL PRIMARY KEY,
  card_id        TEXT NOT NULL UNIQUE,             -- e.g. DBD-1001-2026
  seq            BIGINT NOT NULL,
  full_name      TEXT NOT NULL,
  mobile         VARCHAR(10) NOT NULL,             -- 10 digits, no +91
  voter_id       TEXT,
  dob            DATE,
  gender         TEXT CHECK (gender IN ('male','female','other')),
  ward           TEXT NOT NULL,
  family_members INTEGER NOT NULL DEFAULT 1,
  address        TEXT,
  photo_key      TEXT,                             -- object key in R2 / S3 / local storage
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','suspended')),
  source         TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','online')),
  issued_by      INTEGER REFERENCES admins(id),
  issued_at      TIMESTAMPTZ,
  valid_until    DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cards_mobile ON cards(mobile);
CREATE INDEX IF NOT EXISTS idx_cards_ward   ON cards(ward);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

CREATE TABLE IF NOT EXISTS otps (
  id         SERIAL PRIMARY KEY,
  mobile     VARCHAR(10) NOT NULL,
  card_id    TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL,                      -- unix ms
  created_at BIGINT NOT NULL,                      -- unix ms
  used       BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_otps_lookup ON otps(mobile, card_id);

CREATE TABLE IF NOT EXISTS availments (
  id          SERIAL PRIMARY KEY,
  card_id     TEXT NOT NULL REFERENCES cards(card_id) ON UPDATE CASCADE,
  scheme      TEXT NOT NULL,
  facility    TEXT,
  amount      INTEGER NOT NULL DEFAULT 0,          -- rupees subsidised
  status      TEXT NOT NULL DEFAULT 'completed',
  notes       TEXT,
  availed_on  DATE NOT NULL,
  recorded_by INTEGER REFERENCES admins(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_availments_card ON availments(card_id);
`;

/** Creates tables (idempotent) and syncs the admin account from .env. Call once at startup. */
export async function initDb() {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    const host = (() => { try { return new URL(config.databaseUrl).host; } catch { return '(invalid URL)'; } })();
    const hint = err.code === 'ENOTFOUND' ? `the host "${host}" was not found — check DATABASE_URL is copied completely from Neon`
      : err.code === '28P01' ? 'wrong database password — copy the connection string from Neon again'
      : err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' ? 'could not reach the database — check your internet connection'
      : err.message;
    throw new Error(`Could not connect to PostgreSQL: ${hint}`);
  }
  try {
    // Serialise concurrent boots (e.g. several instances starting at once).
    await client.query('SELECT pg_advisory_lock(772211)');
    await client.query(SCHEMA);

    const existing = (await client.query('SELECT id, password_hash FROM admins WHERE username = $1', [config.admin.username])).rows[0];
    if (!existing) {
      await client.query('INSERT INTO admins (username, password_hash, name) VALUES ($1, $2, $3)', [
        config.admin.username, bcrypt.hashSync(config.admin.password, 10), config.admin.name,
      ]);
      console.log(`[db] Created admin user "${config.admin.username}" from .env`);
    } else if (!bcrypt.compareSync(config.admin.password, existing.password_hash)) {
      await client.query('UPDATE admins SET password_hash = $1, name = $2 WHERE id = $3', [
        bcrypt.hashSync(config.admin.password, 10), config.admin.name, existing.id,
      ]);
      console.log(`[db] Updated admin "${config.admin.username}" password from .env`);
    }
    // Housekeeping: drop OTPs older than a day.
    await client.query('DELETE FROM otps WHERE created_at < $1', [Date.now() - 864e5]);
  } finally {
    await client.query('SELECT pg_advisory_unlock(772211)').catch(() => {});
    client.release();
  }
  const { host } = new URL(config.databaseUrl);
  console.log(`[db] Connected to PostgreSQL at ${host}`);
}

export const WARDS = [
  'Ward 12, Deoband Town',
  'Rankhandi',
  'Bastam',
  'Kailashpur',
  'Jhabiran',
  'Miragpur',
  'Talheri Buzurg',
  'Deoband Rural',
];

export const SCHEMES = [
  'Free Ambulance Transit',
  'Hospital Bill Support (IPD)',
  'Health Check-Up Camps',
  'Essential Medicines Support',
  'Patient Assistance (Mitra)',
  'Community Welfare Support',
];
