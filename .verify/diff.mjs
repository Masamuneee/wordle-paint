// Differential test: solver.mjs feedbackFor vs independent oracle.
import { readFileSync } from "node:fs";
import { feedbackFor as oracleFeedback } from "./oracle.mjs";
import { feedbackFor as solverFeedback } from "../solver.mjs";

// words.js uses ESM export syntax but has a .js extension and no package.json
// ("type" defaults to commonjs), so import it via a data: URL instead.
const wordsSrc = readFileSync(new URL("../words.js", import.meta.url), "utf8");
const wordsMod = await import(
  "data:text/javascript;base64," + Buffer.from(wordsSrc).toString("base64")
);
const GUESSES = wordsMod.GUESSES;
if (!Array.isArray(GUESSES) || GUESSES.length === 0) {
  console.error("FATAL: could not load GUESSES from words.js");
  process.exit(2);
}
console.log(`Loaded ${GUESSES.length} guess words.`);

// Deterministic RNG (mulberry32) so failures are reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let mismatches = 0;
const MAX_PRINT = 50;

function check(guess, answer) {
  const expected = oracleFeedback(guess, answer);
  const got = solverFeedback(guess, answer);
  if (expected !== got) {
    mismatches++;
    if (mismatches <= MAX_PRINT) {
      console.log(
        `MISMATCH guess=${guess} answer=${answer} expected=${expected} got=${got}`
      );
    }
  }
}

// (a) 100,000 random guess/answer pairs sampled from GUESSES.
const rand = mulberry32(1337);
const N_RANDOM = 100000;
for (let i = 0; i < N_RANDOM; i++) {
  const guess = GUESSES[Math.floor(rand() * GUESSES.length)];
  const answer = GUESSES[Math.floor(rand() * GUESSES.length)];
  check(guess, answer);
}
console.log(`Random phase done: ${N_RANDOM} pairs, ${mismatches} mismatches so far.`);

// (b) exhaustive sweep: every guess in GUESSES vs 25 duplicate-heavy answers.
const DUP_ANSWERS = [
  "geese", "mamma", "error", "eerie", "llama",
  "added", "bobby", "fluff", "kayak", "level",
  "onion", "poppy", "sassy", "taste", "vivid",
  "melee", "banal", "otter", "sissy", "stats",
  "tepee", "rarer", "radar", "roost", "dodge",
];
let sweepCount = 0;
for (const answer of DUP_ANSWERS) {
  for (const guess of GUESSES) {
    check(guess, answer);
    sweepCount++;
  }
}
console.log(`Exhaustive phase done: ${sweepCount} pairs.`);

if (mismatches > 0) {
  console.log(`TOTAL MISMATCHES: ${mismatches} (printed at most ${MAX_PRINT})`);
  process.exit(1);
}
console.log("ALL FEEDBACK COMPARISONS MATCH.");
