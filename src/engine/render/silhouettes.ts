import type { Graphics } from "pixi.js";

const WHITE = 0xffffff;

function fill(color = WHITE, alpha = 1) {
  return { color, alpha };
}

/** Procedural stand-in for `/art/<world>/<sprite>.svg`. Drawn around the origin, about 48px tall. */
export function drawSilhouette(g: Graphics, sprite: string): void {
  const key = sprite.toLowerCase();
  if (key.includes("moth")) drawMoth(g);
  else if (key.includes("queue")) drawCitizen(g, true);
  else if (key.includes("citizen") || key.includes("person") || key.includes("towns")) drawCitizen(g, false);
  else if (key.includes("bird") || key.includes("starling")) drawBird(g);
  else if (/predator|lynx|fox|wolf|cat|hunter|shark/.test(key)) drawPredator(g);
  else if (/prey|hare|rabbit|mouse|deer|sheep/.test(key)) drawPrey(g);
  else if (/fish|salmon|minnow/.test(key)) drawFish(g);
  else if (/\bbees?\b|\bants?\b|insect|beetle|\bfly\b|\bflies\b/.test(key)) drawInsect(g);
  else if (/\bcells?\b|bacteri|virus|molecule|particle|\batoms?\b/.test(key)) drawCell(g);
  else if (/\bcars?\b|vehicle|truck|\bbus\b/.test(key)) drawCar(g);
  // Before "fire": a firefly is a light, not a flame.
  else if (key.includes("firefly") || key.includes("glow") || key.includes("light") || key.includes("spark") || key.includes("star")) drawGlow(g);
  else if (key.includes("flame") || key.includes("fire") || key.includes("ember")) drawFlame(g);
  else if (key.includes("tree") || key.includes("sapling") || key.includes("pine")) drawTree(g);
  else if (key.includes("cannon")) drawCannon(g);
  else if (key.includes("scroll")) drawScroll(g);
  else if (key.includes("scribe")) drawScribe(g);
  else if (key.includes("ledger") || key.includes("book")) drawLedger(g);
  else if (key.includes("vault") || key.includes("door")) drawVault(g);
  else if (key.includes("planet")) drawPlanetMark(g);
  else if (key.includes("bank")) drawBank(g);
  else drawSeed(g);
}

function drawMoth(g: Graphics): void {
  g.poly([-2, -6, -10, -18, -30, -8, -32, 6, -18, 16, -4, 8]).fill(fill());
  g.poly([2, -6, 10, -18, 30, -8, 32, 6, 18, 16, 4, 8]).fill(fill());
  g.circle(-16, -2, 3.2).fill(fill(WHITE, 0.4));
  g.circle(16, -2, 3.2).fill(fill(WHITE, 0.4));
  g.ellipse(0, 2, 3.4, 14).fill(fill());
  g.moveTo(-2, -10).lineTo(-7, -18).stroke({ width: 1.2, color: WHITE, cap: "round" });
  g.moveTo(2, -10).lineTo(7, -18).stroke({ width: 1.2, color: WHITE, cap: "round" });
}

function drawCitizen(g: Graphics, queue: boolean): void {
  g.ellipse(0, 6, 11, 15).fill(fill());
  g.circle(0, -14, 7.2).fill(fill());
  g.ellipse(-7, 20, 4, 2.4).fill(fill());
  g.ellipse(7, 20, 4, 2.4).fill(fill());
  if (queue) {
    g.ellipse(14, 8, 5, 6.5).fill(fill());
    g.poly([6, -2, 16, -16, 20, -14, 12, 2]).fill(fill());
  } else {
    g.ellipse(-13, 4, 3.2, 7).fill(fill());
    g.ellipse(13, 4, 3.2, 7).fill(fill());
  }
}

function drawBird(g: Graphics): void {
  g.ellipse(2, 0, 10, 5).fill(fill());
  g.poly([8, -1, 18, -3, 16, 2, 8, 3]).fill(fill());
  g.poly([-2, -2, -22, -14, -16, -4, -4, 2]).fill(fill());
  g.poly([-2, 1, -20, 10, -12, 4]).fill(fill());
  g.circle(12, -1, 1.6).fill(fill(WHITE, 0.45));
}

function drawFlame(g: Graphics): void {
  g.poly([0, -24, 7, -8, 5, 0, 12, 8, 5, 18, 0, 10, -5, 18, -12, 8, -5, 0, -7, -8]).fill(fill());
  g.poly([0, -8, 3, 2, 0, 12, -3, 2]).fill(fill(WHITE, 0.45));
}

function drawTree(g: Graphics): void {
  g.poly([0, -26, 16, -2, 8, -2, 20, 16, -20, 16, -8, -2, -16, -2]).fill(fill());
  g.poly([-2.4, 16, 2.4, 16, 1.6, 24, -1.6, 24]).fill(fill());
}

function drawCannon(g: Graphics): void {
  g.poly([-26, -5, 16, -8, 28, -3, 28, 3, 16, 8, -26, 5]).fill(fill());
  g.circle(-16, 10, 7).fill(fill());
  g.circle(-2, 10, 7).fill(fill());
  g.circle(-16, 10, 2.4).fill(fill(WHITE, 0.35));
  g.circle(-2, 10, 2.4).fill(fill(WHITE, 0.35));
}

function drawScroll(g: Graphics): void {
  g.roundRect(-16, -12, 32, 24, 6).fill(fill());
  g.circle(-18, 0, 10).fill(fill());
  g.circle(18, 0, 10).fill(fill());
  g.moveTo(-8, -4).lineTo(8, -4).stroke({ width: 1.4, color: WHITE, alpha: 0.45, cap: "round" });
  g.moveTo(-8, 2).lineTo(6, 2).stroke({ width: 1.4, color: WHITE, alpha: 0.45, cap: "round" });
}

function drawScribe(g: Graphics): void {
  g.ellipse(0, 14, 18, 5).fill(fill(WHITE, 0.85));
  g.ellipse(0, 2, 10, 12).fill(fill());
  g.circle(0, -14, 7).fill(fill());
  g.poly([8, -6, 26, -18, 28, -14, 12, -2]).fill(fill());
}

function drawLedger(g: Graphics): void {
  g.ellipse(-8, 2, 14, 16).fill(fill());
  g.ellipse(8, 2, 14, 16).fill(fill());
  g.moveTo(0, -12).lineTo(0, 16).stroke({ width: 2, color: WHITE, alpha: 0.5, cap: "round" });
}

function drawVault(g: Graphics): void {
  g.circle(0, 0, 18).fill(fill());
  g.circle(0, 0, 11).stroke({ width: 2, color: WHITE, alpha: 0.55 });
  g.circle(0, 0, 3).fill(fill(WHITE, 0.5));
  g.roundRect(-2, 0, 12, 3, 1).fill(fill(WHITE, 0.65));
}

function drawPlanetMark(g: Graphics): void {
  g.circle(0, 0, 16).fill(fill());
  g.ellipse(0, 0, 22, 6).stroke({ width: 1.5, color: WHITE, alpha: 0.55 });
}

function drawBank(g: Graphics): void {
  g.poly([-20, -4, 0, -20, 20, -4]).fill(fill());
  g.roundRect(-16, -4, 32, 20, 2).fill(fill());
  g.rect(-3, 4, 6, 12).fill(fill(WHITE, 0.35));
  g.rect(-12, 2, 3, 14).fill(fill(WHITE, 0.45));
  g.rect(9, 2, 3, 14).fill(fill(WHITE, 0.45));
}

function drawSeed(g: Graphics): void {
  g.ellipse(0, 2, 12, 16).fill(fill());
  g.ellipse(0, -8, 5, 8).fill(fill(WHITE, 0.75));
  g.moveTo(0, -16).lineTo(0, -22).stroke({ width: 1.4, color: WHITE, cap: "round" });
}

/** A soft light: halo rings fading out to a bright core. Tint drives how lit it reads. */
function drawGlow(g: Graphics): void {
  g.circle(0, 0, 22).fill(fill(WHITE, 0.08));
  g.circle(0, 0, 15).fill(fill(WHITE, 0.16));
  g.circle(0, 0, 9).fill(fill(WHITE, 0.4));
  g.circle(0, 0, 5).fill(fill(WHITE, 1));
}

/** Prey: a round body with two tall ears — reads as a hare at a glance. */
function drawPrey(g: Graphics): void {
  g.ellipse(-4, -22, 3.2, 10).fill(fill());
  g.ellipse(4, -22, 3.2, 10).fill(fill());
  g.circle(0, -10, 7).fill(fill());
  g.ellipse(0, 4, 11, 10).fill(fill());
}

/** Predator: a wider head with pointed ears and a low body — reads as a cat or lynx. */
function drawPredator(g: Graphics): void {
  g.poly([-10, -14, -7, -26, -2, -16]).fill(fill());
  g.poly([10, -14, 7, -26, 2, -16]).fill(fill());
  g.ellipse(0, -10, 10, 8).fill(fill());
  g.ellipse(0, 5, 15, 9).fill(fill());
  g.moveTo(14, 6).quadraticCurveTo(24, 0, 22, -8).stroke({ width: 3, color: WHITE, cap: "round" });
}

function drawFish(g: Graphics): void {
  g.ellipse(-2, 0, 15, 8).fill(fill());
  g.poly([12, 0, 22, -8, 22, 8]).fill(fill());
}

function drawInsect(g: Graphics): void {
  g.ellipse(-8, -6, 7, 5).fill(fill(WHITE, 0.55));
  g.ellipse(8, -6, 7, 5).fill(fill(WHITE, 0.55));
  g.ellipse(0, 0, 5, 10).fill(fill());
  g.circle(0, -12, 4).fill(fill());
}

function drawCell(g: Graphics): void {
  g.circle(0, 0, 13).fill(fill(WHITE, 0.35));
  g.circle(0, 0, 13).stroke({ width: 2, color: WHITE });
  g.circle(2, -1, 5).fill(fill());
}

function drawCar(g: Graphics): void {
  g.roundRect(-16, -6, 32, 12, 4).fill(fill());
  g.roundRect(-8, -13, 16, 8, 3).fill(fill(WHITE, 0.8));
}
