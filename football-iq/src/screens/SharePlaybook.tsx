import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { loadPlaybook, savePlay, type SavedPlay } from "../games/designer";
import { decodePlaybook, encodePlaybook, shareUrlFor } from "../games/share";
import { playSound } from "../sound";

/** Share your saved plays as a link or QR code. Everything is inside the link; nothing is uploaded. */
export function ShareControls() {
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const book = loadPlaybook();

  const make = async () => {
    if (book.length === 0) return;
    const payload = await encodePlaybook(book);
    const link = shareUrlFor(payload);
    setUrl(link);
    try {
      setQr(await QRCode.toDataURL(link, { width: 240, margin: 1, errorCorrectionLevel: "L" }));
    } catch {
      setQr(null);
      setNote("The link is too long for a QR code. Copy the link instead, or share fewer plays.");
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
      playSound("correct");
    } catch {
      setNote("Copy did not work here. Select the link and copy it by hand.");
    }
  };

  return (
    <section className="card share">
      <h2>Share My Playbook</h2>
      {book.length === 0 ? (
        <p className="muted">Save a play first, then you can share your whole playbook as a link or a QR code. The plays travel inside the link; nothing is uploaded.</p>
      ) : (
        <>
          <p className="muted">{book.length} play{book.length > 1 ? "s" : ""}. Anyone who opens the link gets a copy in their own Play Designer.</p>
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={make}>Make a share link</button>
            {url && <button type="button" className="btn" onClick={copy}>Copy link</button>}
          </div>
          {url && (
            <>
              <input className="text-input share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
              {qr && <img className="qr" src={qr} alt="QR code for the share link" width={240} height={240} />}
            </>
          )}
          {note && <p className="muted">{note}</p>}
        </>
      )}
    </section>
  );
}

interface ImportProps {
  payload: string;
  onDone: () => void;
}

/** Shown when the app is opened from a share link. */
export function ImportPlaybook({ payload, onDone }: ImportProps) {
  const [plays, setPlays] = useState<SavedPlay[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    decodePlaybook(payload).then(setPlays).catch(() => setError("That link does not hold a playbook this game can read."));
  }, [payload]);

  const add = () => {
    for (const p of plays ?? []) savePlay({ ...p, play: { ...p.play, id: `${p.play.id}-${Math.random().toString(36).slice(2, 6)}` } });
    playSound("badge");
    onDone();
  };

  return (
    <main className="game">
      <h1>Someone shared a playbook</h1>
      <section className="card">
        {error ? (
          <p>{error}</p>
        ) : !plays ? (
          <p className="muted">Reading the link...</p>
        ) : (
          <>
            <p>{plays.length} play{plays.length > 1 ? "s" : ""} inside:</p>
            <ul>
              {plays.map((p) => (
                <li key={p.play.id}><strong>{p.play.name}</strong> <span className="muted">· {p.play.type} · {p.play.variant}</span></li>
              ))}
            </ul>
            <p className="muted">Adding them puts copies in your own Play Designer and Play Lab. Nothing about you is sent back to the person who shared them.</p>
          </>
        )}
        <div className="controls">
          {plays && !error && <button type="button" className="btn btn-primary" onClick={add}>Add to My Playbook</button>}
          <button type="button" className="btn" onClick={onDone}>No thanks</button>
        </div>
      </section>
    </main>
  );
}
