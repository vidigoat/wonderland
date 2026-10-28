/**
 * The Lab: fifteen phenomena from a middle-school science curriculum (NGSS-style physical, life, and earth and
 * space science), plus one everyday system. Fixed before the run, so the pass rate can't be cherry-picked.
 * None repeats a world already built. Run with `pnpm lab`; results in docs/lab-results.md.
 */
export const LAB_QUESTIONS = [
  // Physical science
  "Why does a bouncing ball bounce a little lower every time?",
  "Why does a pendulum take the same time to swing whether you push it gently or hard?",
  "Why does a sound get quieter the further away you are?",
  "Why does a balloon rubbed on your hair stick to a wall?",
  "Why does ice float on water?",
  // Earth and space science
  "Why do we have seasons?",
  "Why does the Moon change shape over a month?",
  "How does the water cycle move water around the Earth?",
  "How does the greenhouse effect keep the Earth warm?",
  // Life science
  "Why does a population grow fast and then level off?",
  "How are traits passed from parents to their offspring?",
  "Why do species disappear when their habitat shrinks?",
  "Why do flowers and their pollinators depend on each other?",
  "Why do invasive species take over a new place so quickly?",
  // An everyday system
  "Why does a checkout queue suddenly get very long when the shop is only a little busier?",
] as const;
