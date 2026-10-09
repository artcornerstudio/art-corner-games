import { useEffect, useMemo, useState } from "react";
import { PRICE } from "./config";
import { finishUnlock, hidePaywall, restoreWithCode, startCheckout, usePaywall, type Reason } from "./store";

function reasonLine(reason: Reason): string {
  switch (reason.kind) {
    case "unit":
      return `"${reason.title}" is part of the full game.`;
    case "game":
      return `${reason.title} is part of the full game.`;
    case "feature":
      return `${reason.title} is part of the full game.`;
    case "rounds":
      return "You have played the free rounds. The full game has no limit.";
    default:
      return "Try the free lessons first. Unlock the rest whenever you are ready.";
  }
}

/** A speed bump for kids: a purchase is a grown-up's job. Not a lock. */
function useGate() {
  const [a] = useState(() => 3 + Math.floor(Math.random() * 6));
  const [b] = useState(() => 4 + Math.floor(Math.random() * 6));
  const [answer, setAnswer] = useState("");
  return { a, b, answer, setAnswer, passed: Number(answer) === a * b };
}

export function PaywallDialog() {
  const pw = usePaywall();
  const gate = useGate();
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!pw.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pw.view === "buy") hidePaywall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pw.open, pw.view]);

  const line = useMemo(() => reasonLine(pw.reason), [pw.reason]);
  if (!pw.open) return null;

  if (pw.view === "unlocked") {
    return (
      <div className="paywall" role="dialog" aria-modal="true" aria-labelledby="pw-title">
        <div className="paywall-card">
          <p className="eyebrow">Thank you</p>
          <h2 id="pw-title">Full game unlocked</h2>
          <p>Every unit, every game, and Coach Eric's voice are open now. Here is your license code. Keep it somewhere safe: it unlocks the game on another device.</p>
          <p className="license-code" aria-label="License code">{pw.licenseCode ?? "Check your email receipt"}</p>
          <button type="button" className="btn btn-primary" onClick={finishUnlock}>Start playing</button>
        </div>
      </div>
    );
  }

  return (
    <div className="paywall" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <div className="paywall-card">
        <p className="eyebrow">Full game</p>
        <h2 id="pw-title">Unlock Football IQ</h2>
        <p className="muted">{line}</p>
        <p className="paywall-price"><strong>{PRICE}</strong> <span className="muted">one time</span></p>
        <ul className="paywall-list">
          <li>All 9 units and 39 lessons, with 195 quiz questions</li>
          <li>All 8 mini games, including Drive Simulator, Play Designer, and Season</li>
          <li>Tackle, Flag 5v5, and Flag 7v7</li>
          <li>Coach view with printable play cards</li>
          <li>Coach Eric reads every lesson aloud</li>
          <li>No subscription and no ads. Works on every device with your license code.</li>
        </ul>
        <p className="muted">30-day money-back guarantee, no questions asked. <a href="./privacy.html#purchases">Details</a></p>

        <div className="paywall-gate">
          <label>
            For a grown-up: what is {gate.a} times {gate.b}?
            <input className="text-input" inputMode="numeric" autoComplete="off" value={gate.answer} onChange={(e) => gate.setAnswer(e.target.value)} />
          </label>
          <button type="button" className="btn btn-primary" disabled={!gate.passed || pw.busy} onClick={() => void startCheckout()}>
            {pw.busy ? "One moment..." : `Buy now for ${PRICE}`}
          </button>
        </div>

        <form
          className="paywall-restore"
          onSubmit={(e) => {
            e.preventDefault();
            void restoreWithCode(code);
          }}
        >
          <label>
            Already bought it? Type your license code
            <input className="text-input" autoComplete="off" autoCapitalize="characters" placeholder="XXXX-XXXX-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button type="submit" className="btn" disabled={pw.busy || code.trim().length < 8}>Unlock with code</button>
        </form>

        {pw.error && <p className="paywall-error" role="alert">{pw.error}</p>}
        <button type="button" className="btn btn-ghost" onClick={hidePaywall}>Keep playing the free part</button>
      </div>
    </div>
  );
}
