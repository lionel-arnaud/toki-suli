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

// The consonant glide + manner-specific joint, ending where the vowel line begins.
function consonantGlyph(locus, manner, vowelY) {
  const targetY = LOCUS_TARGET_Y[locus];
  let s = "";

  if (targetY === null) {
    // Mid locus: no pitch motion, just an amplitude pulse marker on the vowel pitch.
    s += `<circle cx="${X_START + 6}" cy="${vowelY}" r="4" fill="none" class="fg" stroke-width="2.5"/>`;
  } else {
    const dir = targetY < vowelY ? "up" : "down";
    const marker = dir === "up" ? "url(#arrUp)" : "url(#arrDown)";
    s += `<line x1="${X_START}" y1="${targetY}" x2="${X_START}" y2="${targetY}" class="fg" marker-start="${marker}"/>`;
    s += `<line x1="${X_START + 2}" y1="${targetY}" x2="${X_START + 20}" y2="${targetY}" class="fg" stroke-width="2.5"/>`;
  }

  const glideStartX = targetY === null ? X_START + 10 : X_START + 20;
  const glideStartY = targetY === null ? vowelY : targetY;

  if (manner === "Continuous") {
    s += `<path d="M ${glideStartX} ${glideStartY} Q ${(glideStartX + X_JOINT_END) / 2} ${vowelY} ${X_JOINT_END} ${vowelY}" fill="none" class="fg" stroke-width="2.5"/>`;
  } else if (manner === "Interrupted") {
    const cutX = glideStartX + (X_JOINT_END - glideStartX) * 0.55;
    const cutY = (glideStartY + vowelY) / 2;
    s += `<path d="M ${glideStartX} ${glideStartY} L ${cutX} ${cutY}" fill="none" class="fg" stroke-width="2.5"/>`;
    s += `<line x1="${cutX}" y1="${cutY - 6}" x2="${cutX}" y2="${cutY + 6}" class="fg" stroke-width="1.5"/>`;
    s += `<line x1="${X_JOINT_END}" y1="${vowelY - 6}" x2="${X_JOINT_END}" y2="${vowelY + 6}" class="fg" stroke-width="1.5"/>`;
  } else if (manner === "Gradual") {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 0.35) / steps;
      const x0 = glideStartX + (X_JOINT_END - 4 - glideStartX) * t0;
      const x1 = glideStartX + (X_JOINT_END - 4 - glideStartX) * t1;
      const y0 = glideStartY + (vowelY - glideStartY) * t0;
      const y1 = glideStartY + (vowelY - glideStartY) * t1;
      const w = 2.5 - (i / steps) * 1.7;
      s += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" class="fg" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`;
    }
  }
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
  <text x="14" y="14" font-size="9" class="muted">dashed lines = the 3 whistled vowel pitches</text>
  <line x1="14" y1="30" x2="70" y2="30" class="fg" stroke-width="2.5"/>
  <text x="76" y="33" font-size="9" class="fgfill">solid = sound present (vowel, or Continuous consonant)</text>
  <line x1="14" y1="46" x2="45" y2="46" class="fg" stroke-width="1.5"/>
  <line x1="45" y1="40" x2="45" y2="52" class="fg" stroke-width="1.5"/>
  <line x1="65" y1="40" x2="65" y2="52" class="fg" stroke-width="1.5"/>
  <text x="76" y="49" font-size="9" class="fgfill">gap = Interrupted (abrupt full silence)</text>
  <line x1="14" y1="60" x2="20" y2="61" class="fg" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="26" y1="62" x2="31" y2="63" class="fg" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="37" y1="63" x2="41" y2="64" class="fg" stroke-width="1" stroke-linecap="round"/>
  <text x="76" y="65" font-size="9" class="fgfill">fading dots = Gradual (smooth fade to silence)</text>
  <line x1="14" y1="78" x2="14" y2="78" class="fg" marker-start="url(#arrUp)"/>
  <text x="30" y="81" font-size="9" class="fgfill">arrow up/down = pitch glide direction &amp; distance (locus)</text>
  <circle cx="16" cy="94" r="4" fill="none" class="fg" stroke-width="2"/>
  <text x="30" y="97" font-size="9" class="fgfill">circle = Mid locus (no pitch motion, just a volume pulse)</text>
`;
writeSVG("legend", `${svgOpen()}${arrowMarkerDefs()}${legendBody}</svg>`);

console.log("Done.");
