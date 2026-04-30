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

const app = express();
const port = Number(process.env.PORT || 8788);

app.use(cors());
app.use(express.json());

function normalizeMemo(row) {
  return {
    id: row.id,
    memoDate: row.memo_date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
      "SELECT id, memo_date, content, created_at, updated_at FROM memos ORDER BY memo_date ASC"
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
      "SELECT id, memo_date, content, created_at, updated_at FROM memos WHERE memo_date = $1",
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
       RETURNING id, memo_date, content, created_at, updated_at`,
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

app.listen(port, () => {
  console.log(`TêteDeFlorette local API listening on http://localhost:${port}`);
});
