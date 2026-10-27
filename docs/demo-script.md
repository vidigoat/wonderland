# Demo video — 3 minutes

Recorded on the real app with live models (Muse Spark Open on Baseten). Every word on screen below is what the app actually shows. Only show what was built during the hackathon.

**Before recording:** `pnpm build && pnpm start` (production is much faster than dev). Open a fresh browser window at 1440×900. Pre-build one new world the night before (it takes ~2 minutes) so the build can be shown in full and then cut.

| Time | Beat | What's on screen |
|---|---|---|
| 0:00 | **Hook** | Landing. Fireflies drift on black and slowly fall into one rhythm. Title: *"The AI builds the world. You find the law."* Voice-over: "People who learned with an AI assistant scored 17 points lower on understanding. So we built the opposite." |
| 0:10 | **The product, live** | Scroll a little: the product window shows **Rumour Town running live** — one rumour, a queue, *"The bank has closed its doors."* Stats row: worlds you can enter, how many Muse Spark Open wrote, *every check, every seed*. |
| 0:20 | **Ask anything** | Click into the question box, type a fresh question (e.g. *"Why do sand dunes slowly march across the desert?"*), press **Build my world**. |
| 0:25 | **The build** (cut to the end) | Steps light up: *Find the law → Build the world → Check the science → Ready*. The law is shown only as ███. The clock reads *Muse Spark is working · 1:40*. Then **4 of 4 science checks passed** and *"Your world is ready. The law stays hidden."* Press **Enter the world**. |
| 0:45 | **The Gatekeeper** (the hero) | Open The Gatekeeper's Ledger. **I have a guess** → choose *"Choke — the spell breaks"* → **Write it down**. Type `O'Brien` → **Send the scroll**: *"The scribe stopped."* The real SQLite error highlights `Brien`. |
| 1:10 | **The aha** | Name and password `' OR '1'='1` → **Send the scroll**: *"The vault is open."* The injected part is highlighted in the real query; the ledger leaks the queen's and steward's entries. |
| 1:25 | **The race** | Point at Ada's card: her live thought (Muse Spark Open), the race table — **You** vs **Ada**, her vault still shut. |
| 1:35 | **Say it** | **I can say it**. Hold to speak, or type: *"The scribe pastes my words straight into the spell, so a quote ends the name early and the rest runs as command."* **Offer this sentence**. The judge (live) accepts — and never repeats the law. |
| 1:55 | **Prove it** | A new situation slides over the stage: a library search box. Answer, then choose *"No — your words stay words."* The card: *Before: Held · After: Held · Time until it held*. *"The law is not printed on this card."* |
| 2:15 | **Rumour Town** | 40 citizens, each voiced by Muse Spark Open in one call: *"Is the queue for the festival? No?"* — **Let them talk** → the run → *"The bank has closed its doors."* Then insurance on: the bank stays open. |
| 2:35 | **Worlds it wrote** | Every world page → *Written by Muse Spark Open*: fireflies in sync, phantom traffic jams, crowd lanes, heat, dunes, predator–prey. Each card is a still of the world itself. |
| 2:50 | **Close** | "The AI does the building. You do the thinking." Wonderland. |

## Models on screen
- Muse Spark Open (Meta open weights, Baseten): scientist, designer, judge, Ada, the 40 citizens, spoken hypotheses.
- With the Meta Model API key enabled: Muse Spark / Muse Wonder for building, Muse Image + SAM 3.1 for art.
