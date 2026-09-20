import { useMemo, useState } from "react";
import { lessonById, lessonsForUnit, unitById } from "../content";
import { compileDiagram, Diagram } from "../field/Diagram";
import { awardBadgeIfEarned, PASS_RATIO, recordQuiz } from "../progress";
import { Quiz } from "./Quiz";

interface Props {
  lessonId: string;
  onBack: () => void;
  onNextLesson: (lessonId: string) => void;
}

type Mode = { kind: "steps"; index: number } | { kind: "quiz" } | { kind: "result"; score: number; total: number; passed: boolean; badge: boolean };

export function LessonScreen({ lessonId, onBack, onNextLesson }: Props) {
  const lesson = lessonById(lessonId);
  const unit = unitById(lesson.unitId);
  const siblings = lessonsForUnit(unit.id);
  const nextLesson = siblings.find((l) => l.order > lesson.order) ?? null;
  const [mode, setMode] = useState<Mode>({ kind: "steps", index: 0 });

  const step = mode.kind === "steps" ? lesson.steps[mode.index] : null;
  const compiled = useMemo(() => (step?.diagram ? compileDiagram(step.diagram) : null), [step]);

  const finish = (score: number, total: number) => {
    const entry = recordQuiz(lesson.id, score, total);
    const badge = awardBadgeIfEarned(unit.id, siblings.map((l) => l.id));
    setMode({ kind: "result", score, total, passed: entry.passed, badge });
  };

  return (
    <main className="lesson">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← {unit.title}</button>
        <span className="pill">Lesson {lesson.order}</span>
      </div>
      <h1>{lesson.title}</h1>

      {mode.kind === "steps" && step && (
        <>
          <ol className="dots" aria-label="Lesson progress">
            {lesson.steps.map((_, i) => (
              <li key={i} className={i === mode.index ? "dot-step dot-step-on" : i < mode.index ? "dot-step dot-step-done" : "dot-step"} aria-current={i === mode.index ? "step" : undefined} />
            ))}
          </ol>
          {compiled && <Diagram compiled={compiled} highlight={step.diagram?.highlight} />}
          <section className="card step-text">
            <p>{step.text}</p>
          </section>
          <div className="controls">
            <button type="button" className="btn" disabled={mode.index === 0} onClick={() => setMode({ kind: "steps", index: mode.index - 1 })}>
              Back
            </button>
            {mode.index + 1 < lesson.steps.length ? (
              <button type="button" className="btn btn-primary" onClick={() => setMode({ kind: "steps", index: mode.index + 1 })}>
                Next
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setMode({ kind: "quiz" })}>
                Take the quiz
              </button>
            )}
          </div>
        </>
      )}

      {mode.kind === "quiz" && <Quiz key={lesson.id} lesson={lesson} onFinish={finish} />}

      {mode.kind === "result" && (
        <section className="card result">
          <p className="eyebrow">Quiz done</p>
          <h2>
            {mode.score} out of {mode.total}
          </h2>
          {mode.passed ? (
            <p>You passed this lesson. Nice work.</p>
          ) : (
            <p>
              You need {Math.ceil(mode.total * PASS_RATIO)} right to pass. Read it once more and try again.
            </p>
          )}
          {mode.badge && (
            <p className="badge-earned">
              <span aria-hidden="true">★</span> Badge earned: {unit.badge}
            </p>
          )}
          <div className="controls">
            {!mode.passed && (
              <button type="button" className="btn btn-primary" onClick={() => setMode({ kind: "steps", index: 0 })}>
                Try again
              </button>
            )}
            {mode.passed && nextLesson && (
              <button type="button" className="btn btn-primary" onClick={() => onNextLesson(nextLesson.id)}>
                Next lesson: {nextLesson.title}
              </button>
            )}
            <button type="button" className="btn" onClick={onBack}>
              Back to {unit.title}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
