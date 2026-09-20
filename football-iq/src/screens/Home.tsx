import { lessonsForUnit, units } from "../content";
import { resetProgress, useProgress } from "../progress";

interface Props {
  onOpenPlayLab: () => void;
  onOpenUnit: (unitId: string) => void;
}

export function Home({ onOpenPlayLab, onOpenUnit }: Props) {
  const progress = useProgress();

  const reset = () => {
    if (window.confirm("Erase all progress and badges on this device?")) resetProgress();
  };

  return (
    <main className="home">
      <header className="hero">
        <p className="eyebrow">Football IQ</p>
        <h1>Flag and Field</h1>
        <p className="lede">Learn the X's and O's. Watch a play, call a play, earn a badge.</p>
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
                <span className="badge-icon" aria-hidden="true">★</span>
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
