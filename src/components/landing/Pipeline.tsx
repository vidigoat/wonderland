import { Bot, Brush, FlaskConical, Gavel, Lightbulb, Microscope, ScanLine, Users } from "lucide-react";

/** The agents that build and run a world, and the Meta model behind each. Drawn as a pipeline: question in, verified world out. */
const BUILD = [
  { icon: Lightbulb, name: "Scientist", model: "Muse Spark Open", does: "Finds the real law behind your question, with the evidence a world must show." },
  { icon: Microscope, name: "Designer", model: "Muse Spark Open", does: "Invents the world, its controls and its mystery, and writes the rules as code." },
  { icon: FlaskConical, name: "Science checks", model: "Sandboxed, every seed", does: "Runs the code against the law's predictions. A failure goes back for repair; a world that keeps failing never ships." },
  { icon: Brush, name: "Artist", model: "Muse Image + SAM 3.1", does: "Paints the scene and every creature, then cuts each one out by its mask." },
];

const PLAY = [
  { icon: Bot, name: "Ada", model: "Muse Spark Open", does: "An AI scientist racing you on the same world. You can read her live reasoning." },
  { icon: Gavel, name: "Judge", model: "Muse Spark Open", does: "Reads your explanation and tells you how close you are, without ever saying the law." },
  { icon: Users, name: "Citizens", model: "Muse Spark Open", does: "Forty townspeople with their own voices, all written in a single call each round." },
  { icon: ScanLine, name: "Your voice", model: "Muse Voice Transcribe", does: "Hold to speak your hypothesis. It becomes words the judge can read." },
];

export function Pipeline() {
  return (
    <div className="pipe">
      <div className="pipe-lane">
        <p className="pipe-lane-label">Building a world · about two minutes</p>
        <ol className="pipe-row">
          {BUILD.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <li key={agent.name} className="pipe-node" data-gate={agent.name === "Science checks" ? "yes" : undefined}>
                <span className="pipe-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="pipe-name">{agent.name}</span>
                <span className="pipe-model">{agent.model}</span>
                <span className="pipe-does">{agent.does}</span>
                {index < BUILD.length - 1 ? <span className="pipe-arrow" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="pipe-lane">
        <p className="pipe-lane-label">While you play</p>
        <ul className="pipe-row">
          {PLAY.map((agent) => {
            const Icon = agent.icon;
            return (
              <li key={agent.name} className="pipe-node">
                <span className="pipe-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="pipe-name">{agent.name}</span>
                <span className="pipe-model">{agent.model}</span>
                <span className="pipe-does">{agent.does}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="pipe-foot">
        The hidden law, the answer keys and the checks stay on the server. The browser only ever receives the public world, so nothing on the page gives the answer away.
      </p>
    </div>
  );
}
