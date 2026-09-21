import { lessonsForUnit, units } from "../content";
import { resetProgress, setSound, setTier, useProgress } from "../progress";
import { setSoundEnabled } from "../sound";
import type { Tier } from "../types/play";

export type GameId = "call-the-play" | "spot-the-position" | "beat-the-coverage" | "hot-read" | "fourth-down" | "drive-simulator" | "play-designer";

interface Props {
  onOpenPlayLab: () => void;
  onOpenUnit: (unitId: string) => void;
  onOpenGame: (game: GameId) => void;
}

const GAMES: { id: GameId; title: string; blurb: string; key: string }[] = [
  { id: "call-the-play", title: "Call the Play", blurb: "Read the down, distance, and situation. Pick the play. Watch it happen.", key: "call-the-play-tackle11" },
  { id: "spot-the-position", title: "Spot the Position", blurb: "Ten rounds. Tap the position named before you forget where it lives.", key: "spot-the-position-tackle11" },
  { id: "beat-the-coverage", title: "Beat the Coverage", blurb: "Read the safeties before the snap and pick the play that beats the shell.", key: "beat-the-coverage" },
  { id: "hot-read", title: "Hot Read", blurb: "The blitz is coming. Tap the receiver who gets the ball right now.", key: "hot-read-tackle11" },
  { id: "fourth-down", title: "Fourth-Down Decision", blurb: "Go, punt, or kick? Read the score, the clock, and the spot.", key: "fourth-down" },
  { id: "drive-simulator", title: "Drive Simulator", blurb: "Call a whole drive against a defense that reads down and distance. Four drives, keep score.", key: "drive-simulator" },
  { id: "play-designer", title: "Play Designer", blurb: "Line up the O's, draw the routes, test it against three defenses, save it to your playbook.", key: "play-designer" },
];

const TIER_NOTE: Record<Tier, string> = {
  rookie: "Hints on, answers in order, no clock.",
  varsity: "Hints off, answers shuffled, and a 45-second clock in Spot the Position.",
  pro: "Everything in Varsity, plus quizzes must be perfect to pass.",
};

/** Badge art from public/art; falls back to a star while the image loads or if it is missing. */
export function BadgeIcon({ unitId, earned, size = 36 }: { unitId: string; earned: boolean; size?: number }) {
  return (
    <span className={earned ? "badge-art" : "badge-art badge-art-locked"} aria-hidden="true" style={{ width: size, height: size }}>
      <img src={`./art/badge-${unitId}.png`} alt="" width={size} height={size} onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.removeAttribute("hidden"); }} />
      <span className="badge-icon" hidden>★</span>
    </span>
  );
}

export function Home({ onOpenPlayLab, onOpenUnit, onOpenGame }: Props) {
  const progress = useProgress();
  const tier: Tier = progress.tier ?? "rookie";
  const sound = progress.sound ?? true;
  setSoundEnabled(sound);

  const reset = () => {
    if (window.confirm("Erase all progress and badges on this device?")) resetProgress();
  };

  return (
    <main className="home">
      <header className="hero hero-with-mascot">
        <div>
          <p className="eyebrow">Football IQ</p>
          <h1>Flag and Field</h1>
          <p className="lede">Learn the X's and O's. Watch a play, call a play, earn a badge.</p>
        </div>
        <img className="mascot" src="./art/mascot.png" alt="" width={120} height={120} onError={(e) => (e.currentTarget.style.display = "none")} />
      </header>

      <section aria-labelledby="units-heading">
        <h2 id="units-heading" className="section-title">Units</h2>
        <div className="grid">
          {units.map((u) => {
            const lessons = lessonsForUnit(u.id);
            const passed = lessons.filter((l) => progress.lessons[l.id]?.passed).length;
            const earned = Boolean(progress.badges[u.id]);
            return (
              <button key={u.id} type="button" className="card card-unit" onClick={() => onOpenUnit(u.id)}>
                <h3>{u.title}</h3>
                <p>{u.blurb}</p>
                <span className="progress-bar" aria-hidden="true">
                  <span style={{ width: `${lessons.length ? (passed / lessons.length) * 100 : 0}%` }} />
                </span>
                <span className="pill">{earned ? `★ ${u.badge}` : `${passed} of ${lessons.length} lessons`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="section-title">Mini games</h2>
        <div className="grid grid-2">
          {GAMES.map((g) => {
            const best = progress.games?.[g.key];
            return (
              <button key={g.id} type="button" className="card card-unit" onClick={() => onOpenGame(g.id)}>
                <h3>{g.title}</h3>
                <p>{g.blurb}</p>
                <span className="pill">{g.id === "play-designer" ? "Create" : best ? `Best: ${best.best} of ${best.total}` : "Not played yet"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="tier-heading" className="card tier-card">
        <h2 id="tier-heading">Difficulty</h2>
        <div className="segmented" role="group" aria-label="Difficulty">
          {(["rookie", "varsity", "pro"] as Tier[]).map((t) => (
            <button key={t} type="button" className={t === tier ? "seg seg-on" : "seg"} aria-pressed={t === tier} onClick={() => setTier(t)}>
              {t === "rookie" ? "Rookie" : t === "varsity" ? "Varsity" : "Pro"}
            </button>
          ))}
        </div>
        <p className="muted tier-note">{TIER_NOTE[tier]}</p>
        <label className="sound-toggle">
          <input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundEnabled(e.target.checked); }} />
          Sound effects
        </label>
      </section>

      <section aria-labelledby="play-lab-heading" className="card card-primary">
        <h2 id="play-lab-heading">Play Lab</h2>
        <p>Watch real plays animate on the field. Tap any player to learn their job.</p>
        <button type="button" className="btn btn-primary" onClick={onOpenPlayLab}>
          Open Play Lab
        </button>
      </section>

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="section-title">Badge shelf</h2>
        <ul className="badges">
          {units.map((u) => {
            const earned = Boolean(progress.badges[u.id]);
            return (
              <li key={u.id} className={earned ? "badge badge-on" : "badge badge-empty"} title={earned ? `${u.badge}: earned` : `${u.badge}: finish the ${u.title} unit`}>
                <BadgeIcon unitId={u.id} earned={earned} />
                <span className="badge-name">{u.badge}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="footer">
        <p>No accounts, no ads, nothing leaves your device. Progress is saved in this browser only.</p>
        <button type="button" className="btn btn-ghost btn-small" onClick={reset}>Reset progress</button>
      </footer>
    </main>
  );
}
