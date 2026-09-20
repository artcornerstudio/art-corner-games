interface Props {
  onOpenPlayLab: () => void;
}

const UNITS = [
  { id: "rules", title: "Field and rules", blurb: "Yard lines, downs, scoring, and the penalties everyone should know.", badge: "Rules Rookie" },
  { id: "offense", title: "Offense basics", blurb: "The 11 positions, 4 formations, run vs pass, and 6 routes.", badge: "Offense Starter" },
  { id: "defense", title: "Defense basics", blurb: "The 11 positions, X's on a diagram, 4-3 vs 3-4, man vs zone.", badge: "Defense Starter" },
];

export function Home({ onOpenPlayLab }: Props) {
  return (
    <main className="home">
      <header className="hero">
        <p className="eyebrow">Football IQ</p>
        <h1>Flag and Field</h1>
        <p className="lede">Learn the X's and O's. Watch a play, call a play, earn a badge.</p>
      </header>

      <section aria-labelledby="play-lab-heading" className="card card-primary">
        <h2 id="play-lab-heading">Play Lab</h2>
        <p>Watch real plays animate on the field. Tap any player to learn their job.</p>
        <button type="button" className="btn btn-primary" onClick={onOpenPlayLab}>
          Open Play Lab
        </button>
      </section>

      <section aria-labelledby="units-heading">
        <h2 id="units-heading" className="section-title">Units</h2>
        <div className="grid">
          {UNITS.map((u) => (
            <article key={u.id} className="card card-locked" aria-disabled="true">
              <h3>{u.title}</h3>
              <p>{u.blurb}</p>
              <span className="pill">Coming in week 2</span>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="section-title">Badge shelf</h2>
        <ul className="badges">
          {UNITS.map((u) => (
            <li key={u.id} className="badge badge-empty" title={`${u.badge}: finish the ${u.title} unit`}>
              <span className="badge-icon" aria-hidden="true">★</span>
              <span className="badge-name">{u.badge}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">
        <p>No accounts, no ads, nothing leaves your device. Progress is saved in this browser only.</p>
      </footer>
    </main>
  );
}
