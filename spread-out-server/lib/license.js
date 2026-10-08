/**
 * License codes: what a buyer types on a second device to unlock the game.
 *
 * A code is not stored anywhere. It is the purchase's row id plus an HMAC of
 * that id under the server secret, so the server can check a code without
 * keeping a list of valid codes (a leaked database does not leak codes), and
 * support can regenerate a lost code from the purchase id.
 *
 * Format: XXXX-XXXX-XXXX-XXXX from an alphabet with no 0/O or 1/I.
 */
const crypto = require("node:crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols
const ID_BYTES = 4;
const MAC_BYTES = 6;

function toBase32(buf) {
  let bits = 0, val = 0, out = "";
  for (const b of buf) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(val << (5 - bits)) & 31];
  return out;
}

function fromBase32(str) {
  const bytes = [];
  let bits = 0, val = 0;
  for (const ch of str) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { bytes.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

function mac(secret, id) {
  return crypto.createHmac("sha256", secret).update(`spread-out-license:${id}`).digest().subarray(0, MAC_BYTES);
}

/** Build the code for purchase row `id`. */
function makeCode(secret, id) {
  if (!Number.isInteger(id) || id < 1 || id > 0xffffffff) throw new Error("bad purchase id");
  const idBuf = Buffer.alloc(ID_BYTES);
  idBuf.writeUInt32BE(id);
  const raw = toBase32(Buffer.concat([idBuf, mac(secret, id)]));
  return raw.match(/.{1,4}/g).join("-");
}

/** Normalise what a person typed: upper-case, no spaces or dashes. */
function normalise(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** The purchase id a code names, or null when the code is not genuine. Constant-time on the MAC. */
function parseCode(secret, input) {
  const clean = normalise(input);
  if (clean.length !== 16) return null;
  const buf = fromBase32(clean); // null when a character is outside the alphabet (the alphabet is public, so that is no secret)
  if (!buf || buf.length < ID_BYTES + MAC_BYTES) return null;
  const id = buf.readUInt32BE(0);
  const given = buf.subarray(ID_BYTES, ID_BYTES + MAC_BYTES);
  const want = id >= 1 ? mac(secret, id) : Buffer.alloc(MAC_BYTES, 0xff);
  return crypto.timingSafeEqual(given, want) && id >= 1 ? id : null;
}

module.exports = { makeCode, parseCode, normalise };
