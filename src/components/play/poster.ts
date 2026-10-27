export type PosterMotif = "pipeline" | "population" | "bodies" | "field";

export type PosterCopy = {
  id: string;
  title: string;
  tagline: string;
  motif: PosterMotif;
  room: string;
  ink: string;
  accent: string;
  paper: string;
};

const ROOMS: Record<string, Pick<PosterCopy, "room" | "ink" | "accent" | "paper">> = {
  gatekeeper: { room: "#efe2c8", ink: "#3c1214", accent: "#6e1d24", paper: "#f7f0df" },
  "peppered-forest": { room: "#e4efe0", ink: "#1c2918", accent: "#3f6b45", paper: "#f6f3e8" },
  "newtons-cannon": { room: "#10151f", ink: "#efe6d4", accent: "#c4a36a", paper: "#1c2636" },
  "rumour-town": { room: "#f6efe6", ink: "#3a2a22", accent: "#d98a4a", paper: "#fff8ee" },
  firebreak: { room: "#12162a", ink: "#e7e2d4", accent: "#e07a3d", paper: "#1a2038" },
};

const MOTIFS: Record<string, PosterMotif> = {
  pipeline: "pipeline",
  population: "population",
  bodies: "bodies",
  field: "field",
};

const FALLBACK = { room: "#f3ead7", ink: "#14110e", accent: "#a56b3c", paper: "#fff8ee" };

/** Public title and tagline only. Callers pass `toPublic` output, never a full spec. */
export function posterCopy(world: { id: string; title: string; tagline: string; archetype: string }): PosterCopy {
  const motif = MOTIFS[world.archetype] ?? "population";
  return {
    id: world.id,
    title: world.title,
    tagline: world.tagline,
    motif,
    ...(ROOMS[world.id] ?? FALLBACK),
  };
}
