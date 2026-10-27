"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STUDY_EXPLANATION, STUDY_QUESTIONS, type StudyArm } from "@/lib/study/score";

const MINUTES = 6;

export function StudyFlow({ id, arm, test }: { id: string; arm: StudyArm; test: boolean }) {
  const assignment = { id, arm, test };
  const [ready, setReady] = useState(false);
  const [left, setLeft] = useState(MINUTES * 60);
  const [choices, setChoices] = useState<(number | null)[]>([null, null, null, null]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (assignment.test) params.set("test", "1");
    params.set("id", assignment.id);
    params.set("arm", assignment.arm);
    window.history.replaceState(null, "", `/study?${params.toString()}`);
  }, [assignment.id, assignment.arm, assignment.test]);

  useEffect(() => {
    if (assignment.arm !== "play") return;
    const timer = window.setInterval(() => {
      setLeft((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [assignment.arm]);

  async function submit() {
    if (!assignment || choices.some((choice) => choice == null) || confidence == null) return;
    setError(null);
    const res = await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...assignment, choices, confidence }),
    });
    if (!res.ok) {
      setError("The reply did not save. Try again.");
      return;
    }
    const body = (await res.json()) as { correct?: number };
    setResult(`${body.correct ?? 0} of 4`);
  }

  const questionsOpen = assignment.arm === "read" ? ready : left === 0;

  return (
    <main className="study">
      <p className="kicker">Six minutes · no name</p>
      <h1>{assignment.arm === "read" ? "Read the explanation" : "Play the forest"}</h1>
      {assignment.arm === "read" ? (
        <>
          <p className="study-essay">{STUDY_EXPLANATION}</p>
          {ready ? null : (
            <button type="button" className="press" onClick={() => setReady(true)}>
              I&apos;ve read it. Ask me.
            </button>
          )}
        </>
      ) : (
        <>
          <p className="study-essay">
            You have {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}. Predict, experiment, then say what you think. The questions
            open when the time is up.
          </p>
          {left > 0 ? (
            <button type="button" className="press" onClick={() => setLeft(0)}>
              I&apos;ve played enough. Ask me.
            </button>
          ) : null}
          <iframe title="Peppered Forest" src="/w/peppered-forest" className="study-frame" />
        </>
      )}
      {questionsOpen ? (
        <form
          className="study-questions"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {STUDY_QUESTIONS.map((question, index) => (
            <fieldset key={question.id}>
              <legend>{question.prompt}</legend>
              {question.options.map((option, optionIndex) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={question.id}
                    checked={choices[index] === optionIndex}
                    onChange={() => setChoices((current) => current.map((choice, choiceIndex) => (choiceIndex === index ? optionIndex : choice)))}
                  />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <fieldset>
            <legend>How sure are you? 1 is a guess, 5 is sure.</legend>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value}>
                <input type="radio" name="confidence" checked={confidence === value} onChange={() => setConfidence(value)} />
                {value}
              </label>
            ))}
          </fieldset>
          {error ? <p className="slip">{error}</p> : null}
          {result ? <p className="study-essay">Recorded. You had {result}. The comparison is on the results page, and only from real replies.</p> : (
            <button type="submit" className="press" disabled={choices.some((choice) => choice == null) || confidence == null}>
              Send my answers
            </button>
          )}
          <p>
            <Link href="/study/results">See the results</Link>
          </p>
        </form>
      ) : null}
    </main>
  );
}
