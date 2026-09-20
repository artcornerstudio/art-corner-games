import { useCallback, useEffect, useRef, useState } from "react";

/** A simple play clock: seconds since the snap, driven by requestAnimationFrame. */
export function usePlayClock(duration: number, resetKey: string) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    setTime(0);
    setPlaying(false);
  }, [resetKey]);

  useEffect(() => {
    if (!playing) return;
    let handle = 0;
    last.current = performance.now();
    const step = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setTime((t) => {
        const next = t + dt;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      handle = requestAnimationFrame(step);
    };
    handle = requestAnimationFrame(step);
    return () => cancelAnimationFrame(handle);
  }, [playing, duration]);

  const play = useCallback(() => {
    setTime((t) => (t >= duration ? 0 : t));
    setPlaying(true);
  }, [duration]);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => {
    setPlaying(false);
    setTime(0);
  }, []);
  const scrub = useCallback(
    (t: number) => {
      setPlaying(false);
      setTime(Math.min(Math.max(0, t), duration));
    },
    [duration],
  );

  return { time, playing, play, pause, reset, scrub, duration };
}
