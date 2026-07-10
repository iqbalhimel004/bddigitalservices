// Temporary script: migrate data from the old Neon database to the new one
import pg from "/vercel/share/v0-project/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const oldDb = new pg.Client({ connectionString: process.env.OLD_DATABASE_URL, ssl: { rejectUnauthorized: false } });
const newDb = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

await oldDb.connect();
await newDb.connect();

const TABLES = ["categories", "products", "faqs", "notices", "orders", "site_settings"];

try {
  await newDb.query("BEGIN");

  // Clear in FK-safe order (orders/products reference categories)
  await newDb.query('TRUNCATE TABLE "orders", "products", "categories", "faqs", "notices", "site_settings" RESTART IDENTITY CASCADE');

  for (const table of TABLES) {
    const { rows } = await oldDb.query(`SELECT * FROM "${table}" ORDER BY id`);
    if (rows.length === 0) {
      console.log(`${table}: 0 rows (skipped)`);
      continue;
    }
    const cols = Object.keys(rows[0]);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    for (const row of rows) {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await newDb.query(
        `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
        cols.map((c) => row[c])
      );
    }
    // Reset the identity sequence so new inserts don't collide
    await newDb.query(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${table}"))`
    );
    console.log(`${table}: ${rows.length} rows migrated`);
  }

  await newDb.query("COMMIT");
  console.log("Migration complete.");
} catch (err) {
  await newDb.query("ROLLBACK");
  console.error("Migration failed, rolled back:", err.message);
  process.exitCode = 1;
} finally {
  await oldDb.end();
  await newDb.end();
}
