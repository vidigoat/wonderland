/** The four shelves of the gallery, in the order a school would teach them. */
export const SUBJECTS = ["Physical science", "Life science", "Earth and space", "People and systems"] as const;
export type Subject = (typeof SUBJECTS)[number];

const KNOWN: Record<string, Subject> = {
  gatekeeper: "People and systems",
  "rumour-town": "People and systems",
  "phantom-jam-ring-road": "People and systems",
  "hallway-lanes": "People and systems",
  "harvest-market": "People and systems",
  "peppered-forest": "Life science",
  "predator-prey-valley": "Life science",
  "firefly-sync-kuramoto": "Life science",
  "murmuration-sky": "Life science",
  "shivering-circle": "Life science",
  "crowded-pond": "Life science",
  "mendel-pea-patch": "Life science",
  "green-tide-cove": "Life science",
  firebreak: "Earth and space",
  "newtons-cannon": "Earth and space",
  "dune-march": "Earth and space",
  "locked-moon": "Earth and space",
  "seasons-tilt-world": "Earth and space",
  "sky-river-loop": "Earth and space",
  "sky-furnace": "Earth and space",
  "heat-diffusion-plate": "Physical science",
  "sugar-dissolution-hot-water": "Physical science",
  "pendulum-isochronism": "Physical science",
  "frozen-harbor-ice-float": "Physical science",
  "skyfall-tower": "Physical science",
};

/** Which shelf a world sits on: known worlds by id, a newly built one by the words of its question. */
export function subjectOf(id: string, concept: string): Subject {
  const known = KNOWN[id];
  if (known) return known;
  const q = concept.toLowerCase();
  if (/price|market|bank|money|traffic|crowd|people|rumou?r|queue|vote|city|econom|trade|password|sql|code|computer|network/.test(q)) return "People and systems";
  if (/species|animal|population|predator|prey|evolv|evolution|gene|trait|cell|plant|flower|tree|bird|fish|insect|bee|\bants?\b|firefl|starling|penguin|bacteri|ecosystem|pollinat/.test(q)) return "Life science";
  if (/earth|moon|\bsun\b|planet|orbit|season|climate|weather|cloud|water cycle|ocean|tide|volcano|earthquake|dune|glacier|greenhouse|\bstars?\b|desert|river/.test(q)) return "Earth and space";
  return "Physical science";
}
