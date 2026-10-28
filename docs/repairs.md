# Hand repairs to model-written worlds

The seven worlds in `data/worlds/` were written by Muse Spark Open from one typed question each, and saved because their science checks passed on every seed. On 27–28 Oct we found that some of their readings were formulas of the controls rather than measurements of the world. The checks tested those formulas, so they passed. This file lists every hand change made since, so nothing is presented as model-written that isn't.

The model's original version of every world is in git: `git show 54855ad:data/worlds/<id>.json`.

The gate that now catches faked readings is `src/agents/honesty.ts` (the honest-readings check), which runs in the build pipeline after the playability lint. `pnpm verify-worlds` re-runs all three gates on every saved world.

| World | Rules changed by hand | Checks changed by hand | Why |
|---|---|---|---|
| `murmuration-sky` | Yes. The birds now keep a gap, copy their neighbours' heading and stay with the flock, and every reading is measured from them. | Two cut-offs moved to the same line as their control checks: collisions with separation `< 0.05` (the control without separation is `> 0.05`), flock radius with cohesion `< 60` (the control without cohesion is `> 60`). | The original birds didn't flock, and flock radius, alignment and collision rate were formulas of the controls (flagged by the honest-readings check). |
| `firefly-sync-kuramoto` | Yes. Readings come from the fireflies' own phases. Three readings were removed or replaced, two of which restated controls. | No. | "Leader visible" and "outside cue" restated the controls (flagged). |
| `dune-march` | Yes. "How fast the crest walks" is the crest's measured movement per step, in dune widths per 10,000 steps; "sand lost on the windward face" is the rate the step computed. One gesture runs long enough to see the crest move. | One. Bagnold's inverse-height check now asks a height-20 dune at wind 8 to walk about 0.30 dune widths per 10,000 steps, half the 0.60 of a height-10 dune. It used to compare a formula with itself. | Both readings were formulas of the wind setting (flagged). |
| `phantom-jam-ring-road` | Yes. The jam's speed is the measured slope of the jam's position around the ring. Readings renamed in plain words. | No. | The jam speed was a fixed formula, even when the cars disagreed. |
| `heat-diffusion-plate` | Yes. Readings are in degrees (difference, hottest spot, change from one spot to the next) instead of a variance and a sum over cells. | No. | The numbers were correct but meaningless to a player. |
| `hallway-lanes` | Yes. Walking pace is measured from whether each person was blocked on that step. | Two checks added: lanes restore the usual pace, and without sidestepping head-on meetings keep the crowd slow. The original five are unchanged. | The pace reading needed measuring, and the new checks hold it to the law. |
| `predator-prey-valley` | No. | No. | Only labels, hints and transfer wording changed. |

All seven also had player-facing words rewritten in plain language (labels, units, hints, story lines, prediction prompts). Answer keys were not changed.
