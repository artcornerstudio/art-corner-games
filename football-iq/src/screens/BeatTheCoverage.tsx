import { useMemo, useState } from "react";
import { formationById, playById } from "../content";
import { compilePlay } from "../field/animation";
import { compileDiagram, Diagram } from "../field/Diagram";
import { buildCoverageRounds, COVERAGE_OPTION_LABEL, COVERAGE_OPTIONS, type CoverageRound } from "../games/reads";
import { recordGame, useTier } from "../progress";
import { playSound } from "../sound";
import { shuffle } from "../utils/random";

interface Props {
  onBack: () => void;
}

const ROUNDS = 6;

/** Look at the defense before the snap, name the coverage in your head, pick the play that beats it. */
export function BeatTheCoverage({ onBack }: Props) {
  const tier = useTier();
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => buildCoverageRounds(ROUNDS), [seed]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ best: number } | null>(null);
  const round: CoverageRound | undefined = rounds[index];
  const options = useMemo(() => shuffle(COVERAGE_OPTIONS), [index, seed]);

  const still = useMemo(() => (round ? compileDiagram({ formationId: round.formationId }) : null), [round]);
  const answer = useMemo(() => {
    if (!round || !picked) return null;
    const play = playById(round.answerPlayId);
    return compilePlay(play, formationById(play.formationId), formationById(play.defenseFormationId));
  }, [round, picked]);

  const choose = (playId: string) => {
    if (picked || !round) return;
    const correct = playId === round.answerPlayId;
    if (correct) setScore((s) => s + 1);
    playSound(correct ? "correct" : "wrong");
    setPicked(playId);
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      const entry = recordGame("beat-the-coverage", score, ROUNDS);
      setFinished({ best: entry.best });
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  };

  const restart = () => {
    setSeed((x) => x + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setFinished(null);
  };

  return (
    <main className="game">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
      </div>
      <h1>Beat the Coverage</h1>

      {finished ? (
        <section className="card result">
          <p className="eyebrow">Game over</p>
          <h2>{score} of {ROUNDS}</h2>
          <p>{score === ROUNDS ? "You read every shell. Quarterback eyes." : score >= 4 ? "You see the safeties. Keep looking at the corners too." : "Count the deep safeties first. One, two, or three tells you almost everything."}</p>
          <p className="muted">Best on this device: {finished.best} of {ROUNDS}</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={restart}>Play again</button>
            <button type="button" className="btn" onClick={onBack}>Home</button>
          </div>
        </section>
      ) : round && still ? (
        <>
          <p className="eyebrow">Look {index + 1} of {ROUNDS} · {score} right</p>
          <h2 className="prompt">{picked ? `This was ${round.name}.` : "Read the defense. What beats it?"}</h2>
          {!picked ? (
            <>
              <Diagram compiled={still} controls={false} infoCard={false} highlight={round.highlight} dimOthers={false} />
              {tier === "rookie" && <p className="muted">Hint: {round.tell}</p>}
              <div className="choices">
                {options.map((id) => (
                  <button key={id} type="button" className="choice" onClick={() => choose(id)}>
                    {COVERAGE_OPTION_LABEL[id]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={picked === round.answerPlayId ? "feedback feedback-right" : "feedback feedback-wrong"}>
                <p className="feedback-title">{picked === round.answerPlayId ? "Yes!" : `Not quite. ${COVERAGE_OPTION_LABEL[round.answerPlayId]} beats it.`}</p>
                <p>{round.tell} {round.why}</p>
              </div>
              {answer && <Diagram compiled={answer} controls infoCard={false} />}
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={next}>{index + 1 >= rounds.length ? "See my score" : "Next look"}</button>
              </div>
            </>
          )}
        </>
      ) : null}
    </main>
  );
}
