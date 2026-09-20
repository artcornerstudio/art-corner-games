import { useMemo, useState } from "react";
import { compileDiagram, Diagram } from "../field/Diagram";
import type { FormationPlayer, Lesson, Question } from "../types/play";

interface Props {
  lesson: Lesson;
  onFinish: (score: number, total: number) => void;
}

type Phase = { kind: "asking" } | { kind: "answered"; correct: boolean; picked: string };

/** Five questions, one at a time, with a one-line "why" after every answer. */
export function Quiz({ lesson, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "asking" });
  const q: Question = lesson.quiz[index];
  const total = lesson.quiz.length;
  const compiled = useMemo(() => (q.type === "tap" || q.diagram ? compileDiagram(q.type === "tap" ? q.diagram : q.diagram!) : null), [q]);

  const answer = (correct: boolean, picked: string) => {
    if (phase.kind !== "asking") return;
    if (correct) setScore((s) => s + 1);
    setPhase({ kind: "answered", correct, picked });
  };

  const next = () => {
    if (index + 1 >= total) {
      onFinish(score, total);
      return;
    }
    setIndex(index + 1);
    setPhase({ kind: "asking" });
  };

  const onTap = (player: FormationPlayer) => {
    if (q.type !== "tap") return;
    answer(player.id === q.target, player.id);
  };

  return (
    <section className="quiz" aria-live="polite">
      <p className="eyebrow">Question {index + 1} of {total}</p>
      <h2 className="prompt">{q.prompt}</h2>

      {compiled && (
        <Diagram
          compiled={compiled}
          controls={false}
          infoCard={false}
          highlight={q.type === "tap" && phase.kind === "answered" ? [q.target] : q.type === "choice" ? q.diagram?.highlight : undefined}
          onTapPlayer={q.type === "tap" ? onTap : undefined}
          selectedPlayerId={q.type === "tap" && phase.kind === "answered" ? phase.picked : null}
        />
      )}

      {q.type === "tap" && phase.kind === "asking" && <p className="muted">Tap the player on the field.</p>}

      {q.type === "choice" && (
        <div className="choices">
          {q.choices.map((c, i) => {
            const isAnswer = i === q.answer;
            const picked = phase.kind === "answered" && phase.picked === c;
            const cls = ["choice", phase.kind === "answered" && isAnswer ? "choice-right" : "", picked && !isAnswer ? "choice-wrong" : ""].join(" ");
            return (
              <button key={c} type="button" className={cls} disabled={phase.kind === "answered"} onClick={() => answer(isAnswer, c)}>
                {c}
              </button>
            );
          })}
        </div>
      )}

      {phase.kind === "answered" && (
        <div className={phase.correct ? "feedback feedback-right" : "feedback feedback-wrong"}>
          <p className="feedback-title">{phase.correct ? "Yes!" : "Not quite."}</p>
          <p>{q.explanation}</p>
          <button type="button" className="btn btn-primary" onClick={next}>
            {index + 1 >= total ? "See my score" : "Next question"}
          </button>
        </div>
      )}
    </section>
  );
}
