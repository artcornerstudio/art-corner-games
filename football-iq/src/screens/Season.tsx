import { useMemo, useState } from "react";
import { formationById } from "../content";
import { compilePlay } from "../field/animation";
import { Diagram } from "../field/Diagram";
import { describeSpot } from "../games/callThePlay";
import { callablePlays, describeDownAndDistance, fieldGoalDistance, type DriveCall } from "../games/drive";
import { LOOK_LABEL, type DefenseLook } from "../games/outcome";
import { DRIVES_PER_TEAM, LOOKS, newGame, nextDrive, onOffense, OPPONENTS, seasonSummary, theirSnap, yourSnap, type GameState, type Opponent } from "../games/season";
import { recordSeasonGame, resetSeason, useProgress } from "../progress";
import { playSound } from "../sound";
import { SpeakButton } from "../speech/SpeakButton";
import { useReadAloud } from "../speech/useReadAloud";
import { joinForSpeech } from "../speech/voice";
import type { Play } from "../types/play";

interface Props {
  onBack: () => void;
}

const LOOK_TIP: Record<DefenseLook, string> = {
  base: "Fair against anything.",
  cover1: "Man coverage. Good vs runs, beaten by crossers.",
  cover2: "Two deep. Stops deep balls, soft on the sideline.",
  cover3: "Three deep. Stops deep balls, gives up short stuff.",
  blitz: "Six rushers. Great vs slow plays, burned by quick throws.",
  "light-box": "Extra defensive backs. Stops passes, weak vs the run.",
  "stacked-box": "Eight up front. Stops the run, weak vs the pass.",
};

/** Four games. You call offense on your drives and the defensive look on theirs. */
export function Season({ onBack }: Props) {
  const progress = useProgress();
  const season = progress.season ?? { games: [], startedAt: "", championships: 0 };
  const played = new Set(season.games.map((g) => g.opponentId));
  const seasonDone = season.games.length >= OPPONENTS.length;
  const [game, setGame] = useState<GameState | null>(null);
  const [theirPlay, setTheirPlay] = useState<Play | null>(null);
  const [yourPlay, setYourPlay] = useState<Play | null>(null);
  const [recorded, setRecorded] = useState(false);
  const pool = useMemo(() => callablePlays(), []);

  const start = (opp: Opponent) => {
    setGame(newGame(opp));
    setTheirPlay(null);
    setYourPlay(null);
    setRecorded(false);
    playSound("whistle");
  };

  const callOffense = (call: DriveCall) => {
    if (!game) return;
    const next = yourSnap(game, call);
    setYourPlay(call.kind === "play" ? call.play : null);
    setTheirPlay(null);
    const o = next.drive.log[next.drive.log.length - 1].outcome;
    if (o) playSound(o.turnover ? "wrong" : o.touchdown || o.firstDown ? "correct" : "tap");
    setGame(next);
  };

  const callDefense = (look: DefenseLook) => {
    if (!game) return;
    const next = theirSnap(game, look);
    setTheirPlay(next.theirPlay);
    setYourPlay(null);
    const o = next.drive.log[next.drive.log.length - 1].outcome;
    if (o) playSound(o.turnover ? "correct" : o.touchdown ? "wrong" : o.yards <= 2 ? "correct" : "tap");
    setGame(next);
  };

  const advance = () => {
    if (!game) return;
    const next = nextDrive(game);
    setTheirPlay(null);
    setYourPlay(null);
    if (next.finished && !recorded) {
      recordSeasonGame(game.opponent.id, game.yourPoints, game.theirPoints, OPPONENTS.length);
      setRecorded(true);
      playSound(game.yourPoints > game.theirPoints ? "badge" : "whistle");
    }
    setGame(next);
  };

  const shown = useMemo(() => {
    const p = yourPlay ?? theirPlay;
    return p ? compilePlay(p, formationById(p.formationId), formationById(p.defenseFormationId)) : null;
  }, [yourPlay, theirPlay]);

  if (!game) {
    const summary = seasonSummary(season);
    return (
      <main className="game season">
        <div className="toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
          {season.championships > 0 && <span className="pill">🏆 {season.championships} title{season.championships > 1 ? "s" : ""}</span>}
        </div>
        <h1>Season</h1>
        <p className="lede">Four games. Read each team's tendency, then call your offense and your defense.</p>
        <section className="card">
          <p className="eyebrow">Standings</p>
          <h2>{summary.wins}-{summary.losses}{summary.ties ? `-${summary.ties}` : ""}</h2>
          {seasonDone && (
            <p className={summary.wins >= 3 ? "badge-earned" : "muted"}>
              {summary.wins >= 3 ? "Season champion! Three or more wins." : "Season over. Win three of four for the title."}
            </p>
          )}
          {season.games.length > 0 && (
            <ul className="schedule">
              {season.games.map((g, i) => {
                const opp = OPPONENTS.find((o) => o.id === g.opponentId);
                return <li key={i}>{g.won ? "W" : g.yourPoints === g.theirPoints ? "T" : "L"} {g.yourPoints}-{g.theirPoints} vs {opp?.name ?? g.opponentId}</li>;
              })}
            </ul>
          )}
          {seasonDone && (
            <button type="button" className="btn btn-primary" onClick={resetSeason}>Start a new season</button>
          )}
        </section>
        <h2 className="section-title">Schedule</h2>
        <div className="grid">
          {OPPONENTS.map((opp) => (
            <div key={opp.id} className={played.has(opp.id) ? "card card-locked" : "card"}>
              <h3>{opp.name}</h3>
              <p>{opp.tendency}</p>
              {played.has(opp.id) ? <span className="pill">Played</span> : <button type="button" className="btn btn-primary" disabled={seasonDone} onClick={() => start(opp)}>Play</button>}
            </div>
          ))}
        </div>
      </main>
    );
  }

  const offense = onOffense(game);
  const d = game.drive;
  const fgDist = fieldGoalDistance(d.yardLine);
  const last = d.log[d.log.length - 1];
  const gameSpeech = game.finished
    ? joinForSpeech([game.yourPoints > game.theirPoints ? "You win!" : game.yourPoints < game.theirPoints ? "They got you this time." : "Tie game.", `${game.yourPoints} to ${game.theirPoints}.`])
    : joinForSpeech([
        last ? `${last.call}: ${game.last?.result ?? last.note}` : null,
        last?.outcome?.story,
        d.ended ? d.ended.summary : describeDownAndDistance(d),
        d.ended ? null : `${offense ? "You have the ball" : `${game.opponent.name} have it`} on ${describeSpot(d.yardLine)}`,
        !offense && !d.ended ? `They like to: ${game.opponent.tendency}` : null,
        d.ended ? null : offense ? "Call your play." : "Call your defense.",
      ]);
  useReadAloud(gameSpeech);

  return (
    <main className="game season">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={() => setGame(null)}>← Season</button>
        <span className="pill">Drive {Math.min(game.driveIndex + 1, DRIVES_PER_TEAM * 2)} of {DRIVES_PER_TEAM * 2}</span>
      </div>
      <section className="card scoreboard">
        <div className="score"><span className="team">You</span><span className="pts">{game.yourPoints}</span></div>
        <div className="score"><span className="team">{game.opponent.name}</span><span className="pts">{game.theirPoints}</span></div>
      </section>

      {game.finished ? (
        <section className="card result">
          <p className="eyebrow">Final</p>
          <h2>{game.yourPoints > game.theirPoints ? "You win!" : game.yourPoints < game.theirPoints ? "They got you this time." : "Tie game."} {game.yourPoints}-{game.theirPoints}</h2>
          <p>{game.yourPoints > game.theirPoints ? `You read the ${game.opponent.name} well.` : `The ${game.opponent.name} ${game.opponent.tendency.toLowerCase()} Call your defense to take that away next time.`}</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={() => setGame(null)}>Back to the season</button>
          </div>
        </section>
      ) : (
        <>
          <section className={offense ? "card situation speak-row" : "card situation situation-defense speak-row"}>
            <div>
              <div className="situation-main">
                <span className="situation-down">{d.ended ? "Drive over" : describeDownAndDistance(d)}</span>
                <span className="situation-spot">{offense ? "You have the ball" : `${game.opponent.name} have it`} on {describeSpot(d.yardLine)}</span>
              </div>
              {!offense && !d.ended && <p className="situation-context">They like to: {game.opponent.tendency}</p>}
            </div>
            <SpeakButton text={gameSpeech} label="Read the game situation aloud" />
          </section>

          {last && (
            <div className={`feedback ${last.outcome?.turnover ? (offense ? "feedback-bad" : "feedback-best") : last.outcome?.touchdown ? (offense ? "feedback-best" : "feedback-bad") : "feedback-ok"}`}>
              <p className="feedback-title">{last.call}: {game.last?.result ?? last.note}</p>
              {last.outcome && <p>{last.outcome.story}</p>}
              {last.look && <p className="muted">{last.note}</p>}
            </div>
          )}

          {shown && <Diagram compiled={shown} controls infoCard={false} />}

          {d.ended ? (
            <section className="card result">
              <h2>{d.ended.summary}</h2>
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={advance}>{game.driveIndex + 1 >= DRIVES_PER_TEAM * 2 ? "Final score" : offense ? "Now play defense" : "Now you have the ball"}</button>
              </div>
            </section>
          ) : offense ? (
            <>
              <h2 className="prompt">Call your play</h2>
              {d.down === 4 && (
                <div className="choices">
                  <button type="button" className="choice" onClick={() => callOffense({ kind: "punt" })}>Punt</button>
                  {fgDist <= 62 && <button type="button" className="choice" onClick={() => callOffense({ kind: "field-goal" })}>Kick a field goal<span className="choice-sub">{fgDist}-yard attempt</span></button>}
                </div>
              )}
              <div className="choices playbook">
                {pool.map((p) => (
                  <button key={p.id} type="button" className="choice" onClick={() => callOffense({ kind: "play", play: p })}>
                    {p.name}<span className="choice-sub">{p.type === "run" ? "Run" : "Pass"} · {(p.tags ?? []).filter((t) => !["run", "pass"].includes(t)).join(", ") || "base"}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="prompt">Call your defense</h2>
              <div className="choices">
                {LOOKS.map((look) => (
                  <button key={look} type="button" className="choice" onClick={() => callDefense(look)}>
                    {LOOK_LABEL[look]}<span className="choice-sub">{LOOK_TIP[look]}</span>
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
