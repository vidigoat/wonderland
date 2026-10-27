"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { compileRules, type Observation, type Params, type RulesModule } from "@/engine/rules";
import { WorldSession } from "@/engine/runtime";
import type { PublicWorldSpec } from "@/engine/spec";
import { SCROLL_HOLD_MS } from "@/engine/render/helpers";
import { asWorldView, type WorldView } from "@/engine/view";
import { builtinRules } from "@/worlds/builtins";
import { AdaNote, type AdaEntry } from "./AdaNote";
import { PhaseTrail } from "./PhaseTrail";
import { Instruments } from "./Instruments";
import { Readings } from "./ReadingPanel";
import { ReceiptCard } from "./ReceiptCard";
import { SampleNote } from "./Scenes";
import { StageSlot } from "./StageSlot";
import {
  errorMessage,
  predictionRequest,
  readCitizenDecisions,
  readGrade,
  readJudge,
  readRival,
  readTranscript,
  rivalRequest,
  sampleNotice,
  transferRequest,
} from "./http";
import {
  applyVerdict,
  backToExperiment,
  commitFirstPrediction,
  commitSecondPrediction,
  commitTransfer,
  discoveryElapsed,
  initialPlay,
  knobsLocked,
  leaveIntro,
  toHypothesise,
  verdictKicker,
  type PlaySnapshot,
} from "./phase";
import { defaultParams, formatParam, freshStart, pictureAction, raceLine, raceRows, restageParams, runDuration, runSteps, stripMoved, summariseObservation } from "./readings";
import { mintSession, withSeed } from "./session";
import { startWavCapture, type WavCapture } from "./wav";
import { armChime, playChime } from "./chime";
import { bringIntoView } from "./reveal";
import { rememberSeen, seenOnCard, witnessBeat, witnessLine, type WitnessBeat } from "./witness";

/**
 * Hero worlds use their built-in rules. Generated worlds carry AI-written rules that already passed the
 * server sandbox and every science check before they were saved; here they compile with Math.random blocked.
 */
const compiled = new Map<string, RulesModule | null>();
function rulesFor(spec: PublicWorldSpec): RulesModule | null {
  if (spec.rules.kind === "builtin") return builtinRules[spec.rules.module] ?? null;
  if (!compiled.has(spec.id)) {
    try {
      compiled.set(spec.id, compileRules(spec.rules.source));
    } catch {
      compiled.set(spec.id, null);
    }
  }
  return compiled.get(spec.id) ?? null;
}

function ChoiceList({
  name,
  prompt,
  options,
  selected,
  onSelect,
}: {
  name: string;
  prompt: string;
  options: string[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <fieldset className="choices">
      <legend>{prompt}</legend>
      {options.map((option, index) => (
        <label key={option} className={selected === index ? "choice is-on" : "choice"}>
          <input type="radio" name={name} checked={selected === index} onChange={() => onSelect(index)} />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function PlayLoop({ spec }: { spec: PublicWorldSpec }) {
  const [play, setPlay] = useState<PlaySnapshot>(initialPlay);
  const [params, setParams] = useState<Params>(() => defaultParams(spec));
  const [obs, setObs] = useState<Observation | null>(null);
  const [view, setView] = useState<WorldView | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedNote, setSeedNote] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [free, setFree] = useState("");
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [hypothesis, setHypothesis] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [judgeNotice, setJudgeNotice] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Params | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [transferChoice, setTransferChoice] = useState<number | null>(null);
  const [transferText, setTransferText] = useState("");
  const [adaBlocked, setAdaBlocked] = useState(false);
  const [adaStatus, setAdaStatus] = useState<"quiet" | "thinking" | "wiring" | "noted">("quiet");
  const [adaNotice, setAdaNotice] = useState<string | null>(null);
  const [adaEntries, setAdaEntries] = useState<AdaEntry[]>([]);
  const [adaBench, setAdaBench] = useState<Params>(() => defaultParams(spec));
  const [adaObs, setAdaObs] = useState<Observation | null>(null);
  const [townNote, setTownNote] = useState<string | null>(null);
  const [witness, setWitness] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [beat, setBeat] = useState<{ name: WitnessBeat; id: number } | null>(null);
  const [raceSaid, setRaceSaid] = useState<string | null>(null);

  const suggestionButtonRef = useRef<HTMLButtonElement>(null);
  const paramsRef = useRef(params);
  const sessionRef = useRef<WorldSession | null>(null);
  const seedRef = useRef<number | null>(null);
  const adaParams = useRef<Params>(defaultParams(spec));
  const adaBusy = useRef(false);
  const adaGaveUp = useRef(false);
  const adaStarted = useRef(false);
  const openWeightsRef = useRef<"live" | "sample" | null>(null);
  const prevObs = useRef<Observation | null>(null);
  const birthRef = useRef<Params>(defaultParams(spec));
  const experimentParams = useRef<Params | null>(null);
  const heldSession = useRef<WorldSession | null>(null);
  const quietObs = useRef<Set<Observation>>(new Set());
  const hideWitness = useRef(false);
  const originRef = useRef<Observation | null>(null);
  const playingRef = useRef(false);
  const cancelRef = useRef(false);
  const rafRef = useRef(0);
  const timeoutRef = useRef(0);
  const captureRef = useRef<WavCapture | null>(null);
  const wantTalk = useRef(false);
  const rulesMissing = rulesFor(spec) == null;
  if (play.phase === "transfer" && witness !== null) setWitness(null);
  const split = raceLine(raceRows(spec, obs, adaObs).length);
  const liveRace = play.phase === "experiment" || play.phase === "hypothesise" || play.phase === "loop";
  if (split && split !== raceSaid && liveRace) {
    setRaceSaid(split);
    setSeen(rememberSeen(seen, split));
    if (witness == null) {
      setWitness(split);
      setBeat({ name: "race", id: (beat?.id ?? 0) + 1 });
    }
  }

  useEffect(() => {
    if (!raceSaid) return;
    playChime("race");
    const timer = window.setTimeout(() => {
      setWitness((current) => (current === raceSaid ? null : current));
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [raceSaid]);

  function publish(session: WorldSession) {
    const last = session.history[session.history.length - 1] ?? null;
    setObs(last);
    setView(asWorldView(session.view(), spec.archetype));
  }

  useEffect(() => {
    const rules = rulesFor(spec);
    if (!rules) return;
    let cancel = false;
    cancelRef.current = false;
    void mintSession(spec.id, window.location.search)
      .then(async (mint) => {
        if (cancel) return;
        seedRef.current = mint.seed;
        setSeedNote(withSeed(mint.notice, mint.seed));
        const params = new URLSearchParams(window.location.search);
        if (params.get("seed") !== String(mint.seed)) {
          params.set("seed", String(mint.seed));
          window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
        }
        birthRef.current = { ...paramsRef.current };
        const session = await new WorldSession(rules, { ...paramsRef.current }, mint.seed).start();
        if (cancel) return;
        sessionRef.current = session;
        const last = session.history[session.history.length - 1] ?? null;
        setObs(last);
        setView(asWorldView(session.view(), spec.archetype));
        setReady(true);
        setSeedError(null);
      })
      .catch((err: unknown) => {
        if (cancel) return;
        setSeedError(err instanceof Error ? err.message : "The session could not be opened.");
      });
    return () => {
      cancel = true;
      cancelRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      void captureRef.current?.stop().catch(() => undefined);
      captureRef.current = null;
    };
  }, [spec, retry]);

  useEffect(() => {
    if (play.phase !== "transfer") return;
    const frame = window.requestAnimationFrame(() => {
      bringIntoView(document.querySelector<HTMLButtonElement>(".phase .press"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [play.phase, play.askingPrediction]);

  useEffect(() => {
    if (!suggestion) return;
    const frame = window.requestAnimationFrame(() => bringIntoView(suggestionButtonRef.current));
    return () => window.cancelAnimationFrame(frame);
  }, [suggestion, reply]);

  useEffect(() => {
    hideWitness.current = play.phase === "transfer" && play.askingPrediction == null;
    if (play.phase !== "transfer") return;
    const rules = rulesFor(spec);
    const seed = seedRef.current;
    if (!rules || seed == null) return;
    const patch = spec.id === "firebreak" ? { ...spec.transfer.params, firebreak: false } : spec.transfer.params;
    const action = pictureAction(play.askingPrediction, paramsRef.current, patch, experimentParams.current);
    if (action.kind === "stay") return;
    if (action.kind === "resume") {
      paramsRef.current = action.params;
      setParams(action.params);
      const held = heldSession.current;
      if (!held) return;
      held.params = { ...action.params };
      sessionRef.current = held;
      birthRef.current = { ...action.params };
      const heldObs = held.history[held.history.length - 1] ?? null;
      if (heldObs) quietObs.current.add(heldObs);
      setObs(heldObs);
      setView(asWorldView(held.view(), spec.archetype));
      return;
    }
    if (!experimentParams.current) experimentParams.current = action.remember;
    if (!heldSession.current) heldSession.current = sessionRef.current;
    paramsRef.current = action.params;
    setParams(action.params);
    let cancel = false;
    const fly = spec.archetype === "bodies";
    void new WorldSession(rules, action.params, seed).start().then(async (session) => {
      if (cancel) return;
      if (fly) await session.tick(runSteps("bodies"));
      if (cancel) return;
      sessionRef.current = session;
      birthRef.current = { ...action.params };
      const last = session.history[session.history.length - 1] ?? null;
      setObs(last);
      setView(asWorldView(session.view(), spec.archetype));
    });
    return () => {
      cancel = true;
    };
  }, [play.phase, play.askingPrediction, spec]);

  useEffect(() => {
    let live = true;
    void fetch("/api/status")
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!live || !data || typeof data !== "object") return;
        const body = data as { openWeights?: unknown; notice?: unknown };
        if (body.openWeights === "live" || body.openWeights === "sample") openWeightsRef.current = body.openWeights;
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [spec.id]);

  useEffect(() => {
    if (hideWitness.current || (obs && quietObs.current.has(obs))) {
      prevObs.current = obs;
      return;
    }
    const baseline = spec.id === "peppered-forest" && originRef.current ? originRef.current : prevObs.current;
    const line = witnessLine(spec.id, baseline, obs);
    prevObs.current = obs;
    if (!line) return;
    setWitness(line);
    setSeen((lines) => rememberSeen(lines, line));
    const name = witnessBeat(line);
    if (name) {
      setBeat((current) => ({ name, id: (current?.id ?? 0) + 1 }));
      playChime(name);
    }
    const timer = window.setTimeout(() => {
      setWitness((current) => (current === line ? null : current));
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [obs, spec.id]);

  const adaTurn = useCallback(async () => {
    if (adaBusy.current || adaGaveUp.current) return;
    const seed = seedRef.current;
    if (seed == null) return;
    adaBusy.current = true;
    setAdaStatus("thinking");
    try {
      const res = await fetch("/api/rival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rivalRequest(spec.id, seed, { ...adaParams.current })),
      });
      if (!res.ok) {
        if (res.status === 501) {
          adaGaveUp.current = true;
          setAdaBlocked(true);
        }
        setAdaStatus("wiring");
        return;
      }
      const parsed = readRival(await res.json());
      if (!parsed) {
        setAdaStatus("wiring");
        return;
      }
      adaParams.current = { ...adaParams.current, ...parsed.turn.params };
      setAdaBench({ ...adaParams.current });
      if (parsed.turn.observation) setAdaObs(parsed.turn.observation);
      setAdaNotice(sampleNotice(parsed.source, parsed.notice));
      setAdaEntries((entries) =>
        [
          ...entries,
          {
            thought: parsed.turn.thought,
            tool: parsed.turn.tool,
            reading: summariseObservation(spec, parsed.turn.observation),
          },
        ].slice(-6),
      );
      setAdaStatus("noted");
    } catch {
      setAdaStatus("wiring");
    } finally {
      adaBusy.current = false;
    }
  }, [spec]);

  useEffect(() => {
    if (play.phase === "experiment" && ready && !adaStarted.current) {
      adaStarted.current = true;
      void adaTurn();
    }
  }, [play.phase, ready, adaTurn]);

  function hold(ms: number) {
    return new Promise<void>((resolve) => {
      timeoutRef.current = window.setTimeout(() => resolve(), ms);
    });
  }

  function spreadTicks(session: WorldSession, steps: number, duration: number) {
    return new Promise<void>((resolve, reject) => {
      const started = performance.now();
      const batch = steps > 80 ? 4 : 1;
      const frames = Math.ceil(steps / batch);
      let done = 0;
      let frameIndex = 0;
      let busy = false;
      const frame = (now: number) => {
        if (cancelRef.current) return resolve();
        if (busy) return;
        const due = started + ((frameIndex + 1) * duration) / frames;
        if (now < due) {
          rafRef.current = requestAnimationFrame(frame);
          return;
        }
        busy = true;
        session.params = { ...paramsRef.current };
        const n = Math.min(batch, steps - done);
        void session
          .tick(n)
          .then(() => {
            done += n;
            frameIndex += 1;
            if (!cancelRef.current) publish(session);
            busy = false;
            if (done >= steps || cancelRef.current) resolve();
            else rafRef.current = requestAnimationFrame(frame);
          })
          .catch(reject);
      };
      rafRef.current = requestAnimationFrame(frame);
    });
  }

  async function applyCitizenRound(session: WorldSession) {
    if (spec.id !== "rumour-town" || openWeightsRef.current !== "live") return;
    const population = asWorldView(session.view(), "population");
    if (!population || population.kind !== "population") return;
    const citizens = population.agents.flatMap((agent) => {
      const id = typeof agent.id === "number" ? agent.id : Number(agent.id);
      if (!Number.isInteger(id)) return [];
      return [{ id, x: agent.x, y: agent.y, worried: agent.tint, says: agent.bubble ?? null }];
    });
    // A live town takes a few seconds to decide; say so on the stage instead of freezing.
    const talking = "The square is talking…";
    setWitness(talking);
    let res: Response;
    try {
      res = await fetch("/api/citizens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId: spec.id, citizens, params: paramsRef.current }),
      });
    } finally {
      setWitness((current) => (current === talking ? null : current));
    }
    if (!res.ok) return;
    const body = (await res.json()) as { decisions?: unknown; source?: string; notice?: string };
    if (body.source === "sample") setTownNote(body.notice ?? null);
    const decisions = readCitizenDecisions(body.decisions);
    if (!decisions) return;
    session.setParam("citizenDecisions", JSON.stringify(decisions));
  }

  function clearCitizenRound(session: WorldSession) {
    if (!("citizenDecisions" in session.params)) return;
    const next = { ...session.params };
    delete next.citizenDecisions;
    session.params = next;
  }

  async function run() {
    let session = sessionRef.current;
    if (!session || playingRef.current || knobsLocked(play)) return;
    armChime();
    playingRef.current = true;
    setPlaying(true);
    setRunError(null);
    setSuggestion(null);
    if (seedRef.current != null && freshStart(spec.id, spec.archetype, birthRef.current, paramsRef.current)) {
      const rules = rulesFor(spec);
      if (rules) {
        session = await new WorldSession(rules, { ...paramsRef.current }, seedRef.current).start();
        sessionRef.current = session;
        birthRef.current = { ...paramsRef.current };
        if (!cancelRef.current) publish(session);
      }
    }
    for (const [id, value] of Object.entries(paramsRef.current)) session.setParam(id, value);
    originRef.current = session.history[session.history.length - 1] ?? null;
    const steps = runSteps(spec.archetype);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      if (spec.id === "rumour-town" && openWeightsRef.current === "live") {
        await applyCitizenRound(session);
        await session.tick(1);
        clearCitizenRound(session);
        if (!cancelRef.current) publish(session);
        const rest = steps - 1;
        if (rest > 0 && !cancelRef.current) {
          if (reduce) {
            await session.tick(rest);
            publish(session);
          } else await spreadTicks(session, rest, runDuration(rest));
        }
      } else if (spec.archetype === "pipeline") {
        await session.tick(1);
        if (!cancelRef.current) publish(session);
        if (!reduce && !cancelRef.current) await hold(SCROLL_HOLD_MS);
      } else if (reduce) {
        await session.tick(steps);
        if (!cancelRef.current) publish(session);
      } else {
        await spreadTicks(session, steps, runDuration(steps));
      }
      if (!cancelRef.current) void adaTurn();
    } catch (err) {
      if (!cancelRef.current) setRunError(err instanceof Error ? err.message : "The world hesitated.");
    } finally {
      playingRef.current = false;
      if (!cancelRef.current) setPlaying(false);
    }
  }

  async function resetScene() {
    const rules = rulesFor(spec);
    const seed = seedRef.current;
    if (!rules || seed == null || playingRef.current) return;
    birthRef.current = { ...paramsRef.current };
    const session = await new WorldSession(rules, { ...paramsRef.current }, seed).start();
    if (cancelRef.current) return;
    sessionRef.current = session;
    publish(session);
    setWitness(null);
  }

  function applyParams(next: Params) {
    const previous = paramsRef.current;
    paramsRef.current = next;
    const session = sessionRef.current;
    if (session) {
      for (const [id, value] of Object.entries(next)) session.setParam(id, value);
      setView(asWorldView(session.view(), spec.archetype));
    }
    setParams(next);
    // The strip is planted with the valley. Show it as soon as that knob moves.
    if (stripMoved(spec.id, previous, next) && !playingRef.current) void resetScene();
  }

  function onChange(id: string, value: Params[string]) {
    const next = restageParams(paramsRef.current, { [id]: value });
    if (next) applyParams(next);
  }

  async function gradePrediction(predictionId: string, choice: number | string, which: "first" | "second") {
    setGrading(true);
    setGradeError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(predictionRequest(spec.id, predictionId, choice)),
      });
      const text = await res.text();
      if (!res.ok) {
        setGradeError(errorMessage(text, res.status));
        return;
      }
      const correct = readGrade(JSON.parse(text) as unknown);
      if (correct == null) {
        setGradeError("The grade did not come back.");
        return;
      }
      const prediction = spec.predictions.find((item) => item.id === predictionId);
      const words = typeof choice === "number" ? (prediction?.options?.[choice] ?? "") : choice;
      setPlay((state) => (which === "first" ? commitFirstPrediction(state, correct, words) : commitSecondPrediction(state, correct, words)));
      setSelected(null);
      setFree("");
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "The grade did not come back.");
    } finally {
      setGrading(false);
    }
  }

  async function gradeTransfer(statement: string, choice: number | string) {
    setGrading(true);
    setGradeError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferRequest(spec.id, statement, choice)),
      });
      const text = await res.text();
      if (!res.ok) {
        setGradeError(errorMessage(text, res.status));
        return;
      }
      const correct = readGrade(JSON.parse(text) as unknown);
      if (correct == null) {
        setGradeError("The grade did not come back.");
        return;
      }
      setPlay((state) => commitTransfer(state, correct, spec.predictions.length, statement));
      setTransferChoice(null);
      setTransferText("");
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "The grade did not come back.");
    } finally {
      setGrading(false);
    }
  }

  async function offerHypothesis() {
    const statement = hypothesis.trim();
    if (!statement || judging) return;
    setJudging(true);
    setJudgeError(null);
    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worldId: spec.id, statement }),
      });
      const text = await res.text();
      if (!res.ok) {
        setJudgeError(errorMessage(text, res.status));
        return;
      }
      const body = readJudge(JSON.parse(text) as unknown, spec.knobs.map((knob) => knob.id));
      if (!body) {
        setJudgeError("The reply did not come back in a form we can read.");
        return;
      }
      setReply(body.reply);
      setVerdict(body.verdict);
      setJudgeNotice(sampleNotice(body.source, body.notice));
      if (body.nextExperiment) setSuggestion(body.nextExperiment);
      setPlay((state) => applyVerdict(state, body.verdict, performance.now()));
    } catch (err) {
      setJudgeError(err instanceof Error ? err.message : "The reply did not come back.");
    } finally {
      setJudging(false);
    }
  }

  async function beginTalk() {
    if (captureRef.current || listening) return;
    wantTalk.current = true;
    setVoiceNote(null);
    setVoiceNotice(null);
    try {
      const capture = await startWavCapture();
      if (!wantTalk.current) {
        await capture.stop();
        setVoiceNote("Hold it a little longer. The typed sentence is still here.");
        return;
      }
      captureRef.current = capture;
      setListening(true);
    } catch {
      setVoiceNote("The microphone stayed shut. The sentence can be typed.");
    }
  }

  async function endTalk() {
    wantTalk.current = false;
    const capture = captureRef.current;
    if (!capture) return;
    captureRef.current = null;
    setListening(false);
    try {
      const wav = await capture.stop();
      if (wav.size <= 44) {
        setVoiceNote("That press was too quiet. The typed sentence is still here.");
        return;
      }
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      });
      const text = await res.text();
      if (!res.ok) {
        setVoiceNote(errorMessage(text, res.status));
        return;
      }
      const body = readTranscript(JSON.parse(text) as unknown);
      if (!body || !body.text) {
        setVoiceNote("No words came back. The typed sentence is still here.");
        setVoiceNotice(body?.source === "sample" ? (body.notice ?? null) : null);
        return;
      }
      setHypothesis(body.text);
      setVoiceNotice(body.source === "sample" ? (body.notice ?? null) : null);
    } catch (err) {
      setVoiceNote(err instanceof Error ? err.message : "No words came back. The typed sentence is still here.");
    }
  }

  function copyWorld() {
    const href = window.location.href;
    void navigator.clipboard.writeText(href).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      },
      () => setCopied(false),
    );
  }

  const locked = knobsLocked(play);
  const lockedNote =
    play.phase === "predict"
      ? "These stay still until the first guess is written down."
      : play.phase === "transfer" && play.askingPrediction == null && Object.keys(spec.transfer.params).length > 0
        ? "These belong to the new situation."
        : play.phase === "transfer" && play.askingPrediction === 1 && Object.keys(spec.transfer.params).length > 0
          ? "These are the knobs from the trial you left."
          : play.phase === "transfer" || play.phase === "receipt"
            ? "The bench is still."
            : null;
  const opening = spec.predictions[0];
  const second = spec.predictions[1];
  const showBench = play.phase !== "intro" && play.phase !== "receipt";
  const showReadings = play.phase === "experiment" || play.phase === "hypothesise" || play.phase === "loop" || play.phase === "transfer";
  const newSituation = play.phase === "transfer" && play.askingPrediction == null;

  return (
    <div className="play" data-world={spec.id} data-archetype={spec.archetype} data-phase={play.phase} data-margin={suggestion ? "yes" : undefined}>
      <header className="play-bar">
        <Link href="/" className="bw-logo">
          <span className="bw-logo-mark" aria-hidden="true" />
          Wonderland
        </Link>
        <h1>{spec.title}</h1>
        <span className="play-links">
          <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={() => void copyWorld()}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/gallery">All worlds</Link>
          </Button>
        </span>
      </header>
      <PhaseTrail phase={play.phase} seen={play.phase === "receipt" ? [] : witness ? seen.filter((line) => line !== witness) : seen} />
      <div className="play-body">
        <section className="stage-pane" aria-label={spec.title} data-situation={newSituation ? "yes" : undefined}>
          <StageSlot
            view={view}
            archetype={spec.archetype}
            worldId={spec.id}
            artStyle={spec.art.style}
            playing={playing}
            params={params}
            beat={beat?.name ?? null}
            beatId={beat?.id ?? 0}
          />
          {witness && !newSituation ? <p className="witness">{witness}</p> : null}
          {spec.id === "firebreak" && !newSituation ? (
            <ul className="legend" aria-label="Valley marks">
              <li>
                <i className="swatch sapling" /> Sapling
              </li>
              <li>
                <i className="swatch flame" /> Flame
              </li>
              <li>
                <i className="swatch stump" /> Stump
              </li>
            </ul>
          ) : null}
          {newSituation ? (
            <div className="situation">
              <p className="kicker">A new situation</p>
              <p>{spec.transfer.setup}</p>
            </div>
          ) : null}
        </section>
        <aside className="notebook">
          <div className="notebook-scroll">
          {rulesMissing ? <p className="slip">This world’s rules are not on the shelf yet.</p> : null}
          <SampleNote notice={townNote} />
          {seedError ? (
            <p className="slip">
              {seedError}{" "}
              <button type="button" className="quiet" onClick={() => setRetry((n) => n + 1)}>
                Ask again for a seed
              </button>
            </p>
          ) : null}

          {play.phase === "intro" ? (
            <section className="phase">
              <p className="voice">{spec.story.setting}</p>
              <p className="voice">{spec.story.mystery}</p>
              <p className="goal">{spec.story.goal}</p>
              <button type="button" className="press" onClick={() => setPlay((state) => leaveIntro(state, performance.now()))}>
                I have a guess
              </button>
            </section>
          ) : null}

          {play.phase === "predict" && opening ? (
            <section className="phase">
              <p className="kicker">Before you touch anything</p>
              {opening.options ? (
                <ChoiceList name={opening.id} prompt={opening.prompt} options={opening.options} selected={selected} onSelect={setSelected} />
              ) : (
                <label className="free-guess">
                  <span>{opening.prompt}</span>
                  <textarea value={free} onChange={(event) => setFree(event.target.value)} rows={3} />
                </label>
              )}
              {gradeError ? <p className="slip">{gradeError}</p> : null}
              <button
                type="button"
                className="press"
                disabled={grading || (opening.options ? selected == null : free.trim() === "")}
                onClick={() => {
                  armChime();
                  const choice = opening.options ? selected : free.trim();
                  if (choice == null || choice === "") return;
                  void gradePrediction(opening.id, choice, "first");
                }}
              >
                {grading ? "Writing" : "Write it down"}
              </button>
              <p className="aside">You will not be told whether it held. Not yet.</p>
            </section>
          ) : null}

          {play.beforeWords && (play.phase === "experiment" || play.phase === "hypothesise" || play.phase === "loop") ? (
            <p className="sealed">
              <span className="kicker">Sealed until the card</span>
              {play.beforeWords}
            </p>
          ) : null}

          {play.phase === "experiment" ? (
            <section className="phase">
              <p className="kicker">A trial</p>
              <p className="voice">Change one thing. Run the world. Watch what the readings do.</p>
              <button type="button" className="quiet" onClick={() => setPlay(toHypothesise)}>
                I can say it
              </button>
            </section>
          ) : null}

          {play.phase === "hypothesise" || play.phase === "loop" ? (
            <section className="phase">
              <p className="kicker">{play.phase === "loop" ? verdictKicker(verdict) : "Your sentence"}</p>
              {reply ? <p className="voice reply">{reply}</p> : null}
              <SampleNote notice={judgeNotice} />
              {suggestion ? (
                <div className="suggestion">
                  <p className="kicker">Penciled in the margin</p>
                  <ul>
                    {spec.knobs
                      .filter((knob) => knob.id in suggestion)
                      .map((knob) => (
                        <li key={knob.id}>
                          <span>{knob.label}</span> <span className="num">{formatParam(suggestion[knob.id])}</span>
                        </li>
                      ))}
                  </ul>
                  <button
                    type="button"
                    className="quiet"
                    ref={suggestionButtonRef}
                    onClick={() => {
                      const next = restageParams(paramsRef.current, suggestion);
                      if (next) applyParams(next);
                    }}
                  >
                    Set those knobs
                  </button>
                </div>
              ) : null}
              {judgeError ? <p className="slip">{judgeError}</p> : null}
              <label className="free-guess">
                <span>Say the law in one sentence.</span>
                <textarea value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} rows={4} />
              </label>
              <div className="instrument-actions">
                <button
                  type="button"
                  className={listening ? "speak is-hot" : "speak"}
                  aria-pressed={listening}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    void beginTalk();
                  }}
                  onPointerUp={() => void endTalk()}
                  onKeyDown={(event) => {
                    if (event.key === " " && !event.repeat) {
                      event.preventDefault();
                      void beginTalk();
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === " ") {
                      event.preventDefault();
                      void endTalk();
                    }
                  }}
                >
                  {listening ? "Listening" : "Hold to speak"}
                </button>
                <button type="button" className="press" disabled={judging || hypothesis.trim() === ""} onClick={() => void offerHypothesis()}>
                  {judging ? "Offered" : "Offer this sentence"}
                </button>
              </div>
              {voiceNote ? <p className="aside">{voiceNote}</p> : null}
              <SampleNote notice={voiceNotice} />
              {play.phase === "hypothesise" ? (
                <button type="button" className="quiet" onClick={() => setPlay(backToExperiment)}>
                  Run another trial first
                </button>
              ) : null}
            </section>
          ) : null}

          {play.phase === "transfer" && play.askingPrediction == null ? (
            <section className="phase">
              {reply ? <p className="voice reply">{reply}</p> : null}
              <p className="kicker">A new situation</p>
              <p className="voice">{spec.transfer.setup}</p>
              {spec.transfer.options ? (
                <ChoiceList
                  name="transfer"
                  prompt={spec.transfer.question}
                  options={spec.transfer.options}
                  selected={transferChoice}
                  onSelect={setTransferChoice}
                />
              ) : (
                <label className="free-guess">
                  <span>{spec.transfer.question}</span>
                  <textarea value={transferText} onChange={(event) => setTransferText(event.target.value)} rows={4} />
                </label>
              )}
              {gradeError ? <p className="slip">{gradeError}</p> : null}
              <button
                type="button"
                className="press"
                disabled={grading || (spec.transfer.options ? transferChoice == null : transferText.trim() === "")}
                onClick={() => {
                  if (spec.transfer.options) {
                    if (transferChoice == null) return;
                    void gradeTransfer(spec.transfer.options[transferChoice] ?? "", transferChoice);
                  } else {
                    const statement = transferText.trim();
                    if (!statement) return;
                    void gradeTransfer(statement, statement);
                  }
                }}
              >
                {grading ? "Writing" : "Offer the proof"}
              </button>
            </section>
          ) : null}

          {play.phase === "transfer" && play.askingPrediction === 1 && second ? (
            <section className="phase">
              <p className="kicker">Once more, at the end</p>
              {Object.keys(spec.transfer.params).length > 0 ? <p className="aside">The trial you left is on the stage again.</p> : null}
              {second.options ? (
                <ChoiceList name={second.id} prompt={second.prompt} options={second.options} selected={selected} onSelect={setSelected} />
              ) : (
                <label className="free-guess">
                  <span>{second.prompt}</span>
                  <textarea value={free} onChange={(event) => setFree(event.target.value)} rows={3} />
                </label>
              )}
              {gradeError ? <p className="slip">{gradeError}</p> : null}
              <button
                type="button"
                className="press"
                disabled={grading || (second.options ? selected == null : free.trim() === "")}
                onClick={() => {
                  const choice = second.options ? selected : free.trim();
                  if (choice == null || choice === "") return;
                  void gradePrediction(second.id, choice, "second");
                }}
              >
                {grading ? "Writing" : "Write this one down"}
              </button>
            </section>
          ) : null}

          {play.phase === "receipt" && play.beforeCorrect != null && play.afterCorrect != null ? (
            <section className="phase">
              <p className="kicker">What you kept</p>
              <ReceiptCard
                worldId={spec.id}
                model={{
                  title: spec.title,
                  tagline: spec.tagline,
                  concept: spec.concept,
                  before: play.beforeCorrect,
                  after: play.afterCorrect,
                  afterKind: spec.predictions.length > 1 ? "prediction" : "transfer",
                  elapsedMs: discoveryElapsed(play),
                  seen: seenOnCard(seen),
                  beforeWords: play.beforeWords,
                  afterWords: play.afterWords,
                }}
              />
            </section>
          ) : null}

          {runError ? <p className="slip">{runError}</p> : null}

          {showBench ? (
            <Instruments
              spec={spec}
              params={params}
              locked={locked}
              lockedNote={lockedNote}
              playing={playing}
              ready={ready}
              onChange={onChange}
              onRun={() => void run()}
              onReset={() => void resetScene()}
            />
          ) : null}
          {showReadings ? <Readings spec={spec} obs={obs} /> : null}
          </div>
          <AdaNote
            spec={spec}
            status={adaStatus}
            notice={adaNotice}
            seedNote={seedNote}
            entries={adaEntries}
            params={adaBench}
            yours={obs}
            rival={adaObs}
            canTurn={play.knobsUnlocked && !adaBlocked && ready && play.phase !== "receipt" && play.phase !== "transfer"}
            onTurn={() => void adaTurn()}
          />
        </aside>
      </div>
    </div>
  );
}
