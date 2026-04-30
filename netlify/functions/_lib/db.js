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

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memos_set_updated_at ON memos;

CREATE TRIGGER memos_set_updated_at
BEFORE UPDATE ON memos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
`;

let initialized = false;

async function ensureDatabase() {
  if (initialized) {
    return;
  }

  await pool.query(initSql);
  initialized = true;
}

module.exports = {
  pool,
  ensureDatabase,
};
