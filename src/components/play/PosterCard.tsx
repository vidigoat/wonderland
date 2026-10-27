import type { PosterCopy, PosterMotif } from "./poster";

export function PosterCard({
  copy,
  kicker = "Wonderland",
  footer = "The AI builds the world. You find the law.",
}: {
  copy: PosterCopy;
  kicker?: string;
  footer?: string;
}) {
  // Share cards follow the site: black and white, Geist-like sans, the ringed-dot mark.
  const ink = "#fafafa";
  const muted = "#a3a3a3";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#000000",
        color: ink,
        padding: "64px 72px 56px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 999, border: `3px solid ${ink}` }}>
          <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: ink }} />
        </div>
        <div style={{ display: "flex" }}>{kicker}</div>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.05em" }}>{copy.title}</div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, marginTop: 24, maxWidth: 660, color: muted }}>{copy.tagline}</div>
        </div>
        <Motif motif={copy.motif} ink={ink} accent={muted} paper="#262626" />
      </div>
      <div style={{ display: "flex", fontSize: 22, color: muted }}>{footer}</div>
    </div>
  );
}

function Motif({ motif, ink, accent, paper }: { motif: PosterMotif; ink: string; accent: string; paper: string }) {
  if (motif === "bodies") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 168, height: 168, borderRadius: 999, background: accent, display: "flex" }} />
        <div style={{ width: 36, height: 36, borderRadius: 999, background: ink, display: "flex" }} />
      </div>
    );
  }
  if (motif === "pipeline") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {["scroll", "scribe", "ledger", "vault"].map((name) => (
          <div key={name} style={{ display: "flex", width: 54, height: 78, borderRadius: 8, background: name === "vault" ? accent : paper, border: `3px solid ${ink}` }} />
        ))}
      </div>
    );
  }
  if (motif === "field") {
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
        {Array.from({ length: 11 }, (_, index) => {
          const gap = index >= 4 && index <= 6;
          return (
            <div
              key={index}
              style={{
                width: 16,
                height: gap ? 8 : 36 + ((index * 17) % 48),
                background: gap ? paper : index < 4 ? accent : ink,
                display: "flex",
              }}
            />
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: 196, gap: 12 }}>
      {Array.from({ length: 12 }, (_, index) => (
        <div
          key={index}
          style={{
            width: index % 5 === 0 ? 28 : 22,
            height: index % 5 === 0 ? 18 : 14,
            borderRadius: 999,
            background: index % 3 === 0 ? accent : ink,
            display: "flex",
          }}
        />
      ))}
    </div>
  );
}
