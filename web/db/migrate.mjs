// Apply pending migrations to the local database. Idempotent.
// Run: node web/db/migrate.mjs  (or: npm --prefix web run db:migrate)

import { openDb, migrate, DEFAULT_DB_PATH } from "./connection.mjs";

const db = openDb();
const ran = migrate(db);
if (ran.length) {
  console.log(`Applied ${ran.length} migration(s): ${ran.join(", ")}`);
} else {
  console.log("No pending migrations — database is up to date.");
}
console.log(`Database: ${DEFAULT_DB_PATH}`);
db.close();
