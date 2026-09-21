import type { SavedPlay } from "./designer";

/**
 * Share a playbook as a link: the saved plays are JSON, deflated with the
 * browser's CompressionStream, and base64url-encoded into the URL hash.
 * Nothing is uploaded anywhere. A link is only as long as the playbook.
 */

const PREFIX = "#pb=";

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  const chunk = new Uint8Array(bytes.byteLength);
  chunk.set(bytes);
  void writer.write(chunk);
  void writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buf);
}

/** Strips the fields a receiver can rebuild, to keep links short. */
function slim(entries: SavedPlay[]): unknown[] {
  return entries.map((e) => ({ p: e.play, o: e.offense }));
}

export async function encodePlaybook(entries: SavedPlay[]): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(slim(entries)));
  const packed = typeof CompressionStream === "function" ? await pipe(json, new CompressionStream("deflate-raw")) : json;
  return (typeof CompressionStream === "function" ? "d" : "r") + toBase64Url(packed);
}

export async function decodePlaybook(payload: string): Promise<SavedPlay[]> {
  const mode = payload[0];
  const bytes = fromBase64Url(payload.slice(1));
  const json = mode === "d" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
  const raw = JSON.parse(new TextDecoder().decode(json)) as { p: SavedPlay["play"]; o: SavedPlay["offense"] }[];
  if (!Array.isArray(raw)) throw new Error("Not a playbook");
  return raw.map((r) => ({ play: r.p, offense: r.o, savedAt: new Date().toISOString() }));
}

export function shareUrlFor(payload: string): string {
  const base = `${location.origin}${location.pathname}`;
  return `${base}${PREFIX}${payload}`;
}

/** The playbook payload in the current URL, if someone opened a shared link. */
export function payloadFromLocation(): string | null {
  const h = location.hash;
  if (!h.startsWith(PREFIX)) return null;
  return decodeURIComponent(h.slice(PREFIX.length));
}

export function clearShareHash() {
  if (location.hash.startsWith(PREFIX)) history.replaceState(null, "", location.pathname + location.search);
}
