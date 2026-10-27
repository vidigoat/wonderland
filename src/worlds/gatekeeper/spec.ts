import type { WorldSpec } from "@/engine/spec";

export const gatekeeperSpec: WorldSpec = {
  id: "gatekeeper",
  version: 1,
  concept: "Why does SQL injection work?",
  title: "The Gatekeeper's Ledger",
  tagline: "The scribe copies exactly what you write. That's the problem.",
  archetype: "pipeline",
  science: {
    hiddenLaw:
      "The scribe builds the command by pasting your text inside quotes. A quote in your input closes the data early, so the rest of your input is executed as part of the command. Parameterised ('sealed') queries keep input as data and stop it.",
    plainStatement: "Injection happens when data is mixed into code; keeping them separate (parameters) fixes it.",
    misconceptions: ["You need the password to get in.", "Escaping a few characters is enough.", "Hiding error messages fixes it."],
    sources: [{ title: "OWASP — SQL Injection", url: "https://owasp.org/www-community/attacks/SQL_Injection" }],
  },
  story: {
    setting: "A candle-lit castle archive. A tireless scribe copies every visitor's scroll into the vault ledger's spell.",
    mystery: "The scribe never questions what's written on a scroll. Can you open the vault without knowing any password?",
    goal: "Open the vault — then discover why the sealed-scroll scribe can't be fooled.",
  },
  knobs: [
    { id: "name", label: "Name on your scroll", kind: "text", default: "traveller" },
    { id: "pass", label: "Password on your scroll", kind: "text", default: "" },
    { id: "sealed", label: "Scribe uses sealed scrolls", kind: "toggle", default: false },
  ],
  observables: [
    { id: "vaultOpen", label: "Vault", display: "text" },
    { id: "rowsReturned", label: "Ledger entries revealed", display: "counter" },
    { id: "scribeError", label: "Scribe", display: "text" },
    { id: "query", label: "The spell the scribe cast", display: "text" },
  ],
  entities: [
    { id: "scribe", label: "Scribe", artPrompt: "an old scribe with a quill at a tall wooden desk, side view, illuminated-manuscript style with gold leaf and deep red robes, plain flat dark background", segmentPrompt: "person" },
    { id: "scroll", label: "Scroll", artPrompt: "a single rolled parchment scroll with a red wax seal, illuminated-manuscript style, plain flat dark background", segmentPrompt: "scroll" },
    { id: "vault", label: "Vault door", artPrompt: "a heavy round iron vault door set in a stone arch, illuminated-manuscript style with gold leaf, plain flat dark background", segmentPrompt: "vault door" },
  ],
  rules: { kind: "builtin", module: "gatekeeper" },
  predictions: [
    {
      id: "apostrophe",
      prompt: "You write your name as O'Brien. What will the scribe do?",
      options: ["Copy it fine", "Choke — the spell breaks", "Open the vault"],
      answerKey: 1,
      tryWith: { name: "O'Brien" },
    },
    {
      id: "sealed",
      prompt: "The scribe switches to sealed scrolls. Will your trick still work?",
      options: ["Yes, same as before", "No — your words stay words"],
      answerKey: 1,
      tryWith: { sealed: true, name: "' OR '1'='1", pass: "' OR '1'='1" },
    },
  ],
  transfer: {
    setup: "A library search box builds: SELECT title FROM books WHERE author = '<your text>'",
    params: {},
    question: "What would you type to list every book, and what one change by the librarian makes that impossible?",
    answerKey: "Close the quote and add an always-true condition (e.g. ' OR '1'='1); fix with parameterised queries.",
  },
  checks: [
    { id: "honest-shut", description: "A wrong honest guess keeps the vault shut", params: { name: "queen", pass: "guess" }, steps: 1, seeds: [1], assert: { observable: "vaultOpen", op: "eq", value: "shut" } },
    { id: "apostrophe-breaks", description: "A stray quote breaks the scribe", params: { name: "O'Brien" }, steps: 1, seeds: [1], assert: { observable: "scribeError", op: "eq", value: "error" } },
    { id: "injection-opens", description: "Injection opens the vault without a password", params: { name: "' OR '1'='1", pass: "' OR '1'='1" }, steps: 1, seeds: [1], assert: { observable: "vaultOpen", op: "eq", value: "open" } },
    { id: "sealed-blocks", description: "Sealed scrolls block the same injection", params: { name: "' OR '1'='1", pass: "' OR '1'='1", sealed: true }, steps: 1, seeds: [1], assert: { observable: "vaultOpen", op: "eq", value: "shut" } },
  ],
  art: { style: "illuminated manuscript, gold leaf, deep reds and parchment", background: "a candle-lit stone archive hall with tall shelves of ledgers along both walls and an open stone floor in the middle, no people, illuminated-manuscript style with gold leaf, deep reds and parchment" },
};
