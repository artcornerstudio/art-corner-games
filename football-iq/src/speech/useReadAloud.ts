import { useEffect, useSyncExternalStore } from "react";
import { autoSpeak, isSpeaking, stopSpeaking, subscribeSpeaking } from "./engine";

/**
 * Read `text` out loud when it changes, if auto-read is on. Pass an empty
 * string to say nothing. Speech stops when the screen goes away.
 */
export function useReadAloud(text: string) {
  useEffect(() => {
    if (!text) return;
    autoSpeak(text);
  }, [text]);
  useEffect(() => () => stopSpeaking(), []);
}

/** Whether the speech engine is talking right now, for the speaker button's icon. */
export function useSpeaking(): boolean {
  return useSyncExternalStore(subscribeSpeaking, isSpeaking, () => false);
}
