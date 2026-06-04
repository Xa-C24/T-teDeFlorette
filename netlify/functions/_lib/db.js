const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? undefined
    : { rejectUnauthorized: false },
});

const initSql = `
CREATE TABLE IF NOT EXISTS memos (
  id SERIAL PRIMARY KEY,
  memo_date DATE UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catchall_memos (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memos_set_updated_at ON memos;
DROP TRIGGER IF EXISTS catchall_memos_set_updated_at ON catchall_memos;

CREATE TRIGGER memos_set_updated_at
BEFORE UPDATE ON memos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER catchall_memos_set_updated_at
BEFORE UPDATE ON catchall_memos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
`;

const CATCHALL_MEMO_DATE = "9999-12-31";
const DEFAULT_CATCHALL_SLUG = "default";

let initialized = false;

async function ensureDatabase() {
  if (initialized) {
    return;
  }

  await pool.query(initSql);
  await pool.query(
    `INSERT INTO catchall_memos (slug, content, created_at, updated_at)
     SELECT $1, content, created_at, updated_at
     FROM memos
     WHERE memo_date = $2
     ON CONFLICT (slug) DO NOTHING`,
    [DEFAULT_CATCHALL_SLUG, CATCHALL_MEMO_DATE]
  );
  initialized = true;
}

module.exports = {
  pool,
  ensureDatabase,
};
