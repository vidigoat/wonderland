# Cerebral Valley form: final answers

Field by field, in the order the form asks.

---

**Which track?** Indie Developer Track

**Which problem statement?** Build for Your World

**Most Viral X post link:** left blank (not competing)

**Public GitHub Repository:** https://github.com/vidigoat/wonderland

**3-Minute Demo Video:** https://www.youtube.com/watch?v=oHAuQd47yW8

---

### Project Description

Wonderland: don't ask AI for the answer, ask it for a world.

AI is making learning too easy. In a 2026 study, people who learned with an AI assistant scored 17 points lower on understanding than people who learned without one, because the AI did the thinking for them.

Wonderland flips that. Type any "why" question, in any language, and a team of Meta models builds a small living world where the real answer is secretly at work. It takes about three minutes. Nobody tells you the answer. You predict what will happen, run experiments, put the rule in your own words, and prove it on a situation you've never seen. Meanwhile Ada, an AI scientist, races you to it.

The hard part is trust, because a world that teaches the wrong science is worse than no world at all. So every world must pass four checks before anyone plays it:
- its science holds on every random seed;
- it is actually playable;
- every number on screen is measured, never faked;
- Muse Spark 1.3 watches it run and confirms the picture matches the law.

A world that fails is repaired automatically.

Great interactive simulations have always taken experts months to build. PhET has made about 150 in twenty years. Wonderland builds one for any question, for about thirty cents. Teachers get a lesson guide matched to a science standard and a class link with a QR code, with no accounts needed. 28 worlds are live today, and the gallery grows every time someone asks a question.

Try it: https://wonderland-omega-fawn.vercel.app

---

### Describe your use of Meta products to build the submitted project

Wonderland runs entirely on Meta's models, and each one has its own job.

Muse Spark Open (open weights, served on Baseten) does all the reasoning. It plays six roles:
- the scientist, who finds the real law behind a question;
- the designer, who writes the world and its rules as code;
- the repairer, who fixes any world that fails a check;
- the judge, who decides whether a learner's own words capture the law, without ever revealing it;
- Ada, the AI rival, who runs real experiments and races the learner;
- the forty townspeople, who each think and speak for themselves.

Muse Spark 1.3 is the playtester. It watches every new world run and judges whether what's on screen matches what the science predicts. On its first pass it caught three visual bugs that our automated tests had missed.

Muse Image paints every world and creature. SAM 3.1 cuts each creature out of its painting so it can move, and it also counts figures in the playtest frames as a second opinion.

Muse Voice Transcribe lets a learner hold a button and say their idea out loud instead of typing it.

Together, they turn a typed question into a painted, scientifically checked, playable world in about three minutes.

---

### Why are Meta's models important to your solution?

Wonderland only works if the AI can check its own work, and Meta's models give us every kind of check we need in one family.

Open weights make it affordable. The judge, Ada and the townspeople run on every single play, so they have to be fast, cheap and ours to run. With Muse Spark Open, a world costs about thirty cents to build and almost nothing to play. That's the difference between a demo and something every classroom can use.

Vision is the check no code can replace. Our tests could prove the numbers were right, but only Muse Spark 1.3, watching the world run, could see when the picture told a different story.

Muse Image and SAM 3.1 turn a typed question into a world with characters that move. That is what makes a student want to stay and experiment instead of skimming an answer.

The result is an AI that builds the world and then steps back, so the learner does the thinking.

---

### Feedback on partner technologies (one line)

Baseten served Muse Spark Open for every reasoning role through one OpenAI-compatible endpoint. That kept our code simple and let us build and check many worlds in parallel. Per-key spend limits in the dashboard would have saved us building our own cost ledger.

---

### Ratings (your call)

- How likely to build with Meta Model API: Very likely
- The other ratings: pick what matches your experience.
