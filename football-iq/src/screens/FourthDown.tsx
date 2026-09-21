import { useMemo, useState } from "react";
import { formationById, playById } from "../content";
import { compilePlay } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { CALL_LABEL, FOURTH_DOWN_SCENARIOS, judge, scoreboardLine, type FourthDownCall, type FourthDownScenario } from "../games/fourthDown";
import { describeSpot } from "../games/callThePlay";
import { fieldGoalChance, puntResult, resolvePlay } from "../games/outcome";
import { recordGame } from "../progress";
import { playSound } from "../sound";
import { SpeakButton } from "../speech/SpeakButton";
import { useReadAloud } from "../speech/useReadAloud";
import { choicesForSpeech, joinForSpeech } from "../speech/voice";
import type { Verdict } from "../types/play";
import { shuffle } from "../utils/random";

interface Props {
  onBack: () => void;
}

const ROUNDS = 6;
const POINTS: Record<Verdict, number> = { best: 2, ok: 1, bad: 0 };
const CALLS: FourthDownCall[] = ["go", "punt", "field-goal"];

interface Resolution {
  call: FourthDownCall;
  verdict: Verdict;
  reason: string;
  story: string;
  playId: string;
}

function resolveCall(s: FourthDownScenario, call: FourthDownCall): { story: string; playId: string } {
  if (call === "punt") {
    const r = puntResult(s.yardLine);
    return { story: r.touchback ? "Booming punt into the end zone. Touchback; they start at their 20." : `Good punt. They take over at their own ${Math.max(1, 100 - s.yardLine - r.netYards)}.`, playId: "punt-tackle" };
  }
  if (call === "field-goal") {
    const good = Math.random() < fieldGoalChance(s.yardLine);
    return { story: good ? `The kick is up... and it's good! Three points.` : "The kick drifts wide. No good, and they take over.", playId: "field-goal-tackle" };
  }
  const playId = s.distance <= 2 ? "power-o" : s.distance <= 6 ? "mesh" : "four-verticals";
  const play = playById(playId);
  const o = resolvePlay({ play, situation: { id: s.id, variant: "tackle11", down: 4, distance: s.distance, yardLine: s.yardLine, options: [] } });
  const story = o.touchdown ? o.story : o.firstDown ? `${o.story} First down!` : o.turnover ? o.story : `${o.story} ${o.yards >= 0 ? `Gain of ${o.yards}` : `Loss of ${-o.yards}`}, short of the line. Turnover on downs.`;
  return { story, playId };
}

/** Six fourth-down moments. Go, punt, or kick, then see what happens and why a coach would choose. */
export function FourthDown({ onBack }: Props) {
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => shuffle(FOURTH_DOWN_SCENARIOS).slice(0, ROUNDS), [seed]);
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [res, setRes] = useState<Resolution | null>(null);
  const [finished, setFinished] = useState<{ best: number } | null>(null);
  const s = rounds[index];

  const compiled = useMemo(() => {
    if (!res) return null;
    const play = playById(res.playId);
    return compilePlay(play, formationById(play.formationId), formationById(play.defenseFormationId));
  }, [res]);

  const askSpeech = joinForSpeech([`4th and ${s.yardLine + s.distance >= 100 ? "goal" : s.distance}`, `Ball on ${describeSpot(s.yardLine)}`, scoreboardLine(s), s.note, "What do you do?", choicesForSpeech(CALLS.map((c) => CALL_LABEL[c]))]);
  const answerSpeech = res ? joinForSpeech([res.verdict === "best" ? "That's the call. Plus 2." : res.verdict === "ok" ? "Defensible. Plus 1." : "A coach would not do that.", res.reason, `What happened: ${res.story}`]) : "";
  useReadAloud(finished ? "" : res ? answerSpeech : askSpeech);

  const choose = (call: FourthDownCall) => {
    if (res) return;
    const j = judge(s, call);
    const r = resolveCall(s, call);
    setPoints((p) => p + POINTS[j.verdict]);
    playSound(j.verdict === "bad" ? "wrong" : "correct");
    setRes({ call, verdict: j.verdict, reason: j.reason, story: r.story, playId: r.playId });
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      const entry = recordGame("fourth-down", points, ROUNDS * 2);
      setFinished({ best: entry.best });
      return;
    }
    setIndex(index + 1);
    setRes(null);
  };

  const restart = () => {
    setSeed((x) => x + 1);
    setIndex(0);
    setPoints(0);
    setRes(null);
    setFinished(null);
  };

  return (
    <main className="game">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
      </div>
      <h1>Fourth-Down Decision</h1>

      {finished ? (
        <section className="card result">
          <p className="eyebrow">Game over</p>
          <h2>{points} of {ROUNDS * 2} points</h2>
          <p>{points === ROUNDS * 2 ? "Every call was the coach's call. Perfect." : points >= 9 ? "You have a feel for the numbers." : "Down, distance, score, clock. Check all four before you decide."}</p>
          <p className="muted">Best on this device: {finished.best} of {ROUNDS * 2}</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={restart}>Play again</button>
            <button type="button" className="btn" onClick={onBack}>Home</button>
          </div>
        </section>
      ) : (
        <>
          <p className="eyebrow">Decision {index + 1} of {rounds.length} · {points} points</p>
          <section className="card situation">
            <div className="situation-main">
              <span className="situation-down">4th and {s.yardLine + s.distance >= 100 ? "goal" : s.distance}</span>
              <span className="situation-spot">Ball on {describeSpot(s.yardLine)}</span>
            </div>
            <p className="situation-context">{scoreboardLine(s)}{s.note ? ` · ${s.note}` : ""}</p>
          </section>

          {!res ? (
            <>
              <div className="speak-row">
                <h2 className="prompt">What do you do?</h2>
                <SpeakButton text={askSpeech} label="Read the situation aloud" />
              </div>
              <div className="choices">
                {CALLS.map((c) => (
                  <button key={c} type="button" className="choice" onClick={() => choose(c)}>
                    {CALL_LABEL[c]}
                    {c === "field-goal" && <span className="choice-sub">{100 - s.yardLine + 17}-yard attempt</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={`feedback feedback-${res.verdict}`}>
                <div className="speak-row">
                  <div>
                    <p className="feedback-title">{res.verdict === "best" ? "That's the call. +2" : res.verdict === "ok" ? "Defensible. +1" : "A coach would not do that."}</p>
                    <p>{res.reason}</p>
                    <p><strong>What happened:</strong> {res.story}</p>
                  </div>
                  <SpeakButton text={answerSpeech} label="Read the result aloud" small />
                </div>
              </div>
              {compiled && <Diagram compiled={compiled} controls infoCard={false} />}
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={next}>{index + 1 >= rounds.length ? "See my score" : "Next decision"}</button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
