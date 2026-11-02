# Cerebral Valley form: answers to paste

Field by field, in the order the form asks. Anything in *[brackets]* is yours to fill in or choose.

---

**Team Name:** Dragon

**Team Members:** Vidit Patankar (vidigoat2011). Already filled in.

**Which track?** Indie Developer

**Which problem statement?** *[pick from the dropdown; send me the options and I'll match one]*

**Most Viral X post link:** *[post the thread from `docs/x-thread.md` first, then paste the link to tweet 1]*

---

### Project Description

Wonderland: don't ask AI for the answer, ask it for a world.

People who learn with an AI assistant score 17 points lower on understanding (Shen & Tamkin, 2026). The AI does the thinking for them. Discovery works better than explanation, and good interactive simulations prove it, but each one takes experts months to build: PhET has made about 150 in twenty years.

Wonderland builds one in about three minutes, for about thirty cents, for whatever "why" question a learner has. A team of Meta models finds the real law behind the question, designs a small painted world where that law is secretly at work, and writes the world's rules as code. Before anyone plays, the world must pass four gates:
- its science checks hold on every random seed;
- a playability lint;
- a check that no reading is faked;
- Muse Spark 1.3 watching it run and confirming the picture shows what the law predicts.

A world that fails goes back to be repaired.

Then the learner finds the law themselves. They predict, experiment, put the law in their own words, and prove it on a situation they haven't seen. Meanwhile Ada, an AI scientist running on Meta's open weights, races them to it. The AI never gives the answer away.

It works in any language. A question asked in Hindi is played entirely in Hindi. Teachers get a printable lesson guide for every world, matched to an NGSS middle-school standard, plus a QR class link that needs no accounts. The class results show how many students predicted wrong at first and still got the new situation right by experimenting.

Results: of 15 curriculum phenomena fixed before the run, 11 became verified worlds and 8 passed all four gates. 28 worlds are live, and the gallery grows as visitors build.

Live: https://wonderland-omega-fawn.vercel.app

---

**Public GitHub Repository:** https://github.com/vidigoat/wonderland

**3-Minute Demo Video:** *[YouTube link, unlisted is fine]*

---

### Describe your use of Meta products to build the submitted project

Every part of the intelligence is Meta's, with five models each doing a separate job:

- **Muse Spark Open** (open weights, served on Baseten) handles all the reasoning:
  - the scientist, who finds the law and the evidence it must produce;
  - the designer, who writes the world and its rules as code;
  - the repairer, who fixes a world that fails a gate;
  - the judge, who decides whether the learner's own words capture the law without ever saying it;
  - Ada, the AI rival who runs real experiments with tools and races the learner;
  - forty townspeople who each speak in their own words.
- **Muse Spark 1.3** (vision, Meta Model API) is the playtester. It watches each new world run with a control moved and without, and judges whether the picture shows what the law predicts. What it sees goes back to the designer automatically. On its first pass it caught three real visual bugs that our test suite had missed.
- **Muse Image 1.0** paints every world and every creature.
- **SAM 3.1** cuts every creature out of its painting. We decode its streamed, range-coded masks ourselves. It also counts figures in the playtest frames, as a second opinion for the vision model.
- **Muse Voice Transcribe** lets a learner hold a button and say their hypothesis out loud.

Model-written rules run in a sandbox with a seeded random generator. A shared spend ledger enforces hard cost caps across serverless instances.

---

### Why are Meta's models important to your solution?

Wonderland only works if the AI checks its own work, and Meta's models give us every kind of check we need from one family.

Spark Open's open weights matter most. The judge, Ada and the forty citizens run on every play, so they have to be cheap, fast and ours to run. A world costs about thirty cents to build, and playing one costs almost nothing.

Spark 1.3's vision is the gate no code test can replace. Our science checks proved the numbers were right, but only a model that could watch the world noticed when the picture showed something else.

Muse Image and SAM 3.1 together turn a typed question into a painted world with creatures that move. That makes a learner want to stay and experiment instead of reading an answer.

Muse Voice Transcribe lets younger learners say what they think instead of typing it.

It also matters that the hidden law stays hidden. The same family that writes the law also judges the learner without revealing it, so the whole loop stays consistent.

---

### Feedback on partner technologies (Fireworks, Modal, Baseten)

*(Draft: the two wishes below are my guesses, so keep only the ones that match your experience.)*

We used Baseten to serve Muse Spark Open. Its OpenAI-compatible endpoint meant the same client code worked for every reasoning role, and its throughput let us build and check many worlds in parallel during our evaluation runs. Two things would have helped: per-key spend limits in the dashboard (we built our own ledger to enforce a hard cap) and clearer errors on long streaming calls that time out. We didn't use Fireworks or Modal.

---

### Ratings (your call: these are your opinions)

- How likely to build with Meta Model API: *[pick]*
- Overall opinion of Meta Model API: *[pick]*
- Recommend Meta Model API (0–10): *[pick]*
- Recommend Muse Code (0–10): *[pick; say if you didn't use it]*

---

### Optional survey questions (drafts: edit them to match your own experience)

**Biggest obstacle:** Getting a model to write a world whose science is true, not just plausible. Our models sometimes wrote readings as formulas of the sliders instead of measuring the simulation, and every science check passed anyway. We had to build a check that swaps the world under each reading to catch it. Close behind: decoding SAM 3.1's streamed, range-coded masks, which needed custom code.

**How Meta's models compared:** Spark Open was strong at structured, multi-step work: finding a law, then writing code that obeys it, then repairing it from notes. It handled being a judge that never gives the answer away better than we expected. Spark 1.3's vision was the surprise: it caught real visual bugs our tests didn't.

**What matters most when choosing a model or tool:** Cost per task and reliability of structured output. Open weights, so the parts that run on every user action stay cheap.

**Hardest thing about switching:** Our prompts, checks and repair loop are tuned to how these models fail. A new model would need the whole evaluation re-run (`pnpm lab`, `pnpm eval`) before we trusted it.

**What would stop you using Meta's models in production:** Rate limits and availability guarantees for the vision model, which every new world depends on, and clear long-term pricing.
