"use client";

import { useMemo, useState } from "react";
import { readClassCode } from "@/lib/classes/summary";

type Choice = { id: string; title: string; concept: string };

/** Pick a world, name the class, and get two links: one for students, one for the results. */
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
      <label className="teach-field">
        <span>World</span>
        <select value={worldId} onChange={(event) => setWorldId(event.target.value)}>
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.title}: {world.concept}
            </option>
          ))}
        </select>
      </label>
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
