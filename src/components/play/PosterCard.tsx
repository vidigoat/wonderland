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
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: copy.room,
        color: copy.ink,
        padding: "68px 76px 60px",
      }}
    >
      <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.22em", textTransform: "uppercase", color: copy.accent }}>
        {kicker}
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1.02, letterSpacing: "-0.03em" }}>{copy.title}</div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, marginTop: 22, maxWidth: 640 }}>{copy.tagline}</div>
        </div>
        <Motif motif={copy.motif} ink={copy.ink} accent={copy.accent} paper={copy.paper} />
      </div>
      <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.01em" }}>{footer}</div>
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
                background: gap ? paper : index < 4 ? accent : "#6d8f62",
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
