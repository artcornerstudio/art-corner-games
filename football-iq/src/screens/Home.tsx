import { lessonsForUnit, units } from "../content";
import { resetProgress, setReadAloudSetting, setSound, setTier, useProgress } from "../progress";
import { speak, speechSupported } from "../speech/engine";
import type { Tier } from "../types/play";

export type GameId = "call-the-play" | "spot-the-position" | "beat-the-coverage" | "hot-read" | "fourth-down" | "drive-simulator" | "play-designer" | "season";

interface Props {
  onOpenPlayLab: () => void;
  onOpenUnit: (unitId: string) => void;
  onOpenGame: (game: GameId) => void;
  onOpenCoachView: () => void;
}

const GAMES: { id: GameId; title: string; blurb: string; key: string }[] = [
  { id: "call-the-play", title: "Call the Play", blurb: "Read the down, distance, and situation. Pick the play. Watch it happen.", key: "call-the-play-tackle11" },
  { id: "spot-the-position", title: "Spot the Position", blurb: "Ten rounds. Tap the position named before you forget where it lives.", key: "spot-the-position-tackle11" },
  { id: "beat-the-coverage", title: "Beat the Coverage", blurb: "Read the safeties before the snap and pick the play that beats the shell.", key: "beat-the-coverage" },
  { id: "hot-read", title: "Hot Read", blurb: "The blitz is coming. Tap the receiver who gets the ball right now.", key: "hot-read-tackle11" },
  { id: "fourth-down", title: "Fourth-Down Decision", blurb: "Go, punt, or kick? Read the score, the clock, and the spot.", key: "fourth-down" },
  { id: "drive-simulator", title: "Drive Simulator", blurb: "Call a whole drive against a defense that reads down and distance. Four drives, keep score.", key: "drive-simulator" },
  { id: "play-designer", title: "Play Designer", blurb: "Line up the O's, draw the routes, test it against three defenses, save it to your playbook.", key: "play-designer" },
  { id: "season", title: "Season", blurb: "Four games against teams with tendencies. Call your offense and your defense. Win three for the title.", key: "season" },
];

/** Card color themes, cycled across units and games. All pairs pass contrast with white text. */
const THEMES = ["green", "gold", "blue", "orange", "plum"] as const;

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

export function Home({ onOpenPlayLab, onOpenUnit, onOpenGame, onOpenCoachView }: Props) {
  const progress = useProgress();
  const tier: Tier = progress.tier ?? "rookie";
  const sound = progress.sound ?? true;
  const readAloud = progress.readAloud ?? false;
  const canSpeak = speechSupported();
  const toggleReadAloud = (on: boolean) => {
    setReadAloudSetting(on);
    // Say something right away so the kid hears the voice they just turned on.
    if (on) speak("Read aloud is on. I will read lessons and questions to you.");
  };

  const reset = () => {
    if (window.confirm("Erase all progress and badges on this device?")) resetProgress();
  };

  return (
    <main className="home stadium">
      <header className="hero hero-with-mascot">
        <div className="hero-text">
          <p className="eyebrow">Football IQ</p>
          <h1 className="display">Flag and Field<span className="sparkle" aria-hidden="true">✦</span></h1>
          <p className="lede">Learn the X's and O's. Watch a play, call a play, earn a badge.</p>
        </div>
        <div className="mascot-stand" aria-hidden="true">
          <img className="mascot" src="./art/mascot.png" alt="" width={140} height={140} onError={(e) => (e.currentTarget.style.display = "none")} />
          <span className="mascot-turf" />
        </div>
      </header>

      <section aria-labelledby="units-heading">
        <h2 id="units-heading" className="banner">Game plan: the units</h2>
        <div className="grid">
          {units.map((u, i) => {
            const lessons = lessonsForUnit(u.id);
            const passed = lessons.filter((l) => progress.lessons[l.id]?.passed).length;
            const earned = Boolean(progress.badges[u.id]);
            const theme = THEMES[i % THEMES.length];
            return (
              <button key={u.id} type="button" className={`ucard ucard-${theme}`} onClick={() => onOpenUnit(u.id)}>
                <span className="ucard-art" aria-hidden="true">
                  <img src={`./art/badge-${u.id}.png`} alt="" width={72} height={72} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                </span>
                <span className="ucard-body">
                  <span className="ucard-title">{u.title}</span>
                  <span className="ucard-blurb">{u.blurb}</span>
                </span>
                <span className="ucard-foot">
                  <span className="ucard-progress">
                    <span className="segments" aria-hidden="true">
                      {lessons.map((l, k) => (
                        <span key={l.id} className={k < passed ? "seg-fill on" : "seg-fill"} />
                      ))}
                    </span>
                    <span className="ucard-count">Lessons: {passed} of {lessons.length}</span>
                  </span>
                  <span className={earned ? "badge-slot badge-slot-on" : "badge-slot"} title={earned ? `${u.badge}: earned` : `${u.badge}: finish every lesson`}>
                    {earned ? <BadgeIcon unitId={u.id} earned size={40} /> : <span className="shield" aria-hidden="true" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="banner">Mini games</h2>
        <div className="grid grid-2">
          {GAMES.map((g, i) => {
            const best = progress.games?.[g.key];
            const theme = THEMES[(i + 2) % THEMES.length];
            return (
              <button key={g.id} type="button" className={`gcard gcard-${theme}`} onClick={() => onOpenGame(g.id)}>
                <span className="gcard-title">{g.title}</span>
                <span className="gcard-blurb">{g.blurb}</span>
                <span className="pill">
                  {g.id === "play-designer" ? "Create" : g.id === "season" ? (progress.season?.games.length ? `${progress.season.games.filter((x) => x.won).length}-${progress.season.games.filter((x) => !x.won && x.yourPoints !== x.theirPoints).length} so far` : "Not played yet") : best ? `Best: ${best.best} of ${best.total}` : "Not played yet"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="play-lab-heading" className="card card-primary lab-card">
        <div>
          <h2 id="play-lab-heading">Play Lab</h2>
          <p>Watch real plays animate on the field. Tap any player to learn their job.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenPlayLab}>
          Open Play Lab
        </button>
      </section>

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="banner">Badge shelf</h2>
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
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          Sound effects
        </label>
        <label className="sound-toggle">
          <input type="checkbox" checked={readAloud && canSpeak} disabled={!canSpeak} onChange={(e) => toggleReadAloud(e.target.checked)} />
          <span>
            Read aloud
            <span className="muted toggle-note">{canSpeak ? "Coach reads lessons, questions, and answers out loud. Look for the speaker button." : "Not available in this browser."}</span>
          </span>
        </label>
      </section>

      <footer className="footer">
        <p>No accounts, no ads, nothing leaves your device. Progress is saved in this browser only.</p>
        <div className="controls">
          <button type="button" className="btn btn-small" onClick={onOpenCoachView}>Coach view (grown-ups)</button>
          <button type="button" className="btn btn-ghost btn-small" onClick={reset}>Reset progress</button>
        </div>
      </footer>
    </main>
  );
}
