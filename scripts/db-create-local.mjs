import "./load-env.mjs";
import pg from "pg";

const { Client } = pg;
const databaseName = process.env.LOCAL_DATABASE_NAME || "descinyc_local";
const adminUrl =
  process.env.LOCAL_POSTGRES_URL || "postgres://localhost:5432/postgres";

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
  throw new Error("LOCAL_DATABASE_NAME must be a valid Postgres identifier");
}

const client = new Client({ connectionString: adminUrl });

await client.connect();
try {
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );

  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Created database ${databaseName}`);
  } else {
    console.log(`Database ${databaseName} already exists`);
  }
} finally {
  await client.end();
}
