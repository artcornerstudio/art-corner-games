import { useMemo, useState } from "react";
import { VARIANT_LABEL, formationById, positions } from "../content";
import { compilePlay } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { blitzers, buildHotReadRounds } from "../games/reads";
import { recordGame, useTier } from "../progress";
import { playSound } from "../sound";
import type { FormationPlayer, Variant } from "../types/play";

interface Props {
  onBack: () => void;
}

const ROUNDS = 6;
const VARIANTS: Variant[] = ["tackle11", "flag5"];

/** The blitz is coming. Tap the receiver you throw to right now. */
export function HotRead({ onBack }: Props) {
  const tier = useTier();
  const [variant, setVariant] = useState<Variant>("tackle11");
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => buildHotReadRounds(variant, ROUNDS), [variant, seed]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<FormationPlayer | null>(null);
  const [finished, setFinished] = useState<{ best: number } | null>(null);
  const play = rounds[index];
  const compiled = useMemo(() => (play ? compilePlay(play, formationById(play.formationId), formationById(play.defenseFormationId)) : null), [play]);
  const rushers = useMemo(() => (compiled ? blitzers(compiled.defense.players) : []), [compiled]);

  const restart = (v: Variant) => {
    setVariant(v);
    setSeed((x) => x + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setFinished(null);
  };

  const onTap = (p: FormationPlayer) => {
    if (picked || !play) return;
    const correct = p.id === play.hot;
    if (correct) setScore((s) => s + 1);
    playSound(correct ? "correct" : "wrong");
    setPicked(p);
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      const entry = recordGame(`hot-read-${variant}`, score, ROUNDS);
      setFinished({ best: entry.best });
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  };

  const hotPlayer = compiled && play ? compiled.offense.players.find((p) => p.id === play.hot) : null;

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
      <h1>Hot Read</h1>

      {finished ? (
        <section className="card result">
          <p className="eyebrow">Game over</p>
          <h2>{score} of {ROUNDS}</h2>
          <p>{score === ROUNDS ? "Ball out in under two seconds every time." : score >= 4 ? "Good eyes. The hot receiver is the shortest, quickest route." : "When the blitz comes, find the shortest route. That is your hot read."}</p>
          <p className="muted">Best on this device: {finished.best} of {ROUNDS}</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={() => restart(variant)}>Play again</button>
            <button type="button" className="btn" onClick={onBack}>Home</button>
          </div>
        </section>
      ) : play && compiled ? (
        <>
          <p className="eyebrow">Snap {index + 1} of {ROUNDS} · {score} right · {play.name}</p>
          <h2 className="prompt">{picked ? (picked.id === play.hot ? "That's your hot read." : "Not that one.") : "Blitz! The ringed defenders are coming. Tap your hot receiver."}</h2>
          <Diagram
            compiled={compiled}
            controls={Boolean(picked)}
            infoCard={false}
            onTapPlayer={picked ? undefined : onTap}
            highlight={picked ? [play.hot!] : rushers}
            dimOthers={Boolean(picked)}
            selectedPlayerId={picked?.id ?? null}
          />
          {!picked ? (
            <p className="muted">{tier === "rookie" ? "Hint: the hot receiver runs the shortest, quickest route, so the ball is out before the rush gets there." : "Tap a receiver."}</p>
          ) : (
            <>
              <div className={picked.id === play.hot ? "feedback feedback-right" : "feedback feedback-wrong"}>
                <p className="feedback-title">{picked.id === play.hot ? "Yes!" : `The hot read is ${hotPlayer?.label ?? hotPlayer?.position}, the ${positions[hotPlayer?.position ?? "WR"].name.toLowerCase()}.`}</p>
                <p>{play.description}</p>
              </div>
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={next}>{index + 1 >= rounds.length ? "See my score" : "Next snap"}</button>
              </div>
            </>
          )}
        </>
      ) : (
        <p>No plays yet for {VARIANT_LABEL[variant]}.</p>
      )}
    </main>
  );
}
