import type { ClientStage } from "@/engine/client-event";
import type { MontageItem } from "./sse";

const ORDER: { stage: ClientStage; label: string }[] = [
  { stage: "scientist", label: "The law" },
  { stage: "designer", label: "The room" },
  { stage: "checker", label: "The science" },
  { stage: "artist", label: "The pictures" },
  { stage: "done", label: "Bound" },
];

export type BindingStep = { stage: ClientStage; label: string; message: string; on: boolean };

export type BindingView = {
  steps: BindingStep[];
  checks: { passed: number; total: number } | null;
  world: Extract<MontageItem, { type: "world" }> | null;
  choose: Extract<MontageItem, { type: "choose" }> | null;
  error: string | null;
  notice: string | null;
};

/** Collapse the stream into one ceremony. The latest line for each station wins. */
export function bindingView(items: readonly MontageItem[]): BindingView {
  const messages = new Map<ClientStage, string>();
  let checks: BindingView["checks"] = null;
  let world: BindingView["world"] = null;
  let choose: BindingView["choose"] = null;
  let error: string | null = null;
  let notice: string | null = null;

  for (const item of items) {
    if (item.notice && !notice) notice = item.notice;
    if (item.type === "stage") {
      if (item.stage === "repair") messages.set("designer", item.message);
      else if (item.stage === "playtester") messages.set("done", item.message);
      else messages.set(item.stage, item.message);
    } else if (item.type === "checks") {
      checks = { passed: item.passed, total: item.total };
    } else if (item.type === "world") {
      world = item;
    } else if (item.type === "choose") {
      choose = item;
    } else if (item.type === "error") {
      error = item.message;
    }
  }

  const choiceOnly = choose != null && world == null;
  const unsaid: Partial<Record<ClientStage, string>> = {
    designer: "No room was written.",
    checker: "No checks were run.",
    artist: "No new pictures.",
    done: "Nothing new was bound.",
  };

  return {
    steps: ORDER.map((step) => {
      const said = messages.get(step.stage);
      if (said) return { ...step, message: said, on: true };
      if (choiceOnly) return { ...step, message: unsaid[step.stage] ?? "Not this time.", on: true };
      return { ...step, message: "", on: false };
    }),
    checks,
    world,
    choose,
    error,
    notice,
  };
}
