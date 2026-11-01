/**
 * Where each world fits in a school's curriculum, so a teacher can find one for tomorrow's lesson. The closest
 * NGSS middle-school performance expectation where one fits honestly; otherwise the crosscutting concept the world
 * is really about, or the subject outside science it belongs to.
 */
export type Standard = {
  /** An NGSS (or CSTA) code, or null when no performance expectation fits honestly. */
  code: string | null;
  /** What the standard asks students to do, in plain words. */
  label: string;
};

const NGSS: Record<string, Standard> = {
  "peppered-forest": { code: "MS-LS4-4", label: "How variation in traits helps some individuals survive and reproduce" },
  "crowded-pond": { code: "MS-LS2-1", label: "How resource availability affects organisms and populations" },
  "predator-prey-valley": { code: "MS-LS2-2", label: "Patterns of interaction between organisms in ecosystems" },
  "green-tide-cove": { code: "MS-LS2-4", label: "How changes to an ecosystem affect its populations" },
  "mendel-pea-patch": { code: "MS-LS3-2", label: "Why sexual reproduction produces genetic variation" },
  "firefly-sync-kuramoto": { code: null, label: "Crosscutting concept: patterns, and how a whole system can act together" },
  "murmuration-sky": { code: null, label: "Crosscutting concept: systems, and how simple local rules make large patterns" },
  "shivering-circle": { code: "MS-PS3-3", label: "Related: how thermal energy transfer can be reduced" },
  firebreak: { code: "MS-ESS3-2", label: "Forecasting natural hazards and how to lessen their effects" },
  "newtons-cannon": { code: "MS-ESS1-2", label: "The role of gravity in the motions of the solar system" },
  "locked-moon": { code: "MS-ESS1-2", label: "The role of gravity in the motions of the solar system" },
  "seasons-tilt-world": { code: "MS-ESS1-1", label: "The Earth–Sun–Moon system: phases, eclipses and seasons" },
  "dune-march": { code: "MS-ESS2-2", label: "How geoscience processes change Earth's surface" },
  "sky-river-loop": { code: "MS-ESS2-4", label: "How water cycles through Earth's systems, driven by the Sun and gravity" },
  "sky-furnace": { code: "MS-ESS3-5", label: "The factors behind the rise in global temperatures" },
  "skyfall-tower": { code: "MS-PS2-2", label: "How an object's motion depends on the forces on it and its mass" },
  "carpet-speedway": { code: "MS-PS2-2", label: "How an object's motion depends on the forces on it and its mass" },
  "pendulum-isochronism": { code: "MS-PS2-2", label: "Related: how an object's motion depends on the forces on it" },
  "heat-diffusion-plate": { code: "MS-PS3-4", label: "How energy transfer relates to the material and its change in temperature" },
  "frozen-harbor-ice-float": { code: "MS-PS1-4", label: "How particle motion and temperature change a substance's state" },
  "jami-hui-jheel-001": { code: "MS-PS1-4", label: "How particle motion and temperature change a substance's state" },
  "sugar-dissolution-hot-water": { code: "MS-PS1-4", label: "How adding thermal energy changes particle motion" },
  "jarred-flame-o2-limit": { code: "MS-PS1-2", label: "Telling whether a chemical reaction has happened, and what it needs" },
  "phantom-jam-ring-road": { code: null, label: "Crosscutting concept: stability and change in a system" },
  "hallway-lanes": { code: null, label: "Crosscutting concept: patterns that emerge from many individuals" },
  "harvest-market": { code: null, label: "Economics: supply, demand and prices" },
  "rumour-town": { code: null, label: "Economics and media literacy: trust, rumours and bank runs" },
  gatekeeper: { code: "CSTA 2-NI-05", label: "How digital security measures protect information" },
};

/** The world's place in the curriculum, or null for a newly built world nobody has placed yet. */
export function standardOf(id: string): Standard | null {
  return NGSS[id] ?? null;
}

/** Every world that has a standard, for tests. */
export const PLACED_WORLDS = Object.keys(NGSS);
