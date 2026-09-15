"use strict";
// Generates the schematic pitch/manner SVG diagrams used in LEARNING.md and
// the lesson trainer (lesson/index.html). Re-run with `node scripts/gen-diagrams.js`
// after changing geometry, or to add diagrams for another model (e.g. waso).
//
// Colors use CSS classes (fg/guide/muted) with a prefers-color-scheme override
// baked into each SVG, so the diagrams stay legible on dark backgrounds too.
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "lesson", "diagrams");
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 220, H = 100;
const Y = { high: 20, mid: 50, low: 80 };
const X_START = 10, X_JOINT_END = 90, X_END = 210;

// How far the consonant's pitch target sits from the vowel, per locus.
const LOCUS_TARGET_Y = {
  Sharp: 6,
  Acute: Y.high,
  Mid: null, // flat: no pitch motion
  Grave: 94,
};

// How much of the pre-vowel timeline the manner's transition occupies, based
// on the synthesizer's actual segment durations (src/suli.ts): Interrupted
// I_TRANS=50ms (fast), Gradual G_TRANS=95ms, Continuous C_TRANS=170ms
// (slowest). In an isolated syllable (no preceding sound — what every
// trainer/explorer sound is), Interrupted's amplitude is already at full
// volume from the very start (only pitch moves); Continuous and Gradual
// both rise smoothly from silence, Continuous just taking much longer to do
// it. There is no mid-syllable silence GAP in this position — that only
// happens between two sounds in a row (e.g. mid-phrase), which these
// diagrams intentionally don't depict.
const MANNER_RAMP_FRACTION = {
  Interrupted: 0.18,
  Gradual: 0.45,
  Continuous: 0.85,
};

const STYLE = `<style>
  .fg { stroke: #2a2521; }
  .fgfill { fill: #2a2521; }
  .guide { stroke: #b8ac9a; }
  .muted { fill: #7a7268; }
  @media (prefers-color-scheme: dark) {
    .fg { stroke: #ece7df; }
    .fgfill { fill: #ece7df; }
    .guide { stroke: #5b5347; }
    .muted { fill: #a89f92; }
  }
</style>`;

function svgOpen() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system,Helvetica,Arial,sans-serif">${STYLE}`;
}

function guides() {
  let s = "";
  for (const [label, y] of Object.entries(Y)) {
    s += `<line x1="4" y1="${y}" x2="${X_END}" y2="${y}" class="guide" stroke-width="1" stroke-dasharray="2 3"/>`;
    s += `<text x="0" y="${y + 3}" font-size="8" class="muted">${label[0].toUpperCase()}</text>`;
  }
  return s;
}

function arrowMarkerDefs() {
  return `<defs>
    <marker id="arrUp" markerWidth="8" markerHeight="8" refX="4" refY="0" orient="auto">
      <path d="M0,6 L4,0 L8,6 Z" class="fgfill"/>
    </marker>
    <marker id="arrDown" markerWidth="8" markerHeight="8" refX="4" refY="6" orient="auto">
      <path d="M0,0 L8,0 L4,6 Z" class="fgfill"/>
    </marker>
  </defs>`;
}

function vowelLine(y, x0 = X_JOINT_END, x1 = X_END) {
  return `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="fg" stroke-width="3" stroke-linecap="round"/>`;
}

// A small amplitude/volume ramp icon in the corner: how sharply the sound
// reaches full volume. Interrupted = an instant step (already loud at time
// zero). Continuous/Gradual = a rising ramp, wide (slow) or narrow (fast).
function attackIcon(manner) {
  const bx = X_END - 40, by = 4, bw = 34, bh = 12;
  const frac = MANNER_RAMP_FRACTION[manner];
  const baseline = by + bh;
  let path;
  if (manner === "Interrupted") {
    // Sharp right angle: silent, then instantly at full height.
    path = `M ${bx} ${baseline} L ${bx} ${by} L ${bx + bw} ${by}`;
  } else {
    const riseX = bx + bw * frac;
    path = `M ${bx} ${baseline} L ${riseX} ${by} L ${bx + bw} ${by}`;
  }
  return `<path d="${path}" fill="none" class="fg" stroke-width="2" stroke-linejoin="round"/>` +
    `<line x1="${bx}" y1="${baseline}" x2="${bx + bw}" y2="${baseline}" class="guide" stroke-width="1"/>`;
}

// The consonant glide, ending where the vowel line begins. Manner controls
// how much of the pre-vowel span the pitch+volume transition takes: a short
// steep corner for Interrupted, a longer gentle diagonal for Continuous, in
// between for Gradual. See MANNER_RAMP_FRACTION above for why.
function consonantGlyph(locus, manner, vowelY) {
  const targetY = LOCUS_TARGET_Y[locus];
  let s = attackIcon(manner);

  if (targetY === null) {
    // Mid locus: no pitch motion, just an amplitude pulse marker on the vowel pitch.
    s += `<circle cx="${X_JOINT_END - 14}" cy="${vowelY}" r="4" fill="none" class="fg" stroke-width="2.5"/>`;
    s += `<line x1="${X_JOINT_END - 14}" y1="${vowelY}" x2="${X_JOINT_END}" y2="${vowelY}" class="fg" stroke-width="2.5"/>`;
    return s;
  }

  const dir = targetY < vowelY ? "up" : "down";
  const marker = dir === "up" ? "url(#arrUp)" : "url(#arrDown)";
  const frac = MANNER_RAMP_FRACTION[manner];
  const glideStartX = X_JOINT_END - (X_JOINT_END - (X_START + 30)) * frac;
  // A held segment at the locus pitch (flat), then the glide into the vowel —
  // short and steep for Interrupted (a "sharp angle"), long and gentle for
  // Continuous ("slow gradual change"), in between for Gradual.
  s += `<line x1="${X_START + 30}" y1="${targetY}" x2="${X_START + 30}" y2="${targetY}" class="fg" marker-start="${marker}"/>`;
  s += `<line x1="${X_START + 32}" y1="${targetY}" x2="${glideStartX}" y2="${targetY}" class="fg" stroke-width="2.5"/>`;
  s += `<path d="M ${glideStartX} ${targetY} Q ${(glideStartX + X_JOINT_END) / 2} ${vowelY} ${X_JOINT_END} ${vowelY}" fill="none" class="fg" stroke-width="2.5"/>`;
  return s;
}

function wrap(body, caption) {
  return `${svgOpen()}${arrowMarkerDefs()}<rect width="${W}" height="${H}" fill="none"/>${guides()}${body}` +
    (caption ? `<text x="${X_END}" y="${H - 4}" font-size="11" class="fgfill" text-anchor="end" font-weight="600">${caption}</text>` : "") +
    `</svg>`;
}

function writeSVG(name, content) {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.svg`), content, "utf8");
  console.log("wrote", name + ".svg");
}

// --- Vowel-only diagrams -----------------------------------------------
const VOWEL_HEIGHT_LABEL = { high: "High", mid: "Mid", low: "Low" };
for (const [height, y] of Object.entries(Y)) {
  writeSVG(`vowel_${height}`, wrap(vowelLine(y, 4, X_END), VOWEL_HEIGHT_LABEL[height]));
}

// --- Consonant + vowel-height diagrams (full matrix) ---------------------
const CONSONANTS = [
  { c: "t", locus: "Sharp", manner: "Interrupted" },
  { c: "s", locus: "Acute", manner: "Interrupted" },
  { c: "k", locus: "Mid", manner: "Interrupted" },
  { c: "p", locus: "Grave", manner: "Interrupted" },
  { c: "j", locus: "Sharp", manner: "Continuous" },
  { c: "l", locus: "Acute", manner: "Continuous" },
  { c: "w", locus: "Mid", manner: "Continuous" },
  { c: "n", locus: "Acute", manner: "Gradual" },
  { c: "m", locus: "Grave", manner: "Gradual" },
];
for (const { c, locus, manner } of CONSONANTS) {
  for (const [height, vowelY] of Object.entries(Y)) {
    const body = consonantGlyph(locus, manner, vowelY) + vowelLine(vowelY);
    writeSVG(`${c}_${height}`, wrap(body, `${locus} ${manner}`));
  }
}

// --- Coda /n/ (syllable-final nasal, e.g. the "n" in "an", "wen") -------
// Schematic only: shows the held vowel fading into a brief nasal tail.
// It does not distinguish the /m/-assimilated allophone (before p/m).
{
  const vowelY = Y.mid;
  let s = vowelLine(vowelY, X_JOINT_END - 60, X_JOINT_END + 20);
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 0.4) / steps;
    const x0 = X_JOINT_END + 20 + 60 * t0, x1 = X_JOINT_END + 20 + 60 * t1;
    const y0 = vowelY - 14 * t0, y1 = vowelY - 14 * t1;
    const w = 2.5 - (i / steps) * 1.7;
    s += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" class="fg" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`;
  }
  writeSVG("coda_n", wrap(s, "…n (coda)"));
}

// --- Legend ---------------------------------------------------------------
const legendBody = `
  ${guides()}
  <text x="14" y="12" font-size="9" class="muted">dashed lines = the 3 whistled vowel pitches</text>
  <line x1="14" y1="26" x2="14" y2="26" class="fg" marker-start="url(#arrUp)"/>
  <text x="30" y="29" font-size="9" class="fgfill">arrow up/down = pitch glide direction &amp; distance (locus)</text>
  <circle cx="16" cy="42" r="4" fill="none" class="fg" stroke-width="2"/>
  <text x="30" y="45" font-size="9" class="fgfill">circle = Mid locus (no pitch motion, just a volume pulse)</text>
  <path d="M 10 62 L 10 54 L 30 54" fill="none" class="fg" stroke-width="2" stroke-linejoin="round"/>
  <text x="36" y="61" font-size="9" class="fgfill">sharp corner = Interrupted (snaps to full pitch/volume fast, ~50ms)</text>
  <path d="M 10 78 L 22 70 L 30 70" fill="none" class="fg" stroke-width="2" stroke-linejoin="round"/>
  <text x="36" y="77" font-size="9" class="fgfill">medium diagonal = Gradual (~95ms)</text>
  <path d="M 10 94 L 28 86 L 30 86" fill="none" class="fg" stroke-width="2" stroke-linejoin="round"/>
  <text x="36" y="93" font-size="9" class="fgfill">long, gentle diagonal = Continuous (slowest, ~170ms)</text>
`;
writeSVG("legend", `${svgOpen()}${arrowMarkerDefs()}${legendBody}</svg>`);

console.log("Done.");
