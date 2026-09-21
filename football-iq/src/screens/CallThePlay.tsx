import { useMemo, useState } from "react";
import { VARIANT_LABEL, formationById, playById, situationsForVariant } from "../content";
import { compilePlay } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { CALL_THE_PLAY_ROUNDS, describeSpot, downLabel, optionLabel, POINTS } from "../games/callThePlay";
import { fieldGoalChance, puntResult, resolvePlay, type Outcome } from "../games/outcome";
import { recordGame, useTier } from "../progress";
import { playSound } from "../sound";
import { CoachPanel } from "../coach/CoachPanel";
import { coachContextFor } from "../coach/context";
import type { Situation, SituationOption, Variant } from "../types/play";
import { shuffle } from "../utils/random";

interface Props {
  onBack: () => void;
}

const VARIANTS: Variant[] = ["tackle11", "flag5"];

type Phase = { kind: "choosing" } | { kind: "chosen"; option: SituationOption; outcome: Outcome | null; specialStory: string | null };

function specialOutcome(s: Situation, o: SituationOption): string {
  if (o.special === "punt") {
    const r = puntResult(s.yardLine);
    return r.touchback ? "The punt sails into the end zone. Touchback; they start at their 20." : `The punter booms it. They take over at their own ${Math.max(1, 100 - s.yardLine - r.netYards)}.`;
  }
  const good = Math.random() < fieldGoalChance(s.yardLine);
  return good ? `From ${100 - s.yardLine + 17} yards... it's good!` : `From ${100 - s.yardLine + 17} yards... wide. No good.`;
}

function outcomeLine(s: Situation, o: Outcome): string {
  if (o.touchdown) return "Touchdown!";
  if (o.turnover) return "Turnover.";
  const gained = o.yards >= 0 ? `Gain of ${o.yards}` : `Loss of ${-o.yards}`;
  if (o.firstDown) return `${gained}. First down!`;
  const nextDown = s.down + 1;
  if (nextDown > 4) return `${gained}. Turnover on downs.`;
  const left = Math.max(1, s.distance - o.yards);
  return `${gained}. ${["1st", "2nd", "3rd", "4th"][nextDown - 1]} and ${s.yardLine + o.yards + left >= 100 ? "goal" : left}.`;
}

/** Six situations. Pick the call, watch it play out, learn why. Best call is 2 points, a fine call is 1. */
export function CallThePlay({ onBack }: Props) {
  const tier = useTier();
  const [variant, setVariant] = useState<Variant>("tackle11");
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => {
    const pool = shuffle(situationsForVariant(variant)).slice(0, CALL_THE_PLAY_ROUNDS);
    return pool.map((s) => ({ situation: s, options: shuffle(s.options) }));
  }, [variant, seed]);
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [bestCalls, setBestCalls] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "choosing" });
  const [finished, setFinished] = useState<{ best: number } | null>(null);

  const restart = (v: Variant) => {
    setVariant(v);
    setSeed((x) => x + 1);
    setIndex(0);
    setPoints(0);
    setBestCalls(0);
    setPhase({ kind: "choosing" });
    setFinished(null);
  };

  const round = rounds[index];
  const compiled = useMemo(() => {
    if (phase.kind !== "chosen" || !phase.option.playId) return null;
    const play = playById(phase.option.playId);
    return compilePlay(play, formationById(play.formationId), formationById(play.defenseFormationId));
  }, [phase]);

  const choose = (option: SituationOption) => {
    if (phase.kind !== "choosing") return;
    setPoints((p) => p + POINTS[option.verdict]);
    if (option.verdict === "best") setBestCalls((b) => b + 1);
    playSound(option.verdict === "bad" ? "wrong" : "correct");
    const outcome = option.playId ? resolvePlay({ play: playById(option.playId), situation: round.situation }) : null;
    const specialStory = option.special ? specialOutcome(round.situation, option) : null;
    setPhase({ kind: "chosen", option, outcome, specialStory });
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      const total = rounds.length * 2;
      const entry = recordGame(`call-the-play-${variant}`, points, total);
      setFinished({ best: entry.best });
      return;
    }
    setIndex(index + 1);
    setPhase({ kind: "choosing" });
  };

  const maxPoints = rounds.length * 2;

  return (
    <main className="game">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <div className="segmented" role="group" aria-label="Game type">
          {VARIANTS.map((v) => (
            <button key={v} type="button" className={v === variant ? "seg seg-on" : "seg"} aria-pressed={v === variant} onClick={() => restart(v)}>
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
      </div>
      <h1>Call the Play</h1>

      {finished ? (
        <section className="card result">
          <p className="eyebrow">Game over</p>
          <h2>{points} of {maxPoints} points</h2>
          <p>
            {bestCalls} of {rounds.length} best calls.{" "}
            {points === maxPoints ? "A perfect game plan." : points >= maxPoints * 0.75 ? "You think like a coach." : "Every call has a reason. Play again and watch for the clues."}
          </p>
          <p className="muted">Best on this device: {finished.best} of {maxPoints}</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={() => restart(variant)}>Play again</button>
            <button type="button" className="btn" onClick={onBack}>Home</button>
          </div>
        </section>
      ) : !round ? (
        <p>No situations yet for {VARIANT_LABEL[variant]}.</p>
      ) : (
        <>
          <p className="eyebrow">Situation {index + 1} of {rounds.length} · {points} points</p>
          <SituationCard situation={round.situation} />

          {phase.kind === "choosing" ? (
            <>
              <h2 className="prompt">What is your call?</h2>
              <div className="choices">
                {round.options.map((o) => (
                  <button key={optionLabel(o)} type="button" className="choice" onClick={() => choose(o)}>
                    {optionLabel(o)}
                    {tier === "rookie" && o.playId && <span className="choice-sub">{playById(o.playId).type === "run" ? "Run" : "Pass"}</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={`feedback feedback-${phase.option.verdict}`}>
                <p className="feedback-title">
                  {phase.option.verdict === "best" ? "Great call! +2" : phase.option.verdict === "ok" ? "Not bad. +1" : "Hmm, not that one."}
                </p>
                <p>{phase.option.reason}</p>
              </div>
              {compiled ? (
                <Diagram compiled={compiled} controls infoCard={false} />
              ) : (
                <section className="card special-call">
                  <p>{phase.specialStory}</p>
                </section>
              )}
              {compiled && (
                <CoachPanel context={coachContextFor(compiled, tier, { situation: round.situation, outcome: phase.outcome ?? undefined })} questions={["why-it-works", "explain-result", "what-beats-it"]} />
              )}
              {phase.outcome && (
                <section className="card outcome">
                  <p className="eyebrow">What happened</p>
                  <p className="outcome-line">{outcomeLine(round.situation, phase.outcome)}</p>
                  <p className="muted">{phase.outcome.story}</p>
                </section>
              )}
              {phase.option.verdict !== "best" && (
                <p className="muted">
                  Best call here: <strong>{optionLabel(round.options.find((o) => o.verdict === "best")!)}</strong>
                </p>
              )}
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={next}>
                  {index + 1 >= rounds.length ? "See my score" : "Next situation"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

function SituationCard({ situation }: { situation: Situation }) {
  return (
    <section className="card situation">
      <div className="situation-main">
        <span className="situation-down">{downLabel(situation.down, situation.distance, situation.yardLine)}</span>
        <span className="situation-spot">Ball on {describeSpot(situation.yardLine)}</span>
      </div>
      {situation.context && <p className="situation-context">{situation.context}</p>}
    </section>
  );
}
