import { lessonsForUnit, unitById } from "../content";
import { useProgress } from "../progress";
import { BadgeIcon } from "./Home";

interface Props {
  unitId: string;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
}

export function UnitScreen({ unitId, onBack, onOpenLesson }: Props) {
  const unit = unitById(unitId);
  const lessons = lessonsForUnit(unitId);
  const progress = useProgress();
  const passed = lessons.filter((l) => progress.lessons[l.id]?.passed).length;
  const earned = Boolean(progress.badges[unitId]);

  return (
    <main className="unit">
      <div className="toolbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Home</button>
        <span className="pill">{passed} of {lessons.length} passed</span>
      </div>
      <h1>{unit.title}</h1>
      <p className="lede">{unit.blurb}</p>
      <p className={earned ? "badge-earned badge-line" : "muted badge-line"}>
        <BadgeIcon unitId={unitId} earned={earned} size={44} /> {earned ? `Badge earned: ${unit.badge}` : `Pass every lesson to earn the ${unit.badge} badge.`}
      </p>

      <ol className="lesson-list">
        {lessons.map((l) => {
          const p = progress.lessons[l.id];
          return (
            <li key={l.id}>
              <button type="button" className="lesson-card" onClick={() => onOpenLesson(l.id)}>
                <span className={p?.passed ? "check check-on" : "check"} aria-hidden="true">{p?.passed ? "✓" : l.order}</span>
                <span className="lesson-body">
                  <span className="lesson-title">{l.title}</span>
                  <span className="lesson-summary">{l.summary}</span>
                  {p && (
                    <span className="lesson-score">
                      Best: {p.bestScore} of {p.total}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
