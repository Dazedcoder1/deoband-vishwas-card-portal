# Deoband Vishwas Card

Citizen healthcare & welfare card portal for the Deoband Assembly constituency — built from the Stitch designs (homepage, login, citizen dashboard, admin console).

| Folder | What it is |
| --- | --- |
| `frontend/` | React 19 + Vite + Tailwind CSS (design tokens from the “Sovereign Trust Portal” design system) |
| `backend/` | Node.js + Express 5 API, **Neon PostgreSQL** database, Cloudflare R2 (S3) photo storage, PDF card generator |
| `.env` | **One** shared environment file for both apps (git-ignored). Template: `.env.example` |

## Features

- **Homepage** — hero with the official card artwork, key services, “why choose”, 3-step how-to, footer.
- **Citizen login** — mobile number + card number + 6-digit OTP sent by **MSG91** (hashed, 5-min expiry, 45 s resend, 5 attempts).
- **Citizen dashboard** — live card with Card ID + verification QR, e-card PDF download, share link, benefits availed, 9 welfare services.
- **Admin console** (username/password, JWT)
  - *Make New ID* — register a beneficiary, upload photo (→ R2), auto card ID `DBD-1001-2026`, live preview, **Print PVC card**, **SMS e-card link**, **Download PDF**.
  - *Existing DB* — search/filter/paginate, review & approve online applications, edit, suspend, replace photo, **Export CSV**.
  - *Search & Availment* — record and audit scheme benefits (ambulance, IPD bills, medicines, camps…).
- **Online application** (`/apply`) — citizens apply themselves; arrives as *Pending KYC* for the admin desk.
- **Public verification** (`/verify/:cardId`) — what the QR code on the card opens; shows masked details only.
- **PDF card** — 2-page CR80 (85.6 × 54 mm, standard PVC size): front artwork with ID + QR, back with photo & details.

## Quick start

Requires **Node.js 20+**.

```bash
# 1. install both apps (npm workspaces)
npm install

# 2. environment
cp .env.example .env        # then paste your Neon DATABASE_URL + R2 keys into .env

# 3. create the tables in Neon (also happens automatically when the API starts)
npm run db:migrate

# 4. (optional) demo beneficiaries so the dashboards have data
npm run seed

# 5. run backend (http://localhost:5000) + frontend (http://localhost:5173) together
npm run dev
```

Open http://localhost:5173

- **Admin login:** Login → *Admin Login* → `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (default `admin` / `Admin@123` — change it).
- **Citizen login:** after `npm run seed`, use mobile `9876543210` + card `DBD-1001-2026`. With `OTP_DEV_MODE=true` the OTP is shown on screen and printed in the backend terminal.

## The shared `.env`

Both apps read the single `.env` at the repo root:

- **Backend** loads it with `dotenv` (`backend/src/config.js`).
- **Frontend** uses Vite's `envDir: '..'` (`frontend/vite.config.js`). Vite only exposes variables that start with **`VITE_`** to the browser, so R2 keys, JWT secret etc. never reach the client bundle. **Never put a secret in a `VITE_` variable.**

See `.env.example` for every variable with comments.

## Neon database setup

1. In the Neon dashboard open your project → **Connect** → copy the connection string (the *pooled* one is fine).
2. Paste it into `.env` as it is:
   ```
   DATABASE_URL=postgresql://neondb_owner:<password>@ep-xxxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
   `sslmode=require` and `channel_binding=require` are handled automatically (full TLS certificate check + SCRAM channel binding).
3. `npm run db:migrate` — creates `admins`, `cards`, `availments`, `otps` and the `card_seq` sequence (card numbers start at 1001). Safe to run repeatedly.
4. `GET /api/health` shows `"database": { "ok": true }` when connected.

## MSG91 SMS setup (OTP login)

The backend creates and checks each OTP itself (hashed, expiry, attempt limits); MSG91 only delivers it.

1. **MSG91 dashboard → Authkey** → copy it into `MSG91_AUTH_KEY`.
2. **SendOTP → Templates → Create** an OTP template that contains `##OTP##`, e.g.
   `##OTP## is your Deoband Vishwas Card login OTP. Do not share it. - <SENDER>`
   It must match a DLT-approved template (TRAI rule for SMS in India). Copy the **Template ID** into `MSG91_OTP_TEMPLATE_ID`.
3. Optional **Flow templates** (SMS → Templates) for the other messages:
   - `MSG91_ECARD_TEMPLATE_ID` — e-card link sent from the admin console. Variables: `##var1##` name, `##var2##` card ID, `##var3##` verify link.
   - `MSG91_CARDID_TEMPLATE_ID` — "Find Card ID?" on the login page. Variable: `##var1##` card number(s).
   Leave them empty and those messages are just printed in the backend terminal.
4. Set `SMS_PROVIDER=msg91`, then test: `npm run check:sms -- 98XXXXXXXX` (sends a real test OTP).
5. Once real SMS arrive, set `OTP_DEV_MODE=false` so the OTP is no longer shown on screen.

If MSG91 rejects a message the citizen sees *"We could not send the OTP SMS right now"*, the failed OTP is cancelled so they can retry straight away, and the reason is logged in the backend terminal.

## Cloudflare R2 setup

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `vishwas-card`). Keep it private.
2. R2 → **Manage R2 API Tokens** → *Create API token* with **Object Read & Write** on that bucket.
3. Copy into `.env`:
   ```
   R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=assets
   STORAGE_DRIVER=r2
   ```
   If your provider gives you the standard names instead (`AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_REGION`), those work too. Path-style addressing (`S3_FORCE_PATH_STYLE=true`) is on by default.
4. Test it: `npm run check:r2` (uploads, reads and deletes a test file).

Photos are stored as `uploads/photos/<CARD-ID>-<timestamp>.jpg` (change the folder with `STORAGE_PREFIX`). With a private bucket the API hands the browser short-lived signed URLs. If you connect a public custom domain to the bucket, set `R2_PUBLIC_URL` instead.

Until real keys are in place, keep `STORAGE_DRIVER=local` — photos go to `backend/uploads/` so everything still works.

## Going to production

1. `NODE_ENV=production`, a long random `JWT_SECRET`, a strong `ADMIN_PASSWORD`.
2. `SMS_PROVIDER=msg91` with your MSG91 keys, and `OTP_DEV_MODE=false`.
3. `CLIENT_URL=https://your-domain` (used for CORS and the QR/SMS verify links).
4. `npm run build` then `npm start` — the backend also serves `frontend/dist`, so one Node process runs the whole site.
   Or host the frontend separately (Cloudflare Pages / Vercel) and set `VITE_API_URL=https://api.your-domain/api` at build time.
5. Data lives in Neon — use Neon branches for staging and its point-in-time restore for backups.

## Scripts (run from the repo root)

| Command | Does |
| --- | --- |
| `npm run dev` | backend + frontend with hot reload |
| `npm run build` | production build of the frontend |
| `npm start` | start the API (serves the built frontend too) |
| `npm run db:migrate` | create/update tables in Neon |
| `npm run seed` | add demo beneficiaries & benefit records |
| `npm run check:r2` | verify R2 / S3 bucket credentials (upload, read, delete) |
| `npm run check:sms -- 98XXXXXXXX` | send a test OTP through MSG91 |

## API overview

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/auth/otp/send`, `/api/auth/otp/verify` | citizen login |
| `POST` | `/api/auth/admin/login` | admin login |
| `GET` | `/api/me/card`, `/api/me/card/pdf` | citizen |
| `GET` | `/api/admin/stats`, `/api/admin/next-id` | admin |
| `GET/POST` | `/api/admin/cards` (multipart with `photo`) | admin |
| `GET/PATCH` | `/api/admin/cards/:cardId` | admin |
| `GET` | `/api/admin/cards/:cardId/pdf`, `/api/admin/cards/export.csv` | admin |
| `POST` | `/api/admin/cards/:cardId/sms` | admin |
| `GET/POST` | `/api/admin/availments` | admin |
| `GET` | `/api/public/verify/:cardId`, `/api/public/stats`, `/api/public/meta` | public |
| `POST` | `/api/public/apply`, `/api/public/find-card` | public |
| `GET` | `/api/health` | health check (database + storage status) |

## Project structure

```
deoband-vishwas-card/
├── .env.example            # template for the shared env file
├── package.json            # npm workspaces + root scripts
├── backend/
│   ├── assets/card-template.png   # official card artwork used for the PDF
│   ├── scripts/            # migrate.js, seed.js, check-r2.js, check-sms.js
│   └── src/
│       ├── server.js       # Express app
│       ├── config.js       # reads ../.env
│       ├── db.js           # PostgreSQL pool, schema, admin seeding
│       ├── lib/            # storage (R2/S3/local), auth, MSG91 SMS, PDF, validation
│       └── routes/         # auth, public, me (citizen), admin
└── frontend/
    ├── public/card-template.png   # same artwork, overlaid with ID + QR in the browser
    ├── public/images/             # drop outreach.jpg here for the homepage photo tile
    └── src/
        ├── pages/          # Home, Login, Apply, Verify, UserDashboard, AdminDashboard
        ├── components/     # VishwasCard, headers, footer, UI kit
        └── lib/            # api client, auth context, site copy
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Deoband Vishwas Card: frontend + backend"
git branch -M main
git remote add origin https://github.com/<you>/deoband-vishwas-card.git
git push -u origin main
```

`.env` and local uploads are git-ignored, so no secrets or citizen data get pushed.
