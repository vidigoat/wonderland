"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readClassCode } from "@/lib/classes/summary";

type Choice = { id: string; title: string; concept: string };

/**
 * Pick a world, name the class, and get two links: one for students, with a QR code to put on the board, and one
 * for the results. Given a single world (its lesson guide), it skips the picker.
 */
export function ClassLinks({ worlds }: { worlds: Choice[] }) {
  const [worldId, setWorldId] = useState(worlds.find((world) => world.id === "peppered-forest")?.id ?? worlds[0]?.id ?? "");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const code = readClassCode(name.replace(/\s+/g, "-"));
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const links = useMemo(
    () => (code && worldId ? { student: `${origin}/w/${worldId}?class=${code}`, results: `${origin}/class/${code}` } : null),
    [code, worldId, origin],
  );

  // The QR code for whichever student link it was drawn for; a stale one is never shown.
  const [drawn, setDrawn] = useState<{ link: string; image: string } | null>(null);
  const student = links?.student;
  useEffect(() => {
    if (!student) return;
    let live = true;
    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(student, { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#fafafa" } }))
      .then((image) => live && setDrawn({ link: student, image }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [student]);
  const qr = drawn && drawn.link === student ? drawn.image : null;

  async function copy(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="teach-form">
      {worlds.length > 1 ? (
        <label className="teach-field">
          <span>World</span>
          <select value={worldId} onChange={(event) => setWorldId(event.target.value)}>
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.title}: {world.concept}
              </option>
            ))}
          </select>
          <small>
            <Link href={`/teach/${worldId}`}>Open the lesson guide for this world</Link>: the standard it fits, the wrong ideas to listen for and
            questions for afterwards.
          </small>
        </label>
      ) : null}
      <label className="teach-field">
        <span>Class code</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="room-7b" maxLength={32} autoComplete="off" />
        <small>Letters, numbers and dashes. Pick something only your class will guess; never a student&apos;s name.</small>
      </label>
      {links ? (
        <div className="teach-links">
          <div>
            <p className="teach-label">Give this to your students</p>
            <code>{links.student}</code>
            <button type="button" onClick={() => copy(links.student, "student")}>
              {copied === "student" ? "Copied" : "Copy student link"}
            </button>
            {qr ? (
              // A data URL made on this page: nothing for the image optimizer to fetch.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="teach-qr" src={qr} alt="QR code for the student link. Put it on the board and students scan it with a phone." width={180} height={180} />
            ) : null}
          </div>
          <div>
            <p className="teach-label">Keep this one: who found the law</p>
            <code>{links.results}</code>
            <button type="button" onClick={() => copy(links.results, "results")}>
              {copied === "results" ? "Copied" : "Copy results link"}
            </button>
          </div>
        </div>
      ) : (
        <p className="teach-hint">Type a class code to get the links.</p>
      )}
    </div>
  );
}
