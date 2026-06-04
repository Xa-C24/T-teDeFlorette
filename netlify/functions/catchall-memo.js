const { pool, ensureDatabase } = require("./_lib/db");
const { json } = require("./_lib/response");

const CATCHALL_MEMO_DATE = "9999-12-31";
const DEFAULT_CATCHALL_SLUG = "default";

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
  } catch (error) {
    console.error("Catchall memo handler failed:", error);
    return json(500, {
      message: "Internal server error.",
    });
  }
};
