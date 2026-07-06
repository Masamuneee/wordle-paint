// Step 3: verify solver.findMatches(pattern, answer, GUESSES) against a
// brute-force filter built on the independent oracle.
// Also: hand-computed known vectors to guard against a bug shared by both
// implementations.
import { readFileSync } from "node:fs";
import { feedbackFor as oracleFeedback } from "./oracle.mjs";
import { findMatches, feedbackFor as solverFeedback } from "../solver.mjs";

const wordsSrc = readFileSync(new URL("../words.js", import.meta.url), "utf8");
const wordsMod = await import(
  "data:text/javascript;base64," + Buffer.from(wordsSrc).toString("base64")
);
const GUESSES = wordsMod.GUESSES;

let failures = 0;

// --- Hand-computed known vectors (worked out on paper, not by either impl) ---
const KNOWN = [
  ["eeeee", "geese", "02202"],
  // speed vs abide: e3 yellow, d5 yellow (answer d is at pos 4, not 5)
  ["speed", "abide", "00101"],
  ["erase", "speed", "10011"],
  ["llama", "level", "21000"],
  ["crane", "crane", "22222"],
  ["vivid", "toast", "00000"],
  ["allee", "level", "01121"],
];
for (const [g, a, want] of KNOWN) {
  const o = oracleFeedback(g, a);
  const s = solverFeedback(g, a);
  if (o !== want) {
    failures++;
    console.log(`ORACLE WRONG vs hand calc: guess=${g} answer=${a} want=${want} oracle=${o}`);
  }
  if (s !== want) {
    failures++;
    console.log(`SOLVER WRONG vs hand calc: guess=${g} answer=${a} want=${want} solver=${s}`);
  }
}
console.log(`Known-vector phase done (${KNOWN.length} vectors).`);

// --- findMatches vs brute force with oracle ---
const CASES = [
  ["22222", "crane"], // only exact word should match
  ["00000", "vivid"], // no letters shared
  ["11111", "least"], // full anagram displacement
  ["02022", "geese"], // duplicate-heavy answer, has real matches (e.g. terse)
  ["22212", "sassy"], // 4 greens + 1 yellow: impossible, must be zero matches
];

for (const [pattern, answer] of CASES) {
  const got = findMatches(pattern, answer, GUESSES);
  const expected = GUESSES.filter((w) => oracleFeedback(w, answer) === pattern);
  const same =
    got.length === expected.length && got.every((w, i) => w === expected[i]);
  if (!same) {
    failures++;
    console.log(
      `FINDMATCHES MISMATCH pattern=${pattern} answer=${answer} ` +
        `expected(${expected.length})=${JSON.stringify(expected.slice(0, 10))} ` +
        `got(${got.length})=${JSON.stringify(got.slice(0, 10))}`
    );
  } else {
    console.log(
      `findMatches OK pattern=${pattern} answer=${answer} matches=${got.length}` +
        (got.length ? ` sample=${got.slice(0, 5).join(",")}` : " (zero, as required)")
    );
  }
}

// The impossible pattern case must actually be zero for the check to be meaningful.
const impossible = findMatches("22212", "sassy", GUESSES);
if (impossible.length !== 0) {
  failures++;
  console.log(`EXPECTED ZERO matches for impossible pattern, got ${impossible.length}`);
}

if (failures > 0) {
  console.log(`STEP 3 FAILURES: ${failures}`);
  process.exit(1);
}
console.log("STEP 3 CLEAN.");
