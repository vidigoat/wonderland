import type { WorldSpec } from "@/engine/spec";

export const rumourTownSpec: WorldSpec = {
  id: "rumour-town",
  version: 1,
  concept: "Why do bank runs happen?",
  title: "Rumour Town",
  tagline: "One whisper. Forty neighbours. A perfectly healthy bank.",
  archetype: "population",
  science: {
    hiddenLaw:
      "Banks keep only a fraction of deposits as cash. If depositors expect others to withdraw, withdrawing first is rational, so fear alone can drain a solvent bank (Diamond–Dybvig). Deposit insurance removes the reason to run.",
    plainStatement: "Bank runs are self-fulfilling: the fear of a run causes the run. Insurance breaks the loop.",
    misconceptions: ["Banks only fail when they lose money on bad loans.", "The bank keeps all your money in a vault.", "Rumours must be true to cause damage."],
    sources: [{ title: "Diamond & Dybvig (1983), Bank Runs, Deposit Insurance, and Liquidity — JPE", url: "https://www.journals.uchicago.edu/doi/10.1086/261155" }],
  },
  story: {
    setting: "A cosy market town with one bank on the square. 40 citizens chat as they pass each other.",
    mystery: "The bank is perfectly healthy. You whisper one rumour to one citizen. Could that be enough to bring it down?",
    goal: "Find out what makes the panic spread — and the one policy that stops it.",
  },
  knobs: [
    { id: "rumourSeeds", label: "Citizens who hear the rumour", kind: "slider", min: 0, max: 10, step: 1, default: 1 },
    { id: "reserveRatio", label: "Cash the bank keeps on hand", kind: "slider", min: 0.05, max: 1, step: 0.05, default: 0.1 },
    { id: "insurance", label: "Deposit insurance", kind: "toggle", default: false },
    { id: "queueVisible", label: "Citizens can see the queue", kind: "toggle", default: true },
  ],
  observables: [
    { id: "withdrawnShare", label: "Share who withdrew", display: "series" },
    { id: "worriedShare", label: "Share who are worried", display: "series" },
    { id: "bank", label: "Bank", display: "text" },
  ],
  entities: [
    { id: "citizen", label: "Townsperson", artPrompt: "a cheerful townsperson in a scarf, full body, cosy flat illustration, plain flat white background", segmentPrompt: "person" },
    { id: "bank", label: "Bank", artPrompt: "a small stone bank building with columns, cosy flat illustration, plain flat white background", segmentPrompt: "building" },
  ],
  rules: { kind: "builtin", module: "rumour-town" },
  predictions: [
    {
      id: "oneWhisper",
      prompt: "The bank is healthy and you tell one person a false rumour. What happens?",
      options: ["Nothing — it's false", "A few people withdraw, then it calms down", "It can snowball until the bank collapses"],
      answerKey: 2,
      tryWith: { rumourSeeds: 1 },
    },
  ],
  transfer: {
    setup: "2023: a tech-focused bank's depositors talk in group chats; most deposits are above the insurance limit.",
    params: { rumourSeeds: 5, insurance: false },
    question: "Why could it fall in a day, and what would have calmed depositors fastest?",
    answerKey: "Uninsured depositors expected others to run, so running first was rational; guaranteeing deposits removes the incentive.",
  },
  checks: [
    { id: "rumour-collapses", description: "Low reserves + a rumour + no insurance → collapse", params: { rumourSeeds: 3, reserveRatio: 0.1 }, steps: 30, seeds: [1, 2, 3], assert: { observable: "bank", op: "eq", value: "collapsed" } },
    { id: "insurance-stops", description: "Deposit insurance stops the run", params: { rumourSeeds: 3, reserveRatio: 0.1, insurance: true }, steps: 30, seeds: [1, 2, 3], assert: { observable: "bank", op: "eq", value: "open" } },
    { id: "no-rumour-calm", description: "No rumour, no run", params: { rumourSeeds: 0 }, steps: 30, seeds: [1, 2, 3], assert: { observable: "bank", op: "eq", value: "open" } },
  ],
  art: { style: "cosy flat illustration, warm pastels, rounded shapes", background: "a cosy cobbled town square with a small bank, cosy flat illustration" },
};
