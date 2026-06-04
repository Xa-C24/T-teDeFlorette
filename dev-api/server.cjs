const path = require("node:path");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Create a .env file at the project root.");
  process.exit(1);
}

const { pool, ensureDatabase } = require("../netlify/functions/_lib/db");
const { isValidDateString } = require("../netlify/functions/_lib/date");
const CATCHALL_MEMO_DATE = "9999-12-31";
const DEFAULT_CATCHALL_SLUG = "default";

const app = express();
const port = Number(process.env.PORT || 8788);

app.use(cors());
app.use(express.json());

const MEMO_SELECT_FIELDS = `
  id,
  memo_date::text AS memo_date,
  content,
  created_at,
  updated_at
`;

function normalizeMemo(row) {
  return {
    id: row.id,
    memoDate: row.memo_date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeCatchallMemo(row) {
  return {
    id: row.id,
    slug: row.slug,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCatchallMemo() {
  const result = await pool.query(
    `SELECT id, slug, content, created_at, updated_at
     FROM catchall_memos
     WHERE slug = $1`,
    [DEFAULT_CATCHALL_SLUG]
  );

  if (result.rowCount > 0) {
    return normalizeCatchallMemo(result.rows[0]);
  }

  const legacyResult = await pool.query(
    `SELECT content, created_at, updated_at
     FROM memos
     WHERE memo_date = $1`,
    [CATCHALL_MEMO_DATE]
  );

  if (legacyResult.rowCount === 0) {
    return null;
  }

  const migrated = await pool.query(
    `INSERT INTO catchall_memos (slug, content, created_at, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug)
     DO UPDATE SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
     RETURNING id, slug, content, created_at, updated_at`,
    [
      DEFAULT_CATCHALL_SLUG,
      legacyResult.rows[0].content,
      legacyResult.rows[0].created_at,
      legacyResult.rows[0].updated_at,
    ]
  );

  return normalizeCatchallMemo(migrated.rows[0]);
}

app.get("/api/health", async (_req, res) => {
  try {
    await ensureDatabase();
    const result = await pool.query("SELECT NOW() AS now");
    res.json({
      ok: true,
      service: "TêteDeFlorette API",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      ok: false,
      message: `Database connection failed: ${error.message}`,
    });
  }
});

app.get("/api/memos", async (_req, res) => {
  try {
    await ensureDatabase();
    const result = await pool.query(
      `SELECT ${MEMO_SELECT_FIELDS} FROM memos ORDER BY memo_date ASC`
    );

    res.json({
      items: result.rows.map(normalizeMemo),
    });
  } catch (error) {
    console.error("Get memos failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.get("/api/catchall-memo", async (_req, res) => {
  try {
    await ensureDatabase();
    res.json({
      item: await getCatchallMemo(),
    });
  } catch (error) {
    console.error("Get catchall memo failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.get("/api/memos/:date", async (req, res) => {
  try {
    await ensureDatabase();
    const { date } = req.params;

    if (!isValidDateString(date)) {
      res.status(400).json({
        message: "Invalid date format. Expected YYYY-MM-DD.",
      });
      return;
    }

    const result = await pool.query(
      `SELECT ${MEMO_SELECT_FIELDS} FROM memos WHERE memo_date = $1`,
      [date]
    );

    res.json({
      item: result.rowCount === 0 ? null : normalizeMemo(result.rows[0]),
    });
  } catch (error) {
    console.error("Get memo by date failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.post("/api/memos", async (req, res) => {
  try {
    await ensureDatabase();
    const memoDate = req.body?.memoDate;
    const content = typeof req.body?.content === "string" ? req.body.content : "";

    if (!isValidDateString(memoDate)) {
      res.status(400).json({
        message: "Invalid date format. Expected YYYY-MM-DD.",
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO memos (memo_date, content)
       VALUES ($1, $2)
       ON CONFLICT (memo_date)
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
       RETURNING ${MEMO_SELECT_FIELDS}`,
      [memoDate, content]
    );

    res.json({
      item: normalizeMemo(result.rows[0]),
    });
  } catch (error) {
    console.error("Save memo failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.post("/api/catchall-memo", async (req, res) => {
  try {
    await ensureDatabase();
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    const result = await pool.query(
      `INSERT INTO catchall_memos (slug, content)
       VALUES ($1, $2)
       ON CONFLICT (slug)
       DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
       RETURNING id, slug, content, created_at, updated_at`,
      [DEFAULT_CATCHALL_SLUG, content]
    );

    await pool.query("DELETE FROM memos WHERE memo_date = $1", [CATCHALL_MEMO_DATE]);

    res.json({
      item: normalizeCatchallMemo(result.rows[0]),
    });
  } catch (error) {
    console.error("Save catchall memo failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.delete("/api/memos/:date", async (req, res) => {
  try {
    await ensureDatabase();
    const { date } = req.params;

    if (!isValidDateString(date)) {
      res.status(400).json({
        message: "Invalid date format. Expected YYYY-MM-DD.",
      });
      return;
    }

    await pool.query("DELETE FROM memos WHERE memo_date = $1", [date]);
    res.json({
      deleted: true,
    });
  } catch (error) {
    console.error("Delete memo failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.delete("/api/catchall-memo", async (_req, res) => {
  try {
    await ensureDatabase();
    await pool.query("DELETE FROM catchall_memos WHERE slug = $1", [DEFAULT_CATCHALL_SLUG]);
    await pool.query("DELETE FROM memos WHERE memo_date = $1", [CATCHALL_MEMO_DATE]);
    res.json({
      deleted: true,
    });
  } catch (error) {
    console.error("Delete catchall memo failed:", error);
    res.status(500).json({
      message: `Internal server error: ${error.message}`,
    });
  }
});

app.listen(port, () => {
  console.log(`TêteDeFlorette local API listening on http://localhost:${port}`);
});
