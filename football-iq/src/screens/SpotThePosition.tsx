import { useEffect, useMemo, useState } from "react";
import { VARIANT_LABEL, positions } from "../content";
import { compileFormations } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { buildRounds, roundPrompt, SPOT_ROUNDS, VARSITY_SECONDS } from "../games/spotThePosition";
import { recordGame, useTier } from "../progress";
import { playSound } from "../sound";
import { SpeakButton } from "../speech/SpeakButton";
import { useReadAloud } from "../speech/useReadAloud";
import { joinForSpeech } from "../speech/voice";
import type { FormationPlayer, Variant } from "../types/play";

interface Props {
  onBack: () => void;
}

const VARIANTS: Variant[] = ["tackle11", "flag5"];

type Phase = { kind: "asking" } | { kind: "answered"; correct: boolean; pickedId: string };

/** Ten rounds of "tap the position". Varsity adds a 45-second clock and hides the job hint. */
export function SpotThePosition({ onBack }: Props) {
  const tier = useTier();
  const [variant, setVariant] = useState<Variant>("tackle11");
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => buildRounds(variant), [variant, seed]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "asking" });
  const [finished, setFinished] = useState<{ best: number; timedOut: boolean } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(VARSITY_SECONDS);
  const timed = tier !== "rookie";

  const restart = (v: Variant) => {
    setVariant(v);
    setSeed((x) => x + 1);
    setIndex(0);
    setScore(0);
    setPhase({ kind: "asking" });
    setFinished(null);
    setSecondsLeft(VARSITY_SECONDS);
  };

  const finish = (finalScore: number, timedOut: boolean) => {
    const entry = recordGame(`spot-the-position-${variant}`, finalScore, SPOT_ROUNDS);
    setFinished({ best: entry.best, timedOut });
  };

  useEffect(() => {
    if (!timed || finished) return;
    const handle = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(handle);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(handle);
  }, [timed, finished, seed]);

  useEffect(() => {
    if (timed && secondsLeft === 0 && !finished) finish(score, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const round = rounds[index];
  const compiled = useMemo(() => (round ? compileFormations(round.offense, round.defense) : null), [round]);

  const onTap = (player: FormationPlayer) => {
    if (phase.kind !== "asking" || !round) return;
    const correct = player.position === round.position;
    if (correct) setScore((s) => s + 1);
    playSound(correct ? "correct" : "wrong");
    setPhase({ kind: "answered", correct, pickedId: player.id });
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      finish(score, false);
      return;
    }
    setIndex(index + 1);
    setPhase({ kind: "asking" });
  };

  const askSpeech = round ? joinForSpeech([roundPrompt(round), tier === "rookie" ? `Hint: ${positions[round.position].job}` : "Tap the player on the field."]) : "";
  const answerSpeech = round && phase.kind === "answered" ? joinForSpeech([phase.correct ? "Yes!" : "Not quite.", `${positions[round.position].name}: ${positions[round.position].job}`]) : "";
  useReadAloud(finished ? "" : phase.kind === "asking" ? askSpeech : answerSpeech);

  const targets = round && phase.kind === "answered" ? [...round.offense.players, ...round.defense.players].filter((p) => p.position === round.position).map((p) => p.id) : undefined;

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
      <h1>Spot the Position</h1>

      {finished ? (
        <section className="card result">
          <p className="eyebrow">{finished.timedOut ? "Time's up" : "Game over"}</p>
          <h2>{score} of {SPOT_ROUNDS}</h2>
          <p>{score === SPOT_ROUNDS ? "Perfect. You know every spot on the field." : score >= 7 ? "Strong. A few more reps and it is automatic." : "Keep going. Every position has a home on the field."}</p>
          <p className="muted">Best on this device: {finished.best} of {SPOT_ROUNDS}</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={() => restart(variant)}>Play again</button>
            <button type="button" className="btn" onClick={onBack}>Home</button>
          </div>
        </section>
      ) : round && compiled ? (
        <>
          <p className="eyebrow">
            Round {index + 1} of {SPOT_ROUNDS} · {score} right{timed && <> · <span className={secondsLeft <= 10 ? "clock clock-low" : "clock"}>{secondsLeft}s</span></>}
          </p>
          <div className="speak-row">
            <h2 className="prompt">{roundPrompt(round)}</h2>
            <SpeakButton text={phase.kind === "asking" ? askSpeech : answerSpeech} label="Read this round aloud" />
          </div>
          <Diagram
            compiled={compiled}
            controls={false}
            infoCard={false}
            onTapPlayer={onTap}
            highlight={targets}
            selectedPlayerId={phase.kind === "answered" ? phase.pickedId : null}
          />
          {phase.kind === "asking" ? (
            <p className="muted">{tier === "rookie" ? `Hint: ${positions[round.position].job}` : "Tap the player on the field."}</p>
          ) : (
            <div className={phase.correct ? "feedback feedback-right" : "feedback feedback-wrong"}>
              <p className="feedback-title">{phase.correct ? "Yes!" : "Not quite."}</p>
              <p>
                {positions[round.position].name}: {positions[round.position].job}
              </p>
              <button type="button" className="btn btn-primary" onClick={next}>
                {index + 1 >= rounds.length ? "See my score" : "Next"}
              </button>
            </div>
          )}
        </>
      ) : (
        <p>No formations yet for {VARIANT_LABEL[variant]}.</p>
      )}
    </main>
  );
}
