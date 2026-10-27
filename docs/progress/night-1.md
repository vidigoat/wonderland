# Night 1

Started Tue 27 Oct 2026, about 10:15 PM IST. This checkout had no `.spend/ledger.json` and no API keys in the environment, so no live spend was read and none was made.

## W1 · Readings and the dune

Shipped in `b377b1e`.

- A chart under the stage during Experiment, for every archetype except pipeline and every world except Rumour Town. Up to three numbers. Counts that move are drawn first. The previous run stays as a faint line on the same scale.
- The stage readout stays hidden until the first run. Tiny values print as 0, so `-0.00` is gone. Shares print as percents. Units like `m/s` and `(m/s)²` become plain words or drop out.
- The seven generated worlds now name what you can see ("Hares alive", "Hottest spot", "Traffic jams"). The designer prompt asks for the same on the next worlds, and for amounts that move during a run.
- A field that is filled under a ridge is drawn as one sand shape. A heat field is sampled smoothly. On a painting, the hard frame around that field is left off.

Checked with `pnpm check` (206 tests). Screenshots after one run, production server on port 3300, headed Chrome with SwiftShader, in `docs/progress/night-1/`:

| World | 1440×900 | 390×844 | What the picture showed |
|---|---|---|---|
| predator-prey-valley | yes | yes | 87 hares, 8 lynx. The hare line rises. |
| dune-march | yes | yes | A smooth sand pile on the painting. The crest line rises; the readout is still 0 dune widths because one run barely moves it. |
| heat-diffusion-plate | yes | yes | A soft hot spot. The lines fall. 63.9 degrees. |
| firefly-sync-kuramoto | yes | yes | 100 fireflies. Flashing together as a percent. |
| hallway-lanes | yes | yes | Lanes, 0 head-on bumps, a moving chart. The wide shot was taken while Fire was still in motion. |
| murmuration-sky | yes | yes | 61% facing the same way. |
| phantom-jam-ring-road | yes | yes | 1 jam, −3.57 metres per second, cars each hour. The wide shot was taken while Fire was still in motion. |

Dev mode on this machine never hydrated (the HMR socket failed), so the shots are from `next start`, not `pnpm dev`.

Judgement: the dune's numbers stay near zero for a short run. The chart shows the creep. I did not speed the dune up, because the checks depend on the slow rate.

## W2 · Playtester, started (`92da6c0`)

`look()` calls Muse Spark 1.3 on the Meta API with image parts. It does not go through `think()`, so an open-weights reasoning setting cannot turn the pictures into text.

`POST /api/playtest` takes a world id and 1–6 JPEG data URLs. It loads the full spec, asks whether the frames match the law and whether the picture is broken, then runs the reply through the judge's scrub. Notes are saved at `data/playtests/<worldId>.json`. With no key it returns `source: "sample"`, verdict `concern`, and the sentence "No key, so Spark did not watch this world." It does not say the world looked right.

`a4aacd5`: `/w/<id>?playtest=1` runs the world twice (starting controls, then one slider moved), grabs three JPEG frames of each, and posts them. The stage says "Looked right", "Spotted something: …", or, with no key, that Spark did not watch.

`caa7d84`: the build screen shows each painting as it arrives and each cut-out with a short glow, then runs the new world and posts the frames. Sample builds use the pictures already on the shelf. The $0.60 batch over the 12 worlds was not run. This checkout has no `MODEL_API_KEY`.

## W4 · A miss, and the wait (`15daeb4`)

A question that cannot become a world gets one sentence, three questions already on the shelf, and a button to play the closest world. Word overlap picks them. While a build runs, the clock says it usually takes 2–5 minutes, Rumour Town is there to play, and the page says the build continues if the tab is closed. When the world is ready the tab title changes and a chime plays.

## W5 · The study (`51c7aee`)

`/study` assigns each visitor, with `crypto.randomUUID` kept in the URL, to read a hand-written explanation or to play Peppered Forest for six minutes. Both then answer the same four new-situation questions and one confidence mark. Replies go to `data/study/responses.jsonl`. `?test=1` goes to a separate file and is excluded. `/study/results` shows the real count, accuracy, and confidence, and says the group is too small when fewer than 10 people have finished. There are no real replies yet. None were invented.

A finished play writes one anonymous line to `data/plays/plays.jsonl`. Nothing from that file is shown on screen.

## W3 · The eval (`74b93e9`)

`pnpm eval` is `scripts/eval-generate.ts`. Run here on Tue 27 Oct 2026, about 11:05 PM IST, with no key. It wrote `docs/eval-results.md` and exited 0. The eight questions were not sent to a model. No fraction, median time, or median cost. The README was not given a number. Failed questions were not re-run, and nothing new was painted.

The study pages are ink on the cream page. A first pass had drawn them in white, which disappeared. Checked on the production server: the read arm, the empty results table, and a question with no mechanism ("Why is the sky blue on a clear day?") which offered three shelf questions and Newton's Cannon.

The README test count was still 200. It is 223. `pnpm eval` is listed, and `/study` is described as built with no finished replies yet. A typed question, “Why does SQL injection work?”, on the production server matched The Gatekeeper’s Ledger, 4 of 4 checks, and offered Enter.

On a phone the forest drew all 120 moths, each about 19 pixels, so the flock was a field of specks. Commit `0bca0a1` draws 36 of them, keeps the bird, and holds each moth at least half a figure. A desk still draws the whole flock. `pnpm check` is 225 tests. Checked on the production server at 390 pixels wide: pale moths, dark moths, and the bird are readable on the birch.

The valley drew 111 hares and 7 lynx at about 20 pixels, so the lynx looked like more hares. Commit `3602b13` keeps every predator and draws that crowd large enough to tell apart. A firefly's brightness follows its own phase, so a dark one shrinks. Checked on the production server after one run: the meadow shows spotted lynx among the hares, and only a few fireflies are bright, which matches "flashing in step" at 2%. `pnpm check` is 226 tests.

Marching Dunes used the same short run as a fire. Commit `3cc291e`. At the default wind the crest moved a fraction of a cell, the picture sat still, and the distance read as 0. One gesture now walks the crest about 0.23 dune widths, in about ten seconds, and the shape ends further downwind. A speed of one half stays "0.5" instead of rounding to 1. The four dune checks still pass. Checked on the production server.

Murmuration Sky's readings were a formula of the knobs. Commit `8400980`. Letting time pass did not change them, and the birds did not separate or copy a heading. The flight is now real: birds keep a gap, copy neighbors, and stay with the flock. All six checks pass on seeds 1, 2 and 3. On the production server one run ends at 0 birds bumping, 17% facing the same way, and the flock spread at 15.7, with three lines on the chart.

The meadow used the same thirty steps as a short population run. Commit `202b7d4`. The fireflies had not locked: flashing in step stayed near 2%. One gesture now runs the two thousand steps the science needs. On the production server it finishes in about seven seconds at 88% flashing in step, and the chart climbs from the bottom of the frame to the top.

The valley's thirty steps were only the start of the hare boom. Commit `a9a06f9`. One gesture now runs the four hundred steps of a swing. On the production server it finishes in about twelve seconds: 112 hares, 26 lynx, the swing at 0.99, and the lynx peak 42 steps after the hares. The chart rises, falls, and the lynx line follows the hare line.

The ring road reported the jam's speed from a formula of the knobs, `-3.57` metres per second, even when the cars said otherwise. Commit `d656a88`. The speed is now the slope of the jam's own position along the ring. All five checks still pass. On the production server one run finishes in about eight seconds at `-3.79` metres per second, which is the measured slope, and the Fire button comes back.

`/api/worlds` listed only the five heroes. Commit `1a6aaa1`. It now lists all twelve playable worlds, and the body has no hidden law and no answer key. Checked on the production server. The ledger was also walked through to the receipt: the discovered sentence is the plain one, the hidden law is not on the page, and the card says the law is not printed. `pnpm check` is 227 tests.

The gallery card for Marching Dunes drew the sand as a staircase of cells. Commit `b6f45f0`. It now draws one smooth ridge, gentler on the windward side and steeper on the slip face, over the desert painting. The ember plate's hot spot is a soft glow. Checked on the production server.

The stage drew that same ridge from a few rows, so the slope was still a stair. Commit `af4317f`. The play view now blurs the ridge and keeps the crest where the sand put it. On the production server the dune is a smooth shape, gentler upwind and steeper on the slip face. `pnpm check` is 228 tests.

The ember plate said the heat was "170" and "6362". Commit `c2e1336`. Those were a variance and a sum of every cell. One run now reads 13 degrees of difference, a hottest spot of 63.9 degrees, and an average warmth of 6.21 degrees, which does not change. All five plate checks still pass. Checked on the production server.

The leftover heat number, "how fast heat is flowing 2.24", is the change from one spot on the metal to the next. Commit `fa5029e`. It now says that, in degrees. Birds bumping, a share between 0 and 1, shows as a percent. Checked on the production server: 13.2 degrees of difference, hottest spot 65.4 degrees, 2.27 degrees from one spot to the next, average warmth 6.21 degrees.

Painting every one of the plate's 48 steps held the button on "In motion" for about fifteen seconds. Commit `84d62cd`. The gesture now paints a dozen frames. On the production server it finishes in about five seconds: 13 degrees of difference, hottest spot 63.9 degrees, 2.24 degrees from one spot to the next, average warmth 6.21 degrees. A fire still paints every step.

"How fast the dune walks" was a bare 1. Commit `89f00d6`. It is the speed compared with a dune of height 10. On the production server a dune of height 10 walks at 1 times height 10, and the tallest dune, height 25, walks at 0.4 and covers 0.09 dune widths instead of 0.23. Both gestures finish in about eight seconds.

Sand lost on the windward face was printing 0. Commit `5c7efea`. The loss is about 0.0046 of a grain each step, which is real and was under the cutoff that turns tiny numbers into zero. It now reads -0.0046 each step. Other tiny readings still print as 0. Checked on the production server.

The ring road hid how much the cars' speeds differ. Commit `53d5939`. That number was a variance, and it was the fifth reading, so the card never showed it. It is now the spread in metres per second, and it sits on the card. On the production server one run finishes with the jam travelling at -3.79 metres per second, an average speed of 11 metres per second, and speeds that differ by 14.1 metres per second. All five jam checks still pass.

On the thirty-second bank, several people shouted "Getting my money out!" on top of each other, and one shout sat under the bank card. Commit `52a17a5`. A phrase is now said once, and on Rumour Town it is placed in the open sky. Checked on the production server: the line is readable above the bank, and the bank still closes on day 6. `pnpm check` is 229 tests.

"How hard the hares swing" was a bare 0.99. Commit `5d6d25c`. That number is the size of the swing divided by the average herd. On the production server one chase finishes at 0.99 of their average, with 112 hares, 26 lynx, and the lynx peak 42 steps later.

Letting the fire burn painted every step, so the button stayed on "In motion" for about fifteen seconds after the fire had already stopped, and the caption covered the legend. Commit `e903e3e`. The valley now paints sixteen frames. On the production server it finishes in about six seconds at 14% of the trees burned, the far ridge untouched, and the legend reads sapling, flame, and stump above the caption.

Thirty steps left the starlings only partly facing the same way. Commit `ea545f0`. One gesture now runs 400 steps. On the production server it finishes in about seven seconds with 0% bumping, 100% facing the same way, and the flock 15.3 from the centre.

The hallway used a cannon-length run. Commit `5315063`. On some seeds the two directions were still mixed, and the card said the lanes were 34% formed. One gesture now runs 2,000 steps, in the same number of pictures. On the production server it finishes in about eleven seconds at 100% lanes and 0% head-on bumps.

The meadow's "flashing in step" was a ramp laid over the real order, so the chart kept climbing after the swarm had locked. The card also repeated the sliders and a second percent. Commit `3ca0dfa`. The reading is now the swarm's own order, and a blink counts only when a firefly wraps. On the production server one gesture finishes in about seven seconds at 93% flashing in step and 0.16 flashes each second, with 100 fireflies. The chart rises, then holds. A phone shows the same three cards, at 87% on that run. All five science checks still pass. `pnpm check` is 231 tests.

Walking speed on the hallway was the crowd's wished-for pace times a collision formula, so the card stayed near 1.09. Commit `3266c0a`. It is now the share of their usual pace they manage on that step. The two directions face opposite ways, and the button says "Let them walk". On the production server one gesture finishes in about ten seconds at 100% lanes, 0% head-on bumps, and 1 of their usual pace. With sidestepping turned off it ends at 3% lanes, 17% head-on bumps, and 0.83 of their usual pace. The ring road button says "Let them drive". All seven hallway checks pass. `pnpm check` is 232 tests.

Stopped cars on the ring road wore the same painting as the ones still moving, so the jam was only a pile, and the sliders said m/s. Commit `f6ff03b`. A stopped car now goes red. The controls read "How many cars", "Length of the track", "Time to notice", "Speed they aim for", "Gap they keep", and "Brake tap". On the production server one drive finishes in about ten seconds: 1 jam, travelling at -3.79 metres per second, average speed 11 metres per second, speeds differing by 14.1 metres per second. The red knot sits in the line of cars. `pnpm check` is 234 tests.

The starlings could report that they faced the same way while every painted bird still pointed up. A starling was also drawn as a glow, because the name contains "star". Commit `de6fe5f`. Each bird now turns with its own heading. The controls read "Flock size", "How far they look", "Personal space", "Copy a neighbor", "Stay with the flock", and "Wind jitter". On the production server one pass finishes in about six seconds. One run ended at 64% facing the same way, the birds turned along that drift, and 0% bumping. A phone run ended at 95% facing the same way, 0% bumping, and the flock 18.4 from the centre. `pnpm check` is 237 tests.

The meadow, the dune, the hot plate, and the valley still named their controls in title case. The valley said "Hunt to kitten conversion". Commit `c6344bd`. On the production server the meadow now says "How much they notice neighbors", "How different their blinks are", "A bright leader", "A shared pulse", and "How many fireflies". The dune says "Wind strength" and "Dune height". The plate says "How fast it spreads", "Heat of the first spot", "The rest of the plate", and "Sealed edges". The valley says "Hares turned into lynx" and "How fast lynx decline". `pnpm check` is 238 tests.

A single jam read "1 jams". Commit `29d3a15`. A count of one now says jam, hare, firefly, degree, or step. On the production server one drive still finishes in about ten seconds at 1 jam, travelling at -3.79 metres per second. `pnpm check` is 238 tests.

The thirty-second bank on the landing still labelled "Getting my money out!" after the bank had held and nobody had taken a coin. Commit `499119c`. That key now appears only once people are withdrawing, or the bank has closed. On the production server the rumour still closes the bank on day 6, hiding the queue still closes it on day 6, and guaranteeing deposits keeps it open for twelve days with the legend reading only Calm and Worried. `pnpm check` is 238 tests.

On a phone the same town was a 16:10 frame about 210 pixels tall, so the vault card covered the square. Commit `61da95d`. The frame is now 520 pixels tall. On the production server, after the bank closes, the crowd, the shut door, and the caption are all visible under the card. `pnpm check` is 238 tests.

Average moth darkness was a bare 0.2 beside a percent, and on a phone the colour key sat on the numbers. Commit `a035b2b`. Darkness is a share of full soot, so one generation now reads 21% on a wide screen and 19% on a phone, next to the share of dark moths. The colour key sits in its own column. `pnpm check` is 238 tests.

An orbit held Fire on "In motion" past twenty seconds, because every few steps of the shot were painted. Commit `dff0159`. The trail already carries every point, so one gesture paints two dozen frames. Height above the ground is named in planet radii. On the production server a landing shot still finishes in about two seconds. A launch at speed 1 stays flying, completes 3.36 laps at 0.05 planet radii, and the button returns in about ten seconds. The chart shows the height rise and fall once each lap. `pnpm check` is 238 tests.

A name of `' OR '1'='1` breaks the quotes and still fails the password clause, so the vault stays shut, and the card never said so. Commit `c20ca11`. It now says the spell ran and the vault stayed shut. On the production server the wide stage and the phone both show the whole line, with the broken quote marked, and the vault shut. `pnpm check` is 239 tests.

The receipt card was drawn so tall that Ada covered the lines you had earned. Commit `5a25be4`. It now ends inside the notebook. On the production server a finished Peppered Forest shows the plain discovery, both predictions held, 14 seconds, and the line that the law is not printed. The hidden law is not on the page. `pnpm check` is 239 tests.

That fitted card was still a tall painting shrunk until the words were too small. Commit `c30a50e`. The painting sits on the left and the lines sit beside it. On the production server the card reads Peppered Forest, both predictions held, 14 seconds, and that the law is not printed. Ada sits under the card. The hidden law is not on the page. `pnpm check` is 239 tests.

A long prediction on that card stopped on the word "because". Commit `6413fcb`. The last line now keeps what fits and ends with an ellipsis when the sentence is longer. On the production server the before line reads through "before reproducing", and the after line reads "Stays roughly the same". `pnpm check` is 239 tests.

The fire cards said "Far ridge no" and "Flames no" after the fire had stopped. Commit `8087160`. They now say untouched or reached, and out or still going. The science checks still see yes and no. On the production server a default burn finishes in about six seconds at 10% of the trees burned, the far ridge untouched, and the flames out. `pnpm check` is 239 tests.

Asking about fireflies was matching the valley fire, because the word started with "fire". Commit `09e8838`. A keyword now has to be the word, or the word plus a short ending. A question that is not one of the five heroes is pointed at the worlds already on the shelf. On the production server "Why do fireflies start flashing in sync?" says the model did not write a new world, and the button plays The Meadow That Blinks As One. `pnpm check` is 240 tests.

The hallway shelf card still painted every person facing the same way. Commit `3295f30`. A negative heading now mirrors the figure, the same as on the stage. On the production server the Hallway Lanes card shows both directions. `pnpm check` is 241 tests.

The receipt called the minutes on the world "Time until it held", including when a prediction was missed. Commit `4793a11`. It now says "Time you spent". On the production server a finished Peppered Forest card reads 13s under that label, both predictions held, and that the law is not printed. `pnpm check` is 241 tests.

Forty steps left the ring-road shelf card as an even line of cars, before a jam exists. Commit `5a4c3cc`. The card now runs 220 steps, and the hallway card runs long enough for the two directions to sort. On the shelf seed those 220 steps pack 12 stopped cars together and leave the rest moving. The production gallery shows that card. `pnpm check` is 242 tests.

A larger red disc under each stopped car still never showed, because the car painting was drawn on top of it. Commit `bc53f56`. Commit `4820c56` draws that mark past the painting and fills the stopped cars a darker red. On the production gallery, at 1440 wide and on a phone, the bunch is one red knot at the left of the road and the moving cars stay smaller along the lane. `pnpm check` is 242 tests.

A dense planting on The Firebreak said the far ridge was still burning after the flames were out, and the ash was drawn as another stand of pale trees. Commit `6ae1e42`. A burned tree is now a short dark stump, and once the fire dies after reaching the ridge the line says "The far ridge burned." On the production server, with the saplings at 90%, one burn ends at 100% of the trees burned, the far ridge reached, and the flames out. The same three readings and that line show on a phone, and they do not cover one another. `pnpm check` is 242 tests.

Those first stumps were a few pixels tall, so the burned valley looked empty. Commit `615321c`. A stump is now a short post with a pale cut, about a third the height of a sapling. On the production server a default burn ends at 11% of the trees burned, the far ridge untouched, the flames out, and the valley still a stand of green saplings. The line says the fire stopped. At 90% the same stage is a field of those stumps, 100% burned, the far ridge reached, the flames out, and the line says the ridge burned. A phone shows that field of stumps under the same three readings. `pnpm check` is 242 tests.

A slow cannon shot's preview was a hop of about a tenth of a planet radius, and the barrel is wider than that, so the pale arc never showed. Commit `aa11ff6`. A short fall is now framed on the mountain. A flight that leaves the peak still frames the whole planet. The shot itself is unchanged. On the production server the default speed shows the arc from the muzzle down to the ground, on a wide window and on a phone. Speed 1 draws the arc around the planet. Firing the default speed lands: 0 laps, height 0 planet radii, status landed, and the line says it met the ground. `pnpm check` is 243 tests.

Forty steps left three shelf cards before their law had appeared. On seed 11 the meadow is still at order 0.22 with 8 fireflies lit, the flock's headings agree only 0.24, and the valley is still a field of hares with a handful of lynx. Commit `3348f7c`. The meadow card now waits until step 1000, a shared flash: order 0.83 and 50 of 100 lit. The flock waits until step 400, when the headings agree 0.97. The valley waits until step 200, when the hares have crashed and the lynx outnumber them. The longer runs yield between chunks so the gallery can still paint. On the production gallery the meadow shows many fireflies bright at once, the valley shows both animals, and the flock has gathered in the sky. `pnpm check` is 243 tests.

## Still blocked on a key

The playtester batch of 12 worlds, capped at $0.60 of Meta, was not run. There is no `MODEL_API_KEY` and no ledger in this checkout. A live `pnpm eval` would stop if the Baseten total reached $4.30. Painting new worlds stays capped at $1.00 of Meta, and was not started.
