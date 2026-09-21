/**
 * Browser side of "Ask Coach".
 *
 * The app never talks to the model directly. It sends a question TYPE (from a
 * fixed menu) plus the play facts it already has to a tiny proxy (see
 * `coach/`), and gets back one short answer. If the proxy is not configured
 * or cannot be reached, a template answer built from the same facts is used
 * instead, so the game keeps working offline.
 */

import { offlineAnswer } from "./offline";

export type CoachQuestion =
  | "what-happens"
  | "why-it-works"
  | "who-is-open"
  | "what-beats-it"
  | "explain-position"
  | "explain-result";

export type AgeBand = "8-10" | "11-13" | "14-16";

export interface CoachContext {
  playName: string;
  playType: "run" | "pass";
  /** What happens, in kid language (the play's description). */
  description: string;
  /** Why it works (the play's why). */
  why: string;
  offense: { name: string; description: string };
  defense: { name: string; description: string };
  positionCode?: string;
  positionName?: string;
  positionJob?: string;
  situation?: { down: number; distance: number; yardLine: number; context?: string };
  outcome?: { yards: number; result: string; story: string };
  ageBand: AgeBand;
}

export interface CoachAnswer {
  answer: string;
  /** "coach" came from the proxy; "offline" was built locally from the context. */
  source: "coach" | "offline";
}

export const COACH_TIMEOUT_MS = 15_000;

/** The proxy base URL, e.g. "https://football-iq-coach.you.workers.dev". Undefined when not configured. */
export function coachUrl(): string | undefined {
  const raw = (import.meta.env as Record<string, unknown>).VITE_COACH_URL;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Ask Coach one of the fixed questions about the current play. Never throws:
 * any failure falls back to the offline template answer.
 */
export async function askCoach(
  question: CoachQuestion,
  context: CoachContext,
  opts: { signal?: AbortSignal } = {},
): Promise<CoachAnswer> {
  const fallback = (): CoachAnswer => ({ answer: offlineAnswer(question, context), source: "offline" });

  const base = coachUrl();
  if (!base || typeof fetch !== "function") return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) {
      clearTimeout(timer);
      return fallback();
    }
    opts.signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    const res = await fetch(`${base}/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context }),
      signal: controller.signal,
    });
    if (!res.ok) return fallback();
    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && typeof (data as { answer?: unknown }).answer === "string") {
      const answer = (data as { answer: string }).answer.trim();
      if (answer.length > 0) return { answer, source: "coach" };
    }
    return fallback();
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onOuterAbort);
  }
}
