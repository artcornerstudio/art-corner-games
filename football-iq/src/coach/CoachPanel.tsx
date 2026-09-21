import { useEffect, useRef, useState } from "react";
import { askCoach, type CoachContext, type CoachQuestion } from "./client";

const LABELS: Record<CoachQuestion, string> = {
  "what-happens": "What happens?",
  "why-it-works": "Why does it work?",
  "who-is-open": "Who is open?",
  "what-beats-it": "What beats it?",
  "explain-position": "What does this position do?",
  "explain-result": "What happened?",
};

const DEFAULT_QUESTIONS: CoachQuestion[] = ["what-happens", "why-it-works", "what-beats-it"];

interface Props {
  context: CoachContext;
  /** Which question chips to show. Defaults to what happens, why it works, and what beats it. */
  questions?: CoachQuestion[];
}

interface Shown {
  question: CoachQuestion;
  answer: string;
  source: "coach" | "offline";
}

/**
 * "Ask Coach" card: a fixed menu of question chips about the current play.
 * The kid never types anything; each chip sends the play facts to the coach
 * proxy (or the offline templates) and shows one short answer.
 */
export function CoachPanel({ context, questions = DEFAULT_QUESTIONS }: Props) {
  const [busy, setBusy] = useState<CoachQuestion | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // When the play (or position, or result) changes, drop the old answer.
  const contextKey = JSON.stringify(context);
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(null);
    setShown(null);
  }, [contextKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(question: CoachQuestion) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(question);
    const result = await askCoach(question, context, { signal: controller.signal });
    if (controller.signal.aborted || abortRef.current !== controller) return;
    abortRef.current = null;
    setShown({ question, ...result });
    setBusy(null);
  }

  return (
    <section className="card coach" aria-labelledby="coach-title">
      <div className="coach-head">
        <img className="coach-mascot" src="./art/mascot.png" alt="" width={48} height={48} onError={(e) => (e.currentTarget.style.display = "none")} />
        <div>
          <p className="eyebrow">Ask Coach</p>
          <h2 id="coach-title" className="coach-title">Got a question about this play?</h2>
        </div>
      </div>

      <div className="coach-chips" role="group" aria-label="Questions for Coach">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            className={`btn coach-chip${shown?.question === q ? " coach-chip-on" : ""}`}
            disabled={busy !== null}
            aria-pressed={shown?.question === q}
            onClick={() => ask(q)}
          >
            {LABELS[q]}
          </button>
        ))}
      </div>

      <div className="coach-answer" aria-live="polite">
        {busy !== null && <p className="muted coach-thinking">Coach is thinking...</p>}
        {busy === null && shown && (
          <>
            <p className="coach-text">{shown.answer}</p>
            {shown.source === "offline" && <p className="muted coach-offline">Offline coach</p>}
          </>
        )}
      </div>
    </section>
  );
}

export default CoachPanel;
