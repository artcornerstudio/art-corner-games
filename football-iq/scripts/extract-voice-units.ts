/**
 * Lists every sentence the game can say out loud from fixed content, so each
 * one can be recorded once with the coach voice. Writes voice/units.json.
 *
 *   npm run voice:units
 *
 * It runs through vite-node so it can import the game's own modules (quiz
 * content, fourth-down scenarios, result stories) and uses the same splitting
 * and hashing code as the game, so the ids match the clips at play time.
 * Lines with numbers (yards gained, spots on the field) are listed as families.
 * Anything else the game says is added by hand in voice/extra-lines.json.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { formations, plays, positions as positionBook } from "../src/content";
import { freePlayIds } from "../vite.edition";
import edition from "../src/content/edition.json";
import { CALL_LABEL, FOURTH_DOWN_SCENARIOS, judge, scoreboardLine, type FourthDownCall } from "../src/games/fourthDown";
import { LOOK_LABEL, matchupNote, resolvePlay } from "../src/games/outcome";
import { COVERAGE_LOOKS, COVERAGE_OPTION_LABEL } from "../src/games/reads";
import { LOOKS, OPPONENTS, resultLine } from "../src/games/season";
import { describeSpot, downLabel } from "../src/games/situationText";
import { hashText, splitUnits } from "../src/speech/units";
import { choicesForSpeech, joinForSpeech } from "../src/speech/voice";

const root = process.cwd();
const content = join(root, "src", "content");

function readDir<T>(dir: string): T[] {
  return readdirSync(join(content, dir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(content, dir, f), "utf8")) as T);
}

/** id -> text, and whether the sentence only ever appears in paid content. */
const units = new Map<string, { text: string; paid: boolean }>();

function put(text: string, paid: boolean) {
  const id = hashText(text);
  const had = units.get(id);
  // A sentence that is also in free content is free: the demo needs its clip.
  units.set(id, { text, paid: had ? had.paid && paid : paid });
}

/** Paid until proven free: lines from paid lessons, plays, and situations. */
function add(line: string | undefined | null, paid = false) {
  if (!line) return;
  for (const text of splitUnits(joinForSpeech([line]))) put(text, paid);
}

function addChoices(choices: string[], paid = false) {
  const line = choicesForSpeech(choices);
  const made = splitUnits(line);
  // Every choice must come out as its own unit, or the list reading would be wrong.
  for (const c of choices) {
    const want = splitUnits(joinForSpeech([c]))[0];
    if (!made.includes(want) && !made.includes(c.replace(/[.!?]+$/, "") + ".")) {
      throw new Error(`Choice did not survive splitting as its own unit: "${c}"`);
    }
  }
  for (const text of made) put(text, paid);
}

interface Lesson { unitId: string; title: string; steps: { text: string }[]; quiz: { prompt: string; explanation: string; choices?: string[] }[] }
interface Play { id: string; name: string; description?: string; why?: string }
interface Situation { context?: string; options: { reason: string }[] }

const freeUnits = new Set<string>(edition.freeUnits);
for (const lesson of readDir<Lesson>("lessons")) {
  const paid = !freeUnits.has(lesson.unitId);
  add(lesson.title, paid);
  for (const s of lesson.steps) add(s.text, paid);
  lesson.quiz.forEach((_, i) => add(`Question ${i + 1}.`));
  for (const q of lesson.quiz) {
    add(q.prompt, paid);
    add(q.explanation, paid);
    if (q.choices) addChoices(q.choices, paid);
  }
}
const positions = JSON.parse(readFileSync(join(content, "positions.json"), "utf8")) as Record<string, { name: string; job: string }>;
for (const p of Object.values(positions)) {
  add(p.name);
  add(p.job);
}
const freePlays = freePlayIds();
for (const p of readDir<Play>("plays")) {
  const paid = !freePlays.has(p.id);
  add(p.name, paid);
  add(p.description, paid);
  add(p.why, paid);
}
for (const s of readDir<Situation>("situations")) {
  add(s.context, true);
  for (const o of s.options) add(o.reason, true);
}

// ---- Lines with numbers the game builds while playing
for (let down = 1; down <= 4; down++) {
  for (let distance = 1; distance <= 30; distance++) add(downLabel(down, distance, 50));
  add(downLabel(down, 10, 99)); // "goal"
}
for (let yard = 1; yard <= 100; yard++) {
  add(`Ball on ${describeSpot(yard)}`);
  add(`They take over at their own ${yard}.`);
  add(`You will start at your ${yard}.`);
}
for (let n = 0; n <= 99; n++) add(`Gain of ${n}.`);
for (let n = 1; n <= 30; n++) add(`Loss of ${n}.`);
for (let n = 0; n <= 80; n++) {
  add(`You ${n}.`);
  add(`They ${n}.`);
}
for (let n = 0; n <= 5; n++) add(`You got ${n} out of 5.`);
add("You need 4 right to pass.");
add("You need 5 right to pass.");
for (let n = 17; n <= 116; n++) {
  add(`From ${n} yards...`);
  add(`That kick is ${n} yards.`);
}
for (let n = 17; n <= 62; n++) {
  add(`${n}-yard field goal is good!`);
  add(`${n}-yard field goal is good.`);
  add(`${n}-yard field goal is no good.`);
  add(`Field goal (${n} yards).`);
}
for (let n = 1; n <= 49; n++) {
  add(`Turnover on downs at your ${n}.`);
  add(`Turnover on downs at your opponent's ${n}.`);
}
// What Season says after a snap, for every possible result.
for (const yards of [...Array(130).keys()].map((k) => k - 30)) {
  for (const [fd, td, to] of [[false, false, false], [true, false, false], [false, true, false], [false, false, true]] as const) add(resultLine(yards, fd, td, to));
  add(`${yards >= 0 ? `Gain of ${yards}` : `Loss of ${-yards}`}, short of the line.`);
}

// ---- Result stories, matchup notes, and the plays themselves
const allLooks = Object.values(LOOK_LABEL);
// Spots near the goal line matter: touchdowns and short gains only come up there.
const SPOTS = [25, 50, 75, 90, 97].map((yardLine) => ({ id: "s", variant: "tackle11", down: 2, distance: 8, yardLine, options: [] }) as never);
for (const play of plays) {
  for (const look of LOOKS) {
    add(`${play.name} vs ${LOOK_LABEL[look]}`);
    add(matchupNote(play, look), true);
    add(LOOK_LABEL[look]);
    for (let seed = 0; seed < 60; seed++) for (const situation of SPOTS) add(resolvePlay({ play, look, seed, situation }).story);
  }
  for (let seed = 0; seed < 40; seed++) for (const situation of SPOTS) add(resolvePlay({ play, seed, situation }).story);
}
void allLooks;

// ---- Beat the Coverage and Hot Read
for (const r of COVERAGE_LOOKS) {
  add(`This was ${r.name}.`, true);
  add(r.tell, true);
  add(r.why, true);
  add(`Hint: ${r.tell}`, true);
  add(`${COVERAGE_OPTION_LABEL[r.answerPlayId]} beats it.`, true);
  add(`Not quite. ${COVERAGE_OPTION_LABEL[r.answerPlayId]} beats it.`, true);
}
for (const label of Object.values(COVERAGE_OPTION_LABEL)) add(label, true);
addChoices(Object.values(COVERAGE_OPTION_LABEL), true);
for (const f of formations) {
  for (const p of f.players) {
    const pos = positionBook[p.position];
    if (pos) add(`The hot read is ${p.label ?? p.position}, the ${pos.name.toLowerCase()}.`, true);
  }
}

// ---- Spot the Position
for (const pos of Object.values(positionBook)) {
  const name = pos.name.toLowerCase();
  add(`Tap a ${name}.`);
  add(`Tap the ${name}.`);
}

// ---- Fourth-Down Decision
const FOURTH_CALLS: FourthDownCall[] = ["go", "punt", "field-goal"];
addChoices(FOURTH_CALLS.map((c) => CALL_LABEL[c]));
for (const s of FOURTH_DOWN_SCENARIOS) {
  add(scoreboardLine(s), true);
  add(s.note, true);
  for (const c of FOURTH_CALLS) add(judge(s, c).reason, true);
}

// ---- Season
for (const o of OPPONENTS) {
  add(`${o.name} have the ball.`, true);
  add(`Scouting report: ${o.tendency}`, true);
}
for (const f of FOURTH_CALLS) void f;

// Everything else, by hand or found by the coverage check.
const extra = JSON.parse(readFileSync(join(root, "voice", "extra-lines.json"), "utf8")) as string[];
for (const line of extra) add(line);

const list = [...units.entries()]
  .map(([id, u]) => (u.paid ? { id, text: u.text, p: 1 } : { id, text: u.text }))
  .sort((a, b) => a.text.localeCompare(b.text));
const paidCount = list.filter((u) => "p" in u).length;
writeFileSync(join(root, "voice", "units.json"), JSON.stringify(list, null, 1) + "\n");
const chars = list.reduce((n, u) => n + u.text.length, 0);
console.log(`${list.length} sentences to record, ${chars} characters, about ${Math.round(chars / 15 / 60)} minutes of speech. ${paidCount} are paid-only, ${list.length - paidCount} are free.`);
