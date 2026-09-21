import { useMemo, useState } from "react";
import { compileDiagram, Diagram } from "../field/Diagram";
import { useTier } from "../progress";
import { playSound } from "../sound";
import { SpeakButton } from "../speech/SpeakButton";
import { useReadAloud } from "../speech/useReadAloud";
import { choicesForSpeech, joinForSpeech } from "../speech/voice";
import type { FormationPlayer, Lesson, Question } from "../types/play";
import { shuffle } from "../utils/random";

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
  const tier = useTier();
  // Varsity shuffles the answers so position in the list is never the clue.
  const choices = useMemo(() => (q.type === "choice" ? (tier === "rookie" ? q.choices : shuffle(q.choices)) : []), [q, tier]);
  const compiled = useMemo(() => (q.type === "tap" || q.diagram ? compileDiagram(q.type === "tap" ? q.diagram : q.diagram!) : null), [q]);

  const questionSpeech = joinForSpeech([`Question ${index + 1}.`, q.prompt, q.type === "tap" ? "Tap the player on the field." : choicesForSpeech(choices)]);
  const feedbackSpeech = phase.kind === "answered" ? joinForSpeech([phase.correct ? "Yes!" : "Not quite.", q.explanation]) : "";
  useReadAloud(phase.kind === "asking" ? questionSpeech : feedbackSpeech);

  const answer = (correct: boolean, picked: string) => {
    if (phase.kind !== "asking") return;
    if (correct) setScore((s) => s + 1);
    playSound(correct ? "correct" : "wrong");
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
      <div className="speak-row">
        <h2 className="prompt">{q.prompt}</h2>
        <SpeakButton text={questionSpeech} label="Read the question aloud" />
      </div>

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
          {choices.map((c) => {
            const isAnswer = c === q.choices[q.answer];
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
          <div className="speak-row">
            <div>
              <p className="feedback-title">{phase.correct ? "Yes!" : "Not quite."}</p>
              <p>{q.explanation}</p>
            </div>
            <SpeakButton text={feedbackSpeech} label="Read the answer aloud" small />
          </div>
          <button type="button" className="btn btn-primary" onClick={next}>
            {index + 1 >= total ? "See my score" : "Next question"}
          </button>
        </div>
      )}
    </section>
  );
}
