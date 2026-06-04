const { pool, ensureDatabase } = require("./_lib/db");
const { isValidDateString } = require("./_lib/date");
const { json } = require("./_lib/response");
const CATCHALL_MEMO_DATE = "9999-12-31";
const DEFAULT_CATCHALL_SLUG = "default";

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

exports.handler = async function handler(event) {
  try {
    await ensureDatabase();

    if (event.path === "/.netlify/functions/catchall-memo") {
      if (event.httpMethod === "GET") {
        return json(200, {
          item: await getCatchallMemo(),
        });
      }

      if (event.httpMethod === "POST") {
        const payload = JSON.parse(event.body || "{}");
        const content = typeof payload.content === "string" ? payload.content : "";
        const result = await pool.query(
          `INSERT INTO catchall_memos (slug, content)
           VALUES ($1, $2)
           ON CONFLICT (slug)
           DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP
           RETURNING id, slug, content, created_at, updated_at`,
          [DEFAULT_CATCHALL_SLUG, content]
        );

        await pool.query("DELETE FROM memos WHERE memo_date = $1", [CATCHALL_MEMO_DATE]);

        return json(200, {
          item: normalizeCatchallMemo(result.rows[0]),
        });
      }

      if (event.httpMethod === "DELETE") {
        await pool.query("DELETE FROM catchall_memos WHERE slug = $1", [DEFAULT_CATCHALL_SLUG]);
        await pool.query("DELETE FROM memos WHERE memo_date = $1", [CATCHALL_MEMO_DATE]);

        return json(200, {
          deleted: true,
        });
      }

      return json(405, {
        message: "Method not allowed.",
      });
    }

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
