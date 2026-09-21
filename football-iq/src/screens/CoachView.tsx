import { useMemo, useState } from "react";
import { lessons, units } from "../content";
import { OPPONENTS, seasonSummary } from "../games/season";
import { exportProgress, importProgress, useProgress } from "../progress";

interface Props {
  onBack: () => void;
  onPrintCards: () => void;
}

const GAME_NAMES: Record<string, string> = {
  "call-the-play-tackle11": "Call the Play (11-on-11)",
  "call-the-play-flag5": "Call the Play (Flag 5v5)",
  "spot-the-position-tackle11": "Spot the Position (11-on-11)",
  "spot-the-position-flag5": "Spot the Position (Flag 5v5)",
  "beat-the-coverage": "Beat the Coverage",
  "hot-read-tackle11": "Hot Read (11-on-11)",
  "hot-read-flag5": "Hot Read (Flag 5v5)",
  "fourth-down": "Fourth-Down Decision",
  "drive-simulator": "Drive Simulator",
};

/** A parental gate: a quick arithmetic question keeps kids on the game side. Not a lock, a speed bump. */
function useGate() {
  const [a] = useState(() => 3 + Math.floor(Math.random() * 6));
  const [b] = useState(() => 4 + Math.floor(Math.random() * 6));
  const [answer, setAnswer] = useState("");
  const [open, setOpen] = useState(false);
  const check = () => setOpen(Number(answer) === a * b);
  return { a, b, answer, setAnswer, open, check };
}

/** For parents and coaches: what has been learned on this device, printable, exportable. No accounts, no cloud. */
export function CoachView({ onBack, onPrintCards }: Props) {
  const gate = useGate();
  const progress = useProgress();
  const [note, setNote] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      units.map((u) => {
        const ls = lessons.filter((l) => l.unitId === u.id);
        const passed = ls.filter((l) => progress.lessons[l.id]?.passed).length;
        const attempted = ls.filter((l) => progress.lessons[l.id]).length;
        const scoreSum = ls.reduce((n, l) => n + (progress.lessons[l.id]?.bestScore ?? 0), 0);
        const totalSum = ls.reduce((n, l) => n + (progress.lessons[l.id]?.total ?? 0), 0);
        return { unit: u, lessons: ls, passed, attempted, pct: totalSum ? Math.round((scoreSum / totalSum) * 100) : null, badge: Boolean(progress.badges[u.id]) };
      }),
    [progress],
  );
  const games = Object.entries(progress.games ?? {});
  const season = progress.season;

  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `football-iq-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNote("Progress file downloaded. Keep it somewhere safe; it holds no names or personal details.");
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ok = importProgress(await file.text());
    setNote(ok ? "Progress restored from the file." : "That file is not a Football IQ progress file.");
  };

  if (!gate.open) {
    return (
      <main className="coachview">
        <div className="toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        </div>
        <h1>Coach view</h1>
        <section className="card">
          <p className="eyebrow">For grown-ups</p>
          <p>This page shows progress, prints a summary, and moves progress between devices. To open it, answer the question.</p>
          <label className="field-label">
            What is {gate.a} times {gate.b}?
            <input className="text-input" inputMode="numeric" value={gate.answer} onChange={(e) => gate.setAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && gate.check()} />
          </label>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={gate.check}>Open</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="coachview">
      <div className="toolbar no-print">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <div className="controls">
          <button type="button" className="btn" onClick={() => window.print()}>Print summary</button>
          <button type="button" className="btn" onClick={onPrintCards}>Print play cards</button>
        </div>
      </div>
      <h1>Coach view</h1>
      <p className="muted">Progress on this device as of {new Date().toLocaleDateString()}. Nothing here leaves the device unless you export it.</p>

      <section className="card">
        <h2>Units</h2>
        <table className="results-table">
          <thead>
            <tr><th>Unit</th><th>Lessons passed</th><th>Quiz average</th><th>Badge</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.unit.id}>
                <td>{r.unit.title}</td>
                <td>{r.passed} of {r.lessons.length}{r.attempted > r.passed ? ` (${r.attempted - r.passed} in progress)` : ""}</td>
                <td>{r.pct === null ? "not started" : `${r.pct}%`}</td>
                <td>{r.badge ? `★ ${r.unit.badge}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Lessons</h2>
        {rows.filter((r) => r.attempted > 0).length === 0 ? (
          <p className="muted">No lessons attempted yet.</p>
        ) : (
          rows.filter((r) => r.attempted > 0).map((r) => (
            <div key={r.unit.id} className="lesson-block">
              <h3>{r.unit.title}</h3>
              <ul className="plain">
                {r.lessons.map((l) => {
                  const p = progress.lessons[l.id];
                  return (
                    <li key={l.id}>
                      {p?.passed ? "✓" : p ? "…" : "○"} {l.title}
                      {p && <span className="muted"> · best {p.bestScore} of {p.total}, {new Date(p.completedAt).toLocaleDateString()}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Mini games</h2>
        {games.length === 0 ? (
          <p className="muted">No games played yet.</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr><th>Game</th><th>Best</th><th>Times played</th><th>Last played</th></tr>
            </thead>
            <tbody>
              {games.map(([id, g]) => (
                <tr key={id}>
                  <td>{GAME_NAMES[id] ?? id}</td>
                  <td>{g.best} of {g.total}</td>
                  <td>{g.plays}</td>
                  <td>{new Date(g.playedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {season && season.games.length > 0 && (
          <p>
            Season: {(() => { const s = seasonSummary(season); return `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ""}`; })()}
            {" "}({season.games.map((g) => `${g.won ? "W" : "L"} vs ${OPPONENTS.find((o) => o.id === g.opponentId)?.name ?? g.opponentId}`).join(", ")}){season.championships > 0 ? ` · ${season.championships} championship${season.championships > 1 ? "s" : ""}` : ""}
          </p>
        )}
      </section>

      <section className="card no-print">
        <h2>Move progress to another device</h2>
        <p className="muted">Export writes a small file with lessons passed, badges, and game scores. Import replaces this device's progress with that file. Nothing is uploaded anywhere.</p>
        <div className="controls">
          <button type="button" className="btn" onClick={download}>Export progress file</button>
          <label className="btn">
            Import progress file
            <input type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>
        {note && <p className="badge-earned">{note}</p>}
      </section>

      <section className="card no-print">
        <h2>What the game collects</h2>
        <p className="muted">Nothing. There are no accounts and no analytics. Progress is stored in this browser only. The optional AI Coach sends only the play's facts to the coach server, never anything about the child.</p>
      </section>
    </main>
  );
}
