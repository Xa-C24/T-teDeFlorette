const { pool, ensureDatabase } = require("./_lib/db");
const { json } = require("./_lib/response");

exports.handler = async function handler() {
  try {
    await ensureDatabase();
    const result = await pool.query("SELECT NOW() AS now");

    return json(200, {
      ok: true,
      service: "TêteDeFlorette API",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return json(500, {
      ok: false,
      message: "Database connection failed.",
    });
  }
};
