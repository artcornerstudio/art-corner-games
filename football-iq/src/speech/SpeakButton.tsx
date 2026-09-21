import { useMemo } from "react";
import { speak, speechSupported, stopSpeaking } from "./engine";
import { useSpeaking } from "./useReadAloud";
import { joinForSpeech } from "./voice";

interface Props {
  /** What to read. Lines are joined with pauses. */
  text: string | Array<string | null | undefined | false>;
  /** Accessible name. Defaults to "Read aloud". */
  label?: string;
  /** Smaller button for inline use next to a heading. */
  small?: boolean;
}

/** A speaker button that reads the given text aloud, or stops if it is already talking. */
export function SpeakButton({ text, label = "Read aloud", small }: Props) {
  const speaking = useSpeaking();
  const line = useMemo(() => (Array.isArray(text) ? joinForSpeech(text) : joinForSpeech([text])), [text]);
  if (!speechSupported() || !line) return null;
  const onClick = () => {
    if (speaking) stopSpeaking();
    else speak(line);
  };
  return (
    <button
      type="button"
      className={`speak${small ? " speak-small" : ""}${speaking ? " speak-on" : ""}`}
      aria-label={speaking ? "Stop reading" : label}
      title={speaking ? "Stop reading" : label}
      aria-pressed={speaking}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {speaking ? (
          <path d="M16 8l4 8M20 8l-4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    </button>
  );
}

export default SpeakButton;
