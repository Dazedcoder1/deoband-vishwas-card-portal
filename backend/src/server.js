import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { config, REPO_ROOT } from './config.js';
import { initDb, pool } from './db.js';
import { publicAppUrl, publicUrlSource } from './lib/publicUrl.js';
import { driver as storageDriver, checkStorage } from './lib/storage.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: config.clientOrigins, credentials: false }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  const out = { ok: true, env: config.env, database: { ok: true }, storage: { driver: storageDriver, ok: true } };
  try { await pool.query('SELECT 1'); } catch (err) { out.ok = false; out.database = { ok: false, error: err.code || err.message }; }
  try { out.storage = await checkStorage(); } catch (err) { out.ok = false; out.storage = { driver: storageDriver, ok: false, error: err.name || err.message }; }
  res.status(out.ok ? 200 : 503).json(out);
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);

// Local-disk uploads (only used when R2 is not configured)
if (storageDriver === 'local') {
  app.use('/api/files', express.static(config.localUploadDir, { fallthrough: false, maxAge: '1h' }));
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// In production the backend can also serve the built frontend (single deployment).
const dist = path.join(REPO_ROOT, 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1d' }));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be smaller than 5 MB.' : err.message });
  }
  if (err?.message?.startsWith('Photo must')) return res.status(400).json({ error: err.message });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

try {
  await initDb();
} catch (err) {
  console.error(`[db] ${err.message}`);
  console.error('     Check DATABASE_URL in the root .env (Neon dashboard → Connect → connection string).');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`[api] Deoband Vishwas Card API running on http://localhost:${config.port} (${config.env})`);
  console.log(`[api] QR codes & SMS links point to ${publicAppUrl} (${publicUrlSource})`);
  if (config.otp.devMode) console.log('[api] OTP_DEV_MODE is ON — OTPs are shown in API responses. Turn it off in production.');
});

const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
