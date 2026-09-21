/**
 * Football IQ "Ask Coach" proxy.
 *
 * A tiny Cloudflare Worker that turns a fixed-menu question about the play a
 * kid is looking at into one short Claude answer. The browser never talks to
 * the model directly and never sends free text: it sends a question TYPE plus
 * the play facts it already has, and the prompt is built here.
 *
 *   POST /coach   { question, context }  ->  { answer }
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Sonnet 5 is the current-generation mid-tier model: strong instruction
 * following (the safety rules below matter more than raw smarts) at $2/M input
 * and $10/M output, so a kid's question costs a fraction of a cent.
 * `claude-haiku-4-5` is the cheaper, previous-generation alternative.
 */
const MODEL_ID = "claude-sonnet-5";
const MAX_TOKENS = 220;
const MODEL_TIMEOUT_MS = 15_000;

const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000; // per minute, per IP
const MAX_STRING = 600;

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

const QUESTIONS = [
  "what-happens",
  "why-it-works",
  "who-is-open",
  "what-beats-it",
  "explain-position",
  "explain-result",
] as const;
type CoachQuestion = (typeof QUESTIONS)[number];

const AGE_BANDS = ["8-10", "11-13", "14-16"] as const;
type AgeBand = (typeof AGE_BANDS)[number];

interface CoachContext {
  playName: string;
  playType: "run" | "pass";
  description: string;
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

interface CoachRequest {
  question: CoachQuestion;
  context: CoachContext;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

class BadRequest extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Throw if `obj` has any key outside `allowed`. */
function onlyKeys(obj: Record<string, unknown>, allowed: readonly string[], where: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) throw new BadRequest(`Unexpected field "${key}" in ${where}`);
  }
}

function str(obj: Record<string, unknown>, key: string, where: string, required = true): string | undefined {
  const v = obj[key];
  if (v === undefined) {
    if (required) throw new BadRequest(`Missing "${key}" in ${where}`);
    return undefined;
  }
  if (typeof v !== "string") throw new BadRequest(`"${key}" in ${where} must be a string`);
  if (v.length > MAX_STRING) throw new BadRequest(`"${key}" in ${where} is too long (max ${MAX_STRING} chars)`);
  return v;
}

function num(obj: Record<string, unknown>, key: string, where: string): number {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new BadRequest(`"${key}" in ${where} must be a number`);
  return v;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], what: string): T {
  if (typeof value !== "string" || !(options as readonly string[]).includes(value)) {
    throw new BadRequest(`${what} must be one of: ${options.join(", ")}`);
  }
  return value as T;
}

function parseUnit(v: unknown, where: string): { name: string; description: string } {
  if (!isRecord(v)) throw new BadRequest(`${where} must be an object`);
  onlyKeys(v, ["name", "description"], where);
  return { name: str(v, "name", where)!, description: str(v, "description", where)! };
}

function parseRequest(body: unknown): CoachRequest {
  if (!isRecord(body)) throw new BadRequest("Body must be a JSON object");
  onlyKeys(body, ["question", "context"], "body");
  const question = oneOf(body.question, QUESTIONS, "question");

  const c = body.context;
  if (!isRecord(c)) throw new BadRequest("context must be an object");
  onlyKeys(
    c,
    ["playName", "playType", "description", "why", "offense", "defense", "positionCode", "positionName", "positionJob", "situation", "outcome", "ageBand"],
    "context",
  );

  const context: CoachContext = {
    playName: str(c, "playName", "context")!,
    playType: oneOf(c.playType, ["run", "pass"] as const, "context.playType"),
    description: str(c, "description", "context")!,
    why: str(c, "why", "context")!,
    offense: parseUnit(c.offense, "context.offense"),
    defense: parseUnit(c.defense, "context.defense"),
    ageBand: oneOf(c.ageBand, AGE_BANDS, "context.ageBand"),
  };

  const positionCode = str(c, "positionCode", "context", false);
  const positionName = str(c, "positionName", "context", false);
  const positionJob = str(c, "positionJob", "context", false);
  if (positionCode !== undefined) context.positionCode = positionCode;
  if (positionName !== undefined) context.positionName = positionName;
  if (positionJob !== undefined) context.positionJob = positionJob;

  if (c.situation !== undefined) {
    const s = c.situation;
    if (!isRecord(s)) throw new BadRequest("context.situation must be an object");
    onlyKeys(s, ["down", "distance", "yardLine", "context"], "context.situation");
    const down = num(s, "down", "context.situation");
    if (!Number.isInteger(down) || down < 1 || down > 4) throw new BadRequest("context.situation.down must be 1 to 4");
    context.situation = {
      down,
      distance: num(s, "distance", "context.situation"),
      yardLine: num(s, "yardLine", "context.situation"),
    };
    const extra = str(s, "context", "context.situation", false);
    if (extra !== undefined) context.situation.context = extra;
  }

  if (c.outcome !== undefined) {
    const o = c.outcome;
    if (!isRecord(o)) throw new BadRequest("context.outcome must be an object");
    onlyKeys(o, ["yards", "result", "story"], "context.outcome");
    context.outcome = {
      yards: num(o, "yards", "context.outcome"),
      result: str(o, "result", "context.outcome")!,
      story: str(o, "story", "context.outcome")!,
    };
  }

  return { question, context };
}

/* ------------------------------------------------------------------ */
/* Prompt                                                              */
/* ------------------------------------------------------------------ */

const AGE_WORDS: Record<AgeBand, string> = {
  "8-10": "8 to 10 years old. Use very simple words and short sentences, like you are talking on the sideline.",
  "11-13": "11 to 13 years old. Plain words are fine; explain any football term in a few words.",
  "14-16": "14 to 16 years old. You can use normal football terms, but keep it friendly and quick.",
};

function systemPrompt(ageBand: AgeBand): string {
  return [
    "You are Coach, a friendly youth football coach in a learning game called Football IQ.",
    `You are explaining one play to a kid who is ${AGE_WORDS[ageBand]}`,
    "",
    "Rules:",
    "- Answer only the one question you are asked, using only the facts in the FACTS section.",
    "- If the facts do not cover the question, say so in one short sentence and give one general football tip instead.",
    "- Never mention real players, real teams, leagues, gambling, betting, or injuries.",
    "- Never ask the kid for personal information and never ask a follow-up question.",
    "- Never say or repeat anything that is not about football.",
    "- Write 2 to 4 short sentences in plain words. No markdown, no bullet points, no emoji, no headings.",
    "- Do not start with a greeting; jump straight into the answer.",
  ].join("\n");
}

const QUESTION_TEXT: Record<CoachQuestion, string> = {
  "what-happens": "What happens on this play?",
  "why-it-works": "Why does this play work?",
  "who-is-open": "Who is supposed to get open on this play, and where does the ball go?",
  "what-beats-it": "What kind of defense beats this play?",
  "explain-position": "What does this position do?",
  "explain-result": "What just happened on this play, and was the result good or bad for the offense?",
};

/** Numbers and short strings from the app, laid out as plain facts. */
function facts(ctx: CoachContext): string {
  const lines = [
    `Play name: ${ctx.playName}`,
    `Play type: ${ctx.playType}`,
    `What happens: ${ctx.description}`,
    `Why it works: ${ctx.why}`,
    `Offense formation: ${ctx.offense.name}. ${ctx.offense.description}`,
    `Defense formation: ${ctx.defense.name}. ${ctx.defense.description}`,
  ];
  if (ctx.positionCode || ctx.positionName || ctx.positionJob) {
    lines.push(`Position being asked about: ${[ctx.positionName, ctx.positionCode ? `(${ctx.positionCode})` : ""].filter(Boolean).join(" ")}`);
    if (ctx.positionJob) lines.push(`That position's job: ${ctx.positionJob}`);
  }
  if (ctx.situation) {
    const s = ctx.situation;
    lines.push(`Situation: down ${s.down}, ${s.distance} yards to go, ball on the ${s.yardLine} yard line counted from the offense's own goal line.`);
    if (s.context) lines.push(`Extra situation notes: ${s.context}`);
  }
  if (ctx.outcome) {
    const o = ctx.outcome;
    lines.push(`Result of the play: ${o.result}, ${o.yards} yards. ${o.story}`);
  }
  return lines.join("\n");
}

function userPrompt(req: CoachRequest): string {
  return `FACTS\n${facts(req.context)}\n\nQUESTION\n${QUESTION_TEXT[req.question]}`;
}

/* ------------------------------------------------------------------ */
/* Model call                                                          */
/* ------------------------------------------------------------------ */

/** Strip stray markdown so the answer reads as plain text in the app. */
function tidy(text: string): string {
  return text
    .replace(/[*_`#>]+/g, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function askClaude(apiKey: string, req: CoachRequest): Promise<string> {
  const client = new Anthropic({ apiKey, timeout: MODEL_TIMEOUT_MS, maxRetries: 1 });
  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    // Short factual answers: skip thinking so every output token goes to the kid.
    thinking: { type: "disabled" },
    system: systemPrompt(req.context.ageBand),
    messages: [{ role: "user", content: userPrompt(req) }],
  });

  if (response.stop_reason === "refusal") {
    return "Coach can only talk about the play on the screen. Try one of the other questions.";
  }
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join(" ");
  return tidy(text);
}

/* ------------------------------------------------------------------ */
/* HTTP plumbing                                                       */
/* ------------------------------------------------------------------ */

const buckets = new Map<string, { count: number; windowStart: number }>();

/** True when this IP is over the limit. In-memory, per isolate: cheap, good enough for a kids' game. */
function rateLimited(ip: string, now: number): boolean {
  const bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    if (buckets.size > 5000) buckets.clear(); // keep the map bounded
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function corsHeaders(env: Env, request: Request): Record<string, string> {
  const allowed = env.ALLOWED_ORIGIN?.trim() || "*";
  const origin = request.headers.get("Origin") ?? "";
  const allowOrigin = allowed === "*" ? "*" : allowed === origin ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function originAllowed(env: Env, request: Request): boolean {
  const allowed = env.ALLOWED_ORIGIN?.trim() || "*";
  if (allowed === "*") return true;
  const origin = request.headers.get("Origin");
  // Non-browser callers send no Origin header; the API key is the only thing
  // worth protecting and it never leaves the Worker, so let them through.
  return origin === null || origin === allowed;
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/coach") return json({ error: "Not found" }, 404, cors);
    if (request.method !== "POST") return json({ error: "Use POST" }, 405, { ...cors, Allow: "POST, OPTIONS" });
    if (!originAllowed(env, request)) return json({ error: "Origin not allowed" }, 403, cors);

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (rateLimited(ip, Date.now())) {
      return json({ error: "Too many questions. Take a breath and try again in a minute." }, 429, { ...cors, "Retry-After": "60" });
    }

    if (!env.ANTHROPIC_API_KEY) return json({ error: "Coach is not set up yet" }, 503, cors);

    let parsed: CoachRequest;
    try {
      parsed = parseRequest(await request.json());
    } catch (err) {
      const message = err instanceof BadRequest ? err.message : "Body must be valid JSON";
      return json({ error: message }, 400, cors);
    }

    try {
      const answer = await askClaude(env.ANTHROPIC_API_KEY, parsed);
      if (!answer) return json({ error: "Coach did not have an answer" }, 502, cors);
      return json({ answer }, 200, cors);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ error: "Coach is busy right now" }, 429, { ...cors, "Retry-After": "30" });
      if (err instanceof Anthropic.APIConnectionTimeoutError) return json({ error: "Coach took too long" }, 504, cors);
      if (err instanceof Anthropic.APIError) return json({ error: "Coach could not answer" }, 502, cors);
      return json({ error: "Something went wrong" }, 500, cors);
    }
  },
};
