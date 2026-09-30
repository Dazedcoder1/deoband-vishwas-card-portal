// Loads the ONE shared .env file that lives at the repository root
// (../.env relative to /backend). The frontend reads the same file via Vite's envDir.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

dotenv.config({ path: path.join(REPO_ROOT, '.env'), quiet: true });

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: int(process.env.PORT, 5000),
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Neon / any PostgreSQL connection string
  databaseUrl: process.env.DATABASE_URL || '',
  databasePoolMax: int(process.env.DATABASE_POOL_MAX, 10),

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    name: process.env.ADMIN_NAME || 'Constituency Administrator',
  },

  otp: {
    devMode: bool(process.env.OTP_DEV_MODE, !isProd),
    ttlSeconds: int(process.env.OTP_TTL_SECONDS, 300),
    resendSeconds: int(process.env.OTP_RESEND_SECONDS, 45),
    maxAttempts: 5,
  },

  card: {
    prefix: (process.env.CARD_ID_PREFIX || 'DBD').toUpperCase(),
    validityYears: int(process.env.CARD_VALIDITY_YEARS, 2),
    constituency: process.env.CONSTITUENCY_NAME || 'Deoband (04)',
  },

  // S3-compatible object storage. R2_* names are used first; the standard AWS_* names
  // (what most S3 dashboards give you, e.g. AWS_ENDPOINT_URL) work as a fallback.
  r2: {
    endpoint: process.env.R2_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3 || process.env.AWS_ENDPOINT_URL || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || '',
    region: process.env.R2_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'auto',
    forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, true),
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
  },
  // Folder inside the bucket where files go, e.g. "uploads" → uploads/photos/DBD-1001-2026-….jpg
  storagePrefix: (process.env.STORAGE_PREFIX ?? 'uploads').replace(/^\/+|\/+$/g, ''),

  // "r2" | "local" | "auto" (auto = R2 when all R2 vars are set, else local disk)
  storageDriver: (process.env.STORAGE_DRIVER || 'auto').toLowerCase(),
  localUploadDir: path.resolve(BACKEND_ROOT, process.env.LOCAL_UPLOAD_DIR || './uploads'),

  sms: {
    provider: (process.env.SMS_PROVIDER || 'console').toLowerCase(), // "msg91" | "console"
    msg91: {
      authKey: process.env.MSG91_AUTH_KEY || '',
      otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID || '',
      ecardTemplateId: process.env.MSG91_ECARD_TEMPLATE_ID || '',
      cardIdTemplateId: process.env.MSG91_CARDID_TEMPLATE_ID || '',
      baseUrl: process.env.MSG91_BASE_URL || 'https://control.msg91.com',
    },
  },

  helpline: process.env.VITE_HELPLINE || '1800-120-DEOBAND',
};

if (config.isProd && config.jwtSecret.startsWith('dev-only')) {
  console.error('[config] JWT_SECRET must be set in production. Refusing to start.');
  process.exit(1);
}
