// Creates / updates the database tables in your Neon (PostgreSQL) database.
// The API also runs this automatically on startup — this script is for running it on its own.
//   npm run db:migrate
import { initDb, pool } from '../src/db.js';

try {
  await initDb();
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`);
console.log(`✓ Database ready. Tables: ${rows.map((r) => r.table_name).join(', ')}`);
await pool.end();
