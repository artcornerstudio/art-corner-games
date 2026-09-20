import { useState } from "react";
import { Home } from "./screens/Home";
import { PlayLab } from "./screens/PlayLab";

type Screen = "home" | "playlab";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  return screen === "home" ? <Home onOpenPlayLab={() => setScreen("playlab")} /> : <PlayLab onBack={() => setScreen("home")} />;
}
