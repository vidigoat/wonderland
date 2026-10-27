export const STUDY_EXPLANATION = `Natural selection is a change in who gets to have offspring, not a change inside one animal. In any group, individuals differ. Some of those differences are passed to their young. If the surroundings make one difference safer — a moth that matches the bark is less likely to be eaten — the animals with that difference live long enough to breed, and their young tend to carry it too. Over many generations the group shifts toward that difference, even though no single animal changed colour to fit in. Take the birds away and the matching no longer helps, so the group stops shifting. The same pattern shows up wherever some inherited difference leaves more offspring than another: the group changes, and the individual does not rewrite itself. Wanting to fit in does not do the work. Surviving and breeding does.`;

export type StudyQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string];
  answer: 0 | 1 | 2;
};

/** Four new situations. None of them is the forest's snowy-hare transfer question. */
export const STUDY_QUESTIONS: StudyQuestion[] = [
  {
    id: "beetles",
    prompt: "Green beetles live on green leaves. A drought turns the leaves brown, and birds eat the beetles they can see. After many generations, what is true?",
    options: [
      "Each beetle turns brown during its life",
      "Brown beetles become more common, and no beetle changes its own colour",
      "The beetles stay green, because a drought is not a hunter",
    ],
    answer: 1,
  },
  {
    id: "piano",
    prompt: "A pianist practices for twenty years. What do her children inherit from that practice?",
    options: [
      "The skill, because she worked for it",
      "Nothing of the practice, only what she was born able to pass on",
      "The skill, but only if they hear her play",
    ],
    answer: 1,
  },
  {
    id: "fish",
    prompt: "Silver fish live in a bright stream. Dark weed spreads, and a heron eats the fish it can see. Over many generations, what happens?",
    options: [
      "Each fish darkens its own scales",
      "Darker fish become more common, because more of them survive to breed",
      "The fish leave, so colour never changes",
    ],
    answer: 1,
  },
  {
    id: "lava",
    prompt: "Pale lizards on pale sand are hard for hawks to see. A black lava flow covers part of the dune. On the lava, after many generations, what is true?",
    options: [
      "A pale lizard turns black when it walks on the rock",
      "Darker lizards become more common, and a pale lizard stays pale",
      "Colour stops mattering once the rock has cooled",
    ],
    answer: 1,
  },
];

export type StudyArm = "read" | "play";

export type StudyAnswers = {
  id: string;
  arm: StudyArm;
  choices: number[];
  confidence: number;
  test: boolean;
};

export function scoreStudy(choices: number[]): number {
  return STUDY_QUESTIONS.reduce((sum, question, index) => sum + (choices[index] === question.answer ? 1 : 0), 0);
}

export function readStudyAnswers(input: unknown): StudyAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== "string" || !/^[0-9a-f-]{36}$/i.test(raw.id)) return null;
  if (raw.arm !== "read" && raw.arm !== "play") return null;
  if (!Array.isArray(raw.choices) || raw.choices.length !== STUDY_QUESTIONS.length) return null;
  if (!raw.choices.every((choice) => choice === 0 || choice === 1 || choice === 2)) return null;
  if (typeof raw.confidence !== "number" || raw.confidence < 1 || raw.confidence > 5 || !Number.isInteger(raw.confidence)) return null;
  return {
    id: raw.id,
    arm: raw.arm,
    choices: raw.choices,
    confidence: raw.confidence,
    test: raw.test === true,
  };
}

export type StudyLine = StudyAnswers & { correct: number; at: string };

export type ArmSummary = { n: number; accuracy: number | null; confidence: number | null };

export function summariseStudy(lines: StudyLine[]): { n: number; read: ArmSummary; play: ArmSummary; small: boolean } {
  const arm = (name: StudyArm): ArmSummary => {
    const group = lines.filter((line) => line.arm === name);
    if (group.length === 0) return { n: 0, accuracy: null, confidence: null };
    const accuracy = group.reduce((sum, line) => sum + line.correct / STUDY_QUESTIONS.length, 0) / group.length;
    const confidence = group.reduce((sum, line) => sum + line.confidence, 0) / group.length;
    return { n: group.length, accuracy, confidence };
  };
  const read = arm("read");
  const play = arm("play");
  const n = read.n + play.n;
  return { n, read, play, small: n < 10 };
}
