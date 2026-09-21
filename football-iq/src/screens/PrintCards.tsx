import { useEffect, useMemo } from "react";
import { formationById, playsForVariant } from "../content";
import { compilePlay } from "../field/animation";
import { loadPlaybook } from "../games/designer";
import { PlayViewer } from "../field/PlayViewer";

interface Props {
  onBack: () => void;
}

/** Printable play cards: your saved plays plus the built-in playbook, one card each. Print to paper or PDF from the browser. */
export function PrintCards({ onBack }: Props) {
  const cards = useMemo(() => {
    const custom = loadPlaybook().map((s) => ({ play: s.play, offense: s.offense, custom: true }));
    const builtIn = [...playsForVariant("tackle11"), ...playsForVariant("flag5")].filter((p) => !(p.tags ?? []).some((t) => ["special-teams", "two-point"].includes(t))).map((p) => ({ play: p, offense: formationById(p.formationId), custom: false }));
    return [...custom, ...builtIn].map((c) => ({ ...c, compiled: compilePlay(c.play, c.offense, formationById(c.play.defenseFormationId)) }));
  }, []);

  useEffect(() => {
    document.body.classList.add("print-cards");
    return () => document.body.classList.remove("print-cards");
  }, []);

  return (
    <main className="cards-page">
      <div className="toolbar no-print">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print</button>
      </div>
      <h1 className="no-print">Play cards</h1>
      <p className="muted no-print">{cards.length} cards. Each card shows the play at the snap with routes finished, plus what happens and why. Use the browser's print dialog to save a PDF.</p>
      <div className="cards">
        {cards.map(({ play, compiled, custom }) => (
          <article key={play.id} className="play-card">
            <header>
              <h2>{custom ? "★ " : ""}{play.name}</h2>
              <span className="muted">{compiled.offense.name} vs {compiled.defense.name} · {play.type === "run" ? "Run" : "Pass"}</span>
            </header>
            <div className="play-card-field">
              <PlayViewer compiled={compiled} time={compiled.duration} widthPx={320} />
            </div>
            <p><strong>What happens.</strong> {play.description}</p>
            <p><strong>Why it works.</strong> {play.why}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
