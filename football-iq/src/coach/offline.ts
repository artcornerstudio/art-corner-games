/**
 * Template answers for "Ask Coach" when the proxy is unavailable. Everything
 * here is built from the facts the app already has, so it is always safe and
 * always works offline.
 */

import type { AgeBand, CoachContext, CoachQuestion } from "./client";

/** Most sentences a band gets. Younger kids get the short version. */
const MAX_SENTENCES: Record<AgeBand, number> = { "8-10": 3, "11-13": 4, "14-16": 5 };

/** Make sure a fact ends a sentence so we can glue facts together. */
function sentence(text: string | undefined): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Split roughly into sentences, keep the first `max`, and glue back together. */
function trimTo(text: string, max: number): string {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!parts || parts.length <= max) return text.trim();
  return parts
    .slice(0, max)
    .map((p) => p.trim())
    .join(" ");
}

function whatHappens(c: CoachContext): string {
  const kind = c.playType === "run" ? "a run" : "a pass";
  return [sentence(`${c.playName} is ${kind}`), sentence(c.description), sentence(`The offense lines up in ${c.offense.name}`)].join(" ");
}

function whyItWorks(c: CoachContext): string {
  return [sentence(c.why), sentence(`Against ${c.defense.name}, that is the spot the play is built to attack`)].join(" ");
}

function whoIsOpen(c: CoachContext): string {
  if (c.playType === "run") {
    return [
      sentence(`${c.playName} is a run, so nobody has to get open`),
      sentence("The runner follows the blockers and looks for the hole"),
      sentence(c.description),
    ].join(" ");
  }
  return [
    sentence(`On ${c.playName} the quarterback looks for the receiver the play is built to free up`),
    sentence(c.description),
    sentence(`The defense is in ${c.defense.name}, so he throws to whoever the coverage leaves alone`),
  ].join(" ");
}

function whatBeatsIt(c: CoachContext): string {
  const tip =
    c.playType === "run"
      ? "A defense that fills the running lane fast and keeps its linebackers home makes this play hard."
      : "A defense that covers the spot the ball goes to and gets pressure on the quarterback makes this play hard.";
  return [sentence(`Here the defense is in ${c.defense.name}`), sentence(c.defense.description), tip].join(" ");
}

function explainPosition(c: CoachContext): string {
  const name = c.positionName ?? c.positionCode;
  if (!name) return "Tap a player on the field and Coach will tell you that position's job. Every player has one main job on every play.";
  const label = c.positionCode && c.positionName ? `${c.positionName} (${c.positionCode})` : name;
  return [
    sentence(`The ${label} has one main job`),
    sentence(c.positionJob ?? `Watch what the ${name} does on ${c.playName} to see it in action`),
    sentence(`On ${c.playName}, watch that player from the snap`),
  ].join(" ");
}

function explainResult(c: CoachContext): string {
  const o = c.outcome;
  if (!o) return `Run ${c.playName} first, then Coach can tell you what happened. Watch where the ball goes.`;
  const parts = [sentence(o.story)];
  const s = c.situation;
  if (s) {
    const need = s.distance;
    if (o.result === "touchdown") parts.push("Touchdown! That is the best thing that can happen on a play.");
    else if (o.result === "turnover") parts.push(`The offense needed ${need} yards, but a turnover means the other team gets the ball instead.`);
    else if (o.yards >= need) parts.push(`You needed ${need} yards and got ${o.yards}, so that is a first down.`);
    else if (o.yards <= 0) parts.push(`You needed ${need} yards and did not gain any, so it is still ${need} to go.`);
    else parts.push(`You needed ${need} yards and got ${o.yards}, so there are ${need - o.yards} yards left to get.`);
  } else {
    parts.push(sentence(o.yards >= 0 ? `That went for ${o.yards} yards` : `That lost ${Math.abs(o.yards)} yards`));
  }
  return parts.join(" ");
}

export function offlineAnswer(question: CoachQuestion, context: CoachContext): string {
  let text: string;
  switch (question) {
    case "what-happens":
      text = whatHappens(context);
      break;
    case "why-it-works":
      text = whyItWorks(context);
      break;
    case "who-is-open":
      text = whoIsOpen(context);
      break;
    case "what-beats-it":
      text = whatBeatsIt(context);
      break;
    case "explain-position":
      text = explainPosition(context);
      break;
    case "explain-result":
      text = explainResult(context);
      break;
  }
  const max = MAX_SENTENCES[context.ageBand] ?? MAX_SENTENCES["11-13"];
  return trimTo(text, max);
}
