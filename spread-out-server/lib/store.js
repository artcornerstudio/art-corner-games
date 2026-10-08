/**
 * The purchase record: one row per paid Stripe Checkout session.
 * SQLite through Node's built-in driver, so there is nothing to compile and
 * the whole database is one file (put it on a persistent disk in production).
 */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

function openStore(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      payment_intent TEXT,
      email TEXT,
      amount INTEGER,
      currency TEXT,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS purchases_payment_intent ON purchases(payment_intent);
  `);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO purchases (session_id, payment_intent, email, amount, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const bySession = db.prepare("SELECT * FROM purchases WHERE session_id = ?");
  const byId = db.prepare("SELECT * FROM purchases WHERE id = ?");
  const revokeByPi = db.prepare("UPDATE purchases SET revoked_at = ? WHERE payment_intent = ? AND revoked_at IS NULL");
  const revokeById = db.prepare("UPDATE purchases SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL");
  const count = db.prepare("SELECT COUNT(*) AS n FROM purchases");

  return {
    /** Record a paid Checkout Session. Safe to call twice (the webhook and the claim can both see it). */
    insertFromSession(session) {
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      insert.run(
        session.id,
        pi,
        session.customer_details?.email ?? session.customer_email ?? null,
        session.amount_total ?? null,
        session.currency ?? null,
        new Date().toISOString(),
      );
      return bySession.get(session.id);
    },
    bySession: (id) => bySession.get(id) ?? null,
    byId: (id) => byId.get(id) ?? null,
    revokeByPaymentIntent: (pi) => revokeByPi.run(new Date().toISOString(), pi).changes,
    revokeById: (id) => revokeById.run(new Date().toISOString(), id).changes,
    count: () => count.get().n,
    close: () => db.close(),
  };
}

module.exports = { openStore };
