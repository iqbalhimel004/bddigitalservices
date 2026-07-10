// Temporary script: inspect the old Neon database contents
import pg from "/vercel/share/v0-project/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js";

const OLD_DB = process.env.OLD_DATABASE_URL;
const client = new pg.Client({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false } });

await client.connect();

const tables = await client.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
);
console.log("TABLES:", tables.rows.map((r) => r.table_name).join(", "));

for (const { table_name } of tables.rows) {
  const c = await client.query(`SELECT count(*)::int AS n FROM "${table_name}"`);
  console.log(`${table_name}: ${c.rows[0].n} rows`);
}

// Show columns of key tables
for (const t of ["products", "categories"]) {
  const cols = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
    [t]
  );
  if (cols.rows.length) {
    console.log(`\nCOLUMNS ${t}:`, cols.rows.map((r) => `${r.column_name}(${r.data_type})`).join(", "));
  }
}

await client.end();
