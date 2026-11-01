"use client";

import { createContext, useContext } from "react";

/**
 * The words around a world (buttons, steps, Ada's panel, the card) in the language the world was asked in. The
 * world's own text (story, controls, readings, judge) is already written in that language by the models; this
 * covers the frame, so a student who asked in Hindi plays entirely in Hindi. Error messages stay in English.
 */
export type Lang = "en" | "hi";

/** The language to frame a world in, read from the world's own words: Devanagari means Hindi. */
export function worldLanguage(spec: { title: string; concept: string }): Lang {
  return /[ऀ-ॿ]/.test(`${spec.title} ${spec.concept}`) ? "hi" : "en";
}

const EN = {
  lang: "en" as Lang,
  copyLink: "Copy link",
  copied: "Copied",
  allWorlds: "All worlds",
  findingOut: "You're finding out",
  progress: "Your progress",
  steps: ["Predict", "Experiment", "Explain", "Prove"],
  stepLabel: (n: number, total: number, name: string) => `Step ${n} of ${total} · ${name}`,
  mystery: "The mystery",
  missionTitle: "Something in this world follows a hidden rule. Your job is to find it.",
  mission: [
    ["Predict", " what will happen, before you touch anything."],
    ["Experiment.", " Change the controls, run the world, watch the readings."],
    ["Say it", " in one sentence, typed or spoken. A judge tells you how close you are."],
    ["Prove it", " on a situation you haven't seen."],
  ] as [string, string][],
  missionRace: "Ada, an AI scientist, is racing you on this same world. She moves after you do.",
  start: "Start: make a prediction",
  provenance: (hero: boolean, painted: boolean, checks: number) =>
    `${hero ? "Built by hand" : "Written by Muse Spark Open"}${painted ? ", painted by Muse Image and SAM 3.1" : ""}. Its rules passed ${checks} science ${
      checks === 1 ? "check" : "checks"
    } on every seed before you could enter. The rule itself is never sent to your browser.`,
  predictLede: "Before you touch anything, say what you think will happen.",
  writing: "Writing",
  writeItDown: "Write it down",
  predictAside: "You'll find out whether you were right at the end. For now, just commit to a guess.",
  sealed: "Your prediction · checked at the end",
  experimentHint: (controls: string[], run: string) => {
    const which = controls.length >= 2 ? `${controls[0]} or ${controls[1]}` : (controls[0] ?? "one control");
    return `Change ${which}, press “${run}”, and watch what happens on the stage. Change one thing at a time so you can tell what caused what.`;
  },
  hypothesiseLede: "What rule makes this world behave the way it does? Put it in your own words.",
  closer: "Closer",
  further: "Further off",
  yourSentence: "Your sentence",
  margin: "Penciled in the margin",
  setKnobs: "Set those knobs",
  sayLaw: "Say the law in one sentence.",
  listening: "Listening",
  holdToSpeak: "Hold to speak",
  offered: "Offered",
  offer: "Offer this sentence",
  anotherTrial: "Run another trial first",
  newSituation: "A new situation",
  transferLede: "If you really understood the rule, you can predict a situation you haven't seen.",
  offerProof: "Offer the proof",
  onceMore: "Once more, at the end",
  trialAgain: "The trial you left is on the stage again.",
  writeThis: "Write this one down",
  discovered: "What you discovered",
  discoveredAside: "Nobody told you this. You found it by experimenting, then proved it on a situation you hadn't seen.",
  lawHidden: "The law stays hidden until the judge agrees you've found it. Play again and say it in your own words.",
  kept: "What you kept",
  controls: "Controls",
  on: "on",
  off: "off",
  inMotion: "In motion",
  resetScene: "Set the scene again",
  lockedPredict: "These stay still until the first guess is written down.",
  lockedTransfer: "These belong to the new situation.",
  lockedLeft: "These are the knobs from the trial you left.",
  lockedStill: "The bench is still.",
  seenEnough: "Seen enough to name the rule?",
  iSee: "I think I see the rule",
  runTime: "Let time pass",
  runSpread: "Let it spread",
  runThrough: "Send it through",
  thisRun: "This run",
  thisRunPrior: "This run, with the previous run faded behind it",
  chartLabel: "How the readings changed during this run",
  chartWait: "Run the world. The lines show what changed.",
  letHerTry: "Let her try",
  thinking: "Thinking…",
  race: "Your readings and hers",
  raceLabel: "Where you and Ada differ",
  you: "You",
  adaQuiet: "An AI scientist racing you on this same world. She moves after you do.",
  adaProgress: (n: number) =>
    `She has run ${n} ${n === 1 ? "experiment" : "experiments"}. Her notes open once you have proved the law yourself, so they can't give it away.`,
  herBench: "Her bench",
  watching: "Spark is watching this world run.",
  lookedRight: "Spark watched it run: looked right.",
  flagged: "Spark watched it run and flagged the picture for another look.",
  keepCard: "Keep this card",
  card: {
    before: "Before",
    after: "After",
    held: "Held",
    missed: "Missed",
    secondPrediction: "Second prediction",
    transfer: "Transfer",
    time: "Time you spent",
    lawAbsent: "The law is not printed on this card.",
  },
};

export type UiText = typeof EN;
export type CardLabels = UiText["card"];

const HI: UiText = {
  lang: "hi",
  copyLink: "लिंक कॉपी करें",
  copied: "कॉपी हो गया",
  allWorlds: "सारी दुनियाएँ",
  findingOut: "आप पता लगा रहे हैं",
  progress: "आपकी प्रगति",
  steps: ["अनुमान", "प्रयोग", "समझाइए", "साबित कीजिए"],
  stepLabel: (n, total, name) => `चरण ${n} / ${total} · ${name}`,
  mystery: "रहस्य",
  missionTitle: "इस दुनिया में कुछ एक छिपे हुए नियम से चलता है। आपको वह नियम खोजना है।",
  mission: [
    ["अनुमान लगाइए", " कि क्या होगा, किसी भी चीज़ को छूने से पहले।"],
    ["प्रयोग कीजिए।", " नियंत्रण बदलिए, दुनिया चलाइए और रीडिंग देखिए।"],
    ["कहिए", " एक वाक्य में, लिखकर या बोलकर। एक जज बताएगा कि आप कितने क़रीब हैं।"],
    ["साबित कीजिए", " एक ऐसी स्थिति पर जो आपने पहले नहीं देखी।"],
  ],
  missionRace: "Ada, एक AI वैज्ञानिक, इसी दुनिया पर आपसे होड़ कर रही है। वह आपके बाद अपनी चाल चलती है।",
  start: "शुरू करें: अनुमान लगाइए",
  provenance: (hero, painted, checks) =>
    `${hero ? "हाथ से बनाई गई" : "Muse Spark Open ने लिखी"}${painted ? ", Muse Image और SAM 3.1 ने रंगी" : ""}। आपके आने से पहले इसके नियम हर सीड पर ${checks} विज्ञान जाँचों में पास हुए। नियम ख़ुद कभी आपके ब्राउज़र को नहीं भेजा जाता।`,
  predictLede: "किसी भी चीज़ को छूने से पहले बताइए कि आपके हिसाब से क्या होगा।",
  writing: "लिख रहे हैं",
  writeItDown: "लिख लीजिए",
  predictAside: "आप सही थे या नहीं, यह आख़िर में पता चलेगा। अभी बस एक अनुमान चुन लीजिए।",
  sealed: "आपका अनुमान · आख़िर में जाँचा जाएगा",
  experimentHint: (controls, run) => {
    const which = controls.length >= 2 ? `${controls[0]} या ${controls[1]}` : (controls[0] ?? "कोई एक नियंत्रण");
    return `${which} बदलिए, “${run}” दबाइए, और देखिए कि मंच पर क्या होता है। एक बार में एक ही चीज़ बदलिए, ताकि पता चले कि किस वजह से क्या हुआ।`;
  },
  hypothesiseLede: "कौन-सा नियम इस दुनिया को ऐसे चलाता है? अपने शब्दों में कहिए।",
  closer: "और क़रीब",
  further: "और दूर",
  yourSentence: "आपका वाक्य",
  margin: "हाशिये पर एक सुझाव",
  setKnobs: "ये नियंत्रण लगाइए",
  sayLaw: "नियम को एक वाक्य में कहिए।",
  listening: "सुन रहे हैं",
  holdToSpeak: "दबाकर बोलिए",
  offered: "भेज दिया",
  offer: "यह वाक्य भेजिए",
  anotherTrial: "पहले एक और प्रयोग कीजिए",
  newSituation: "एक नई स्थिति",
  transferLede: "अगर आप सच में नियम समझ गए हैं, तो ऐसी स्थिति का भी अनुमान लगा सकते हैं जो आपने नहीं देखी।",
  offerProof: "सबूत भेजिए",
  onceMore: "आख़िर में, एक बार और",
  trialAgain: "आपका पिछला प्रयोग फिर से मंच पर है।",
  writeThis: "इसे लिख लीजिए",
  discovered: "आपने क्या खोजा",
  discoveredAside: "यह आपको किसी ने नहीं बताया। आपने प्रयोग करके इसे खोजा, फिर एक नई स्थिति पर साबित किया।",
  lawHidden: "जब तक जज न माने कि आपने नियम खोज लिया है, वह छिपा रहता है। फिर से खेलिए और उसे अपने शब्दों में कहिए।",
  kept: "आपको क्या मिला",
  controls: "नियंत्रण",
  on: "चालू",
  off: "बंद",
  inMotion: "चल रहा है",
  resetScene: "दृश्य फिर से सजाइए",
  lockedPredict: "पहला अनुमान लिखे जाने तक ये रुके रहेंगे।",
  lockedTransfer: "ये नई स्थिति के नियंत्रण हैं।",
  lockedLeft: "ये आपके पिछले प्रयोग के नियंत्रण हैं।",
  lockedStill: "अब मेज़ पर कुछ नहीं बदलेगा।",
  seenEnough: "नियम बताने लायक़ देख लिया?",
  iSee: "मुझे नियम दिख रहा है",
  runTime: "समय बीतने दीजिए",
  runSpread: "फैलने दीजिए",
  runThrough: "आगे भेजिए",
  thisRun: "यह दौर",
  thisRunPrior: "यह दौर, पीछे हल्का दिखता पिछला दौर",
  chartLabel: "इस दौर में रीडिंग कैसे बदलीं",
  chartWait: "दुनिया चलाइए। रेखाएँ दिखाएँगी कि क्या बदला।",
  letHerTry: "उसे आज़माने दीजिए",
  thinking: "सोच रही है…",
  race: "आपकी रीडिंग और उसकी",
  raceLabel: "आप और Ada कहाँ अलग हैं",
  you: "आप",
  adaQuiet: "एक AI वैज्ञानिक जो इसी दुनिया पर आपसे होड़ कर रही है। वह आपके बाद अपनी चाल चलती है।",
  adaProgress: (n) => `उसने ${n} प्रयोग किए हैं। जब आप ख़ुद नियम साबित कर देंगे, तब उसके नोट खुलेंगे, ताकि वे नियम न बता दें।`,
  herBench: "उसकी मेज़",
  watching: "Spark इस दुनिया को चलते हुए देख रहा है।",
  lookedRight: "Spark ने इसे चलते देखा: सही लगा।",
  flagged: "Spark ने इसे चलते देखा और तस्वीर को दोबारा देखने के लिए चिह्नित किया।",
  keepCard: "यह कार्ड रख लीजिए",
  card: {
    before: "पहले",
    after: "बाद में",
    held: "सही",
    missed: "चूक गए",
    secondPrediction: "दूसरा अनुमान",
    transfer: "नई स्थिति",
    time: "आपका समय",
    lawAbsent: "नियम इस कार्ड पर नहीं छपा है।",
  },
};

export const UI_TEXT: Record<Lang, UiText> = { en: EN, hi: HI };

const UiTextContext = createContext<UiText>(EN);
export const UiTextProvider = UiTextContext.Provider;

/** The frame's words for the world being played. English outside a world. */
export function useUiText(): UiText {
  return useContext(UiTextContext);
}

/**
 * The run button outside English, by what kind of world it is. Not "Fire" for bodies: a written bodies world is as
 * often floating ice or falling rain as a cannon.
 */
export function genericRunVerb(t: UiText, archetype: string): string {
  if (archetype === "pipeline") return t.runThrough;
  if (archetype === "field") return t.runSpread;
  return t.runTime;
}
