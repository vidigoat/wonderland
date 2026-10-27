import { describe, expect, it } from "vitest";
import { STUDY_EXPLANATION, STUDY_QUESTIONS, readStudyAnswers, scoreStudy, summariseStudy } from "./score";

describe("the study", () => {
  it("explains natural selection in about 150 words, by hand", () => {
    const count = STUDY_EXPLANATION.split(/\s+/).filter(Boolean).length;
    expect(count).toBeGreaterThanOrEqual(130);
    expect(count).toBeLessThanOrEqual(170);
    expect(STUDY_EXPLANATION).not.toMatch(/hiddenLaw|answerKey/);
  });

  it("asks four new situations, and scores only the selection answer", () => {
    expect(STUDY_QUESTIONS).toHaveLength(4);
    expect(STUDY_QUESTIONS.map((question) => question.prompt).join(" ")).not.toMatch(/hare/i);
    expect(scoreStudy([1, 1, 1, 1])).toBe(4);
    expect(scoreStudy([0, 1, 2, 1])).toBe(2);
  });

  it("rejects a personal or incomplete reply, and keeps a real one", () => {
    expect(readStudyAnswers({ id: "not-a-uuid", arm: "read", choices: [1, 1, 1, 1], confidence: 3 })).toBeNull();
    expect(readStudyAnswers({ id: "11111111-1111-1111-1111-111111111111", arm: "read", choices: [1, 1], confidence: 3 })).toBeNull();
    const kept = readStudyAnswers({
      id: "11111111-1111-1111-1111-111111111111",
      arm: "play",
      choices: [1, 1, 1, 1],
      confidence: 4,
      test: true,
    });
    expect(kept?.test).toBe(true);
    expect(kept?.arm).toBe("play");
  });

  it("averages the real lines and says when the group is small", () => {
    const line = {
      id: "11111111-1111-1111-1111-111111111111",
      arm: "read" as const,
      choices: [1, 1, 1, 1],
      confidence: 4,
      test: false,
      correct: 4,
      at: "2026-10-27T00:00:00.000Z",
    };
    const summary = summariseStudy([line, { ...line, id: "22222222-2222-2222-2222-222222222222", arm: "play", correct: 2, confidence: 2 }]);
    expect(summary.n).toBe(2);
    expect(summary.small).toBe(true);
    expect(summary.read.accuracy).toBe(1);
    expect(summary.play.accuracy).toBe(0.5);
    expect(summary.play.confidence).toBe(2);
    expect(summariseStudy([]).read.accuracy).toBeNull();
  });
});
