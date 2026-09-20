import { useState } from "react";
import { BeatTheCoverage } from "./screens/BeatTheCoverage";
import { CallThePlay } from "./screens/CallThePlay";
import { FourthDown } from "./screens/FourthDown";
import { Home } from "./screens/Home";
import { HotRead } from "./screens/HotRead";
import { SpotThePosition } from "./screens/SpotThePosition";
import { LessonScreen } from "./screens/LessonScreen";
import { PlayLab } from "./screens/PlayLab";
import { UnitScreen } from "./screens/UnitScreen";
import { lessonById } from "./content";

type Screen =
  | { name: "home" }
  | { name: "playlab" }
  | { name: "unit"; unitId: string }
  | { name: "lesson"; lessonId: string }
  | { name: "call-the-play" }
  | { name: "spot-the-position" }
  | { name: "beat-the-coverage" }
  | { name: "hot-read" }
  | { name: "fourth-down" };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0 });
  };

  switch (screen.name) {
    case "playlab":
      return <PlayLab onBack={() => go({ name: "home" })} />;
    case "call-the-play":
      return <CallThePlay onBack={() => go({ name: "home" })} />;
    case "spot-the-position":
      return <SpotThePosition onBack={() => go({ name: "home" })} />;
    case "beat-the-coverage":
      return <BeatTheCoverage onBack={() => go({ name: "home" })} />;
    case "hot-read":
      return <HotRead onBack={() => go({ name: "home" })} />;
    case "fourth-down":
      return <FourthDown onBack={() => go({ name: "home" })} />;
    case "unit":
      return <UnitScreen unitId={screen.unitId} onBack={() => go({ name: "home" })} onOpenLesson={(lessonId) => go({ name: "lesson", lessonId })} />;
    case "lesson":
      return (
        <LessonScreen
          key={screen.lessonId}
          lessonId={screen.lessonId}
          onBack={() => go({ name: "unit", unitId: lessonById(screen.lessonId).unitId })}
          onNextLesson={(lessonId) => go({ name: "lesson", lessonId })}
        />
      );
    default:
      return (
        <Home
          onOpenPlayLab={() => go({ name: "playlab" })}
          onOpenUnit={(unitId) => go({ name: "unit", unitId })}
          onOpenGame={(game) => go({ name: game })}
        />
      );
  }
}
