const { pool, ensureDatabase } = require("./_lib/db");
const { isValidDateString } = require("./_lib/date");
const { json } = require("./_lib/response");

function extractDateFromPath(path = "") {
  const match = path.match(/\/memos\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

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

exports.handler = async function handler(event) {
  try {
    await ensureDatabase();

    if (event.httpMethod === "GET") {
      const date = extractDateFromPath(event.path);

      if (!date) {
        const result = await pool.query(
          `SELECT ${MEMO_SELECT_FIELDS} FROM memos ORDER BY memo_date ASC`
        );

        return json(200, {
          items: result.rows.map(normalizeMemo),
        });
      }

      if (!isValidDateString(date)) {
        return json(400, {
          message: "Invalid date format. Expected YYYY-MM-DD.",
        });
      }

      const result = await pool.query(
        `SELECT ${MEMO_SELECT_FIELDS} FROM memos WHERE memo_date = $1`,
        [date]
      );

      if (result.rowCount === 0) {
        return json(200, {
          item: null,
        });
      }

      return json(200, {
        item: normalizeMemo(result.rows[0]),
      });
    }

    if (event.httpMethod === "POST") {
      const payload = JSON.parse(event.body || "{}");
      const memoDate = payload.memoDate;
      const content = typeof payload.content === "string" ? payload.content : "";

      if (!isValidDateString(memoDate)) {
        return json(400, {
          message: "Invalid date format. Expected YYYY-MM-DD.",
        });
      }

      const result = await pool.query(
        `INSERT INTO memos (memo_date, content)
         VALUES ($1, $2)
         ON CONFLICT (memo_date)
         DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
         RETURNING ${MEMO_SELECT_FIELDS}`,
        [memoDate, content]
      );

      return json(200, {
        item: normalizeMemo(result.rows[0]),
      });
    }

    if (event.httpMethod === "DELETE") {
      const date = extractDateFromPath(event.path);

      if (!isValidDateString(date || "")) {
        return json(400, {
          message: "Invalid date format. Expected YYYY-MM-DD.",
        });
      }

      await pool.query("DELETE FROM memos WHERE memo_date = $1", [date]);

      return json(200, {
        deleted: true,
      });
    }

    return json(405, {
      message: "Method not allowed.",
    });
  } catch (error) {
    console.error("Memos handler failed:", error);
    return json(500, {
      message: "Internal server error.",
    });
  }
};
