import { useMemo, useState } from "react";
import { formationById } from "../content";
import { compilePlay } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { describeSpot } from "../games/callThePlay";
import { applyCall, callablePlays, describeDownAndDistance, fieldGoalDistance, newDrive, type DriveCall, type DriveState } from "../games/drive";
import { recordGame, useTier } from "../progress";
import { playSound } from "../sound";
import { CoachPanel } from "../coach/CoachPanel";
import { coachContextFor } from "../coach/context";
import { situationOf } from "../games/drive";
import type { Play } from "../types/play";

interface Props {
  onBack: () => void;
}

/** Four drives make a quarter. Points are the score. */
const DRIVES_PER_GAME = 4;

function outcomeLine(entry: DriveState["log"][number]): string {
  const o = entry.outcome;
  if (!o) return "";
  if (o.touchdown) return "Touchdown!";
  if (o.turnover) return "Turnover.";
  const gained = o.yards >= 0 ? `Gain of ${o.yards}` : `Loss of ${-o.yards}`;
  return o.firstDown ? `${gained}. First down!` : `${gained}.`;
}

/** Call a whole drive against an AI defense that reads down and distance. */
export function DriveSimulator({ onBack }: Props) {
  const pool = useMemo(() => callablePlays(), []);
  const tier = useTier();
  const [state, setState] = useState<DriveState>(() => newDrive());
  const [driveNo, setDriveNo] = useState(1);
  const [points, setPoints] = useState(0);
  const [lastPlay, setLastPlay] = useState<Play | null>(null);
  const [finished, setFinished] = useState<{ best: number } | null>(null);
  const [filter, setFilter] = useState<"all" | "run" | "pass">("all");

  const last = state.log[state.log.length - 1];
  const compiled = useMemo(
    () => (lastPlay ? compilePlay(lastPlay, formationById(lastPlay.formationId), formationById(lastPlay.defenseFormationId)) : null),
    [lastPlay],
  );

  const call = (c: DriveCall) => {
    if (state.ended) return;
    const next = applyCall(state, c);
    setLastPlay(c.kind === "play" ? c.play : null);
    const entry = next.log[next.log.length - 1];
    if (entry.outcome) playSound(entry.outcome.turnover ? "wrong" : entry.outcome.firstDown || entry.outcome.touchdown ? "correct" : "tap");
    if (next.ended) {
      playSound(next.ended.points > 0 ? "badge" : "whistle");
      setPoints((p) => p + next.ended!.points);
    }
    setState(next);
  };

  const nextDrive = () => {
    if (driveNo >= DRIVES_PER_GAME) {
      const entry = recordGame("drive-simulator", points, DRIVES_PER_GAME * 7);
      setFinished({ best: entry.best });
      return;
    }
    setDriveNo(driveNo + 1);
    setState(newDrive());
    setLastPlay(null);
  };

  const restart = () => {
    setDriveNo(1);
    setPoints(0);
    setState(newDrive());
    setLastPlay(null);
    setFinished(null);
  };

  const visible = pool.filter((p) => filter === "all" || p.type === filter);
  const fgDist = fieldGoalDistance(state.yardLine);

  return (
    <main className="game">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <span className="pill">Drive {Math.min(driveNo, DRIVES_PER_GAME)} of {DRIVES_PER_GAME} · {points} points</span>
      </div>
      <h1>Drive Simulator</h1>

      {finished ? (
        <section className="card result">
          <p className="eyebrow">Final</p>
          <h2>{points} points in {DRIVES_PER_GAME} drives</h2>
          <p>{points >= 21 ? "That is a coach who reads the defense." : points >= 10 ? "Solid. Watch what the defense shows on third down." : "Every drive teaches something. Mix runs and passes, and punt when you must."}</p>
          <p className="muted">Best on this device: {finished.best} points</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={restart}>Play again</button>
            <button type="button" className="btn" onClick={onBack}>Home</button>
          </div>
        </section>
      ) : (
        <>
          <section className="card situation">
            <div className="situation-main">
              <span className="situation-down">{state.ended ? "Drive over" : describeDownAndDistance(state)}</span>
              <span className="situation-spot">Ball on {describeSpot(state.yardLine)}</span>
            </div>
            <p className="situation-context">
              {state.plays} play{state.plays === 1 ? "" : "s"} · {state.yardsGained} yards this drive
            </p>
          </section>

          {last && (
            <div className={`feedback ${last.outcome?.turnover ? "feedback-bad" : last.outcome?.firstDown || last.outcome?.touchdown ? "feedback-best" : "feedback-ok"}`}>
              <p className="feedback-title">{last.call}: {last.outcome ? outcomeLine(last) : last.note}</p>
              {last.outcome && <p>{last.outcome.story}</p>}
              {last.look && <p className="muted">Defense: {last.note}</p>}
            </div>
          )}

          {compiled && !state.ended && (
            <>
              <Diagram compiled={compiled} controls infoCard={false} />
              <CoachPanel context={coachContextFor(compiled, tier, { situation: situationOf(state), outcome: last?.outcome ?? undefined })} questions={["explain-result", "why-it-works", "what-beats-it"]} />
            </>
          )}

          {state.ended ? (
            <section className="card result">
              <h2>{state.ended.summary}</h2>
              {compiled && <Diagram compiled={compiled} controls infoCard={false} />}
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={nextDrive}>{driveNo >= DRIVES_PER_GAME ? "See final score" : "Next drive"}</button>
              </div>
              <details className="drive-log">
                <summary>Drive log</summary>
                <ol>
                  {state.log.map((e, i) => (
                    <li key={i}>
                      {["1st", "2nd", "3rd", "4th"][e.down - 1]} and {e.distance} at {describeSpot(e.yardLine)}: {e.call}. {e.outcome ? outcomeLine(e) : e.note}
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          ) : (
            <>
              <h2 className="prompt">Call the next play</h2>
              {state.down === 4 && (
                <div className="choices">
                  <button type="button" className="choice" onClick={() => call({ kind: "punt" })}>Punt<span className="choice-sub">Give the ball away, far from your goal</span></button>
                  {fgDist <= 62 && (
                    <button type="button" className="choice" onClick={() => call({ kind: "field-goal" })}>Kick a field goal<span className="choice-sub">{fgDist}-yard attempt</span></button>
                  )}
                </div>
              )}
              <div className="segmented" role="group" aria-label="Play type filter">
                {(["all", "run", "pass"] as const).map((f) => (
                  <button key={f} type="button" className={f === filter ? "seg seg-on" : "seg"} aria-pressed={f === filter} onClick={() => setFilter(f)}>
                    {f === "all" ? "All" : f === "run" ? "Runs" : "Passes"}
                  </button>
                ))}
              </div>
              <div className="choices playbook">
                {visible.map((p) => (
                  <button key={p.id} type="button" className="choice" onClick={() => call({ kind: "play", play: p })}>
                    {p.name}
                    <span className="choice-sub">{p.type === "run" ? "Run" : "Pass"} · {(p.tags ?? []).filter((t) => !["run", "pass"].includes(t)).join(", ") || "base"}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
