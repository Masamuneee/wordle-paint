import { test } from "node:test";
import assert from "node:assert/strict";

import {
  feedbackFor,
  findMatches,
  patternIssues,
  achievablePatterns,
  nearestAchievable,
} from "../solver.mjs";

// ---------------------------------------------------------------------------
// feedbackFor — basics
// ---------------------------------------------------------------------------

test("feedbackFor: all green when guess equals answer", () => {
  assert.equal(feedbackFor("crane", "crane"), "22222");
});

test("feedbackFor: all gray when no letters shared", () => {
  // "bolts" shares no letter with "crane"
  assert.equal(feedbackFor("bolts", "crane"), "00000");
});

test("feedbackFor: mixed greens/yellows/grays", () => {
  // answer trace, guess crate:
  // r/a/e green; c and t present but misplaced -> yellow
  assert.equal(feedbackFor("crate", "trace"), "12212");
  // answer crane, guess money: n and e present, misplaced
  assert.equal(feedbackFor("money", "crane"), "00110");
});

test("feedbackFor: defensively trims and lowercases inputs", () => {
  assert.equal(feedbackFor("  CRANE ", "crane"), "22222");
  assert.equal(feedbackFor("crate", " TRACE\n"), "12212");
});

test("feedbackFor: rejects malformed inputs", () => {
  assert.throws(() => feedbackFor("cran", "crane"), TypeError);
  assert.throws(() => feedbackFor("crane", "cran3"), TypeError);
});

// ---------------------------------------------------------------------------
// feedbackFor — duplicate-letter rules (NYT two-pass)
// ---------------------------------------------------------------------------

test("duplicates: answer geese vs guess eeeee -> 02202", () => {
  assert.equal(feedbackFor("eeeee", "geese"), "02202");
});

test("duplicates: single copy in answer, two copies in guess -> first yellow, second gray", () => {
  // answer "pilot" has one l; guess "llama" has two.
  // Pass 2 left-to-right: first l consumes the pool copy (yellow), second l gray.
  assert.equal(feedbackFor("llama", "pilot"), "10000");
});

test("duplicates: green consumes the only copy, later same letter is gray", () => {
  // answer "stole" has one s; guess "sassy" greens it at position 0,
  // so the later s's find an empty pool and go gray.
  assert.equal(feedbackFor("sassy", "stole"), "20000");
  // answer "abide" has one a; green at position 0 consumes it,
  // so the trailing a in "aroma" is gray.
  assert.equal(feedbackFor("aroma", "abide"), "20000");
});

test("duplicates: yellow before a green of the same letter", () => {
  // answer "abbey", guess "babes":
  // pass 1 greens: b (pos2), e (pos3); pool = {a:1, b:1, y:1}
  // pass 2: b (pos0) -> yellow, a (pos1) -> yellow, s (pos4) -> gray
  assert.equal(feedbackFor("babes", "abbey"), "11220");
});

// ---------------------------------------------------------------------------
// findMatches
// ---------------------------------------------------------------------------

const WORDS = ["crane", "chick", "carts", "money", "cocoa", "crank", "crans", "bolts"];

test("findMatches: returns exactly the words producing the pattern", () => {
  assert.deepEqual(findMatches("20000", "crane", WORDS), ["chick"]);
  assert.deepEqual(findMatches("22222", "crane", WORDS), ["crane"]);
  assert.deepEqual(findMatches("00000", "crane", WORDS), ["bolts"]);
});

test("findMatches: preserves input order", () => {
  assert.deepEqual(findMatches("22220", "crane", WORDS), ["crank", "crans"]);
  const reordered = ["crans", "chick", "crank"];
  assert.deepEqual(findMatches("22220", "crane", reordered), ["crans", "crank"]);
});

test("findMatches: brute-force agreement with feedbackFor over all 243 patterns", () => {
  const digits = ["0", "1", "2"];
  for (const a of digits)
    for (const b of digits)
      for (const c of digits)
        for (const d of digits)
          for (const e of digits) {
            const pattern = a + b + c + d + e;
            const expected = WORDS.filter((w) => feedbackFor(w, "crane") === pattern);
            assert.deepEqual(findMatches(pattern, "crane", WORDS), expected);
          }
});

test("findMatches: every returned word actually produces the pattern", () => {
  const pattern = "00110";
  for (const w of findMatches(pattern, "crane", WORDS)) {
    assert.equal(feedbackFor(w, "crane"), pattern);
  }
  assert.deepEqual(findMatches(pattern, "crane", WORDS), ["money"]);
});

test("findMatches: skips entries that are not valid 5-letter words", () => {
  const dirty = ["chick", "toolong", "xy", "", "ch1ck"];
  assert.deepEqual(findMatches("20000", "crane", dirty), ["chick"]);
});

test("findMatches: rejects malformed pattern/answer", () => {
  assert.throws(() => findMatches("2020", "crane", WORDS), TypeError);
  assert.throws(() => findMatches("20203", "crane", WORDS), TypeError);
  assert.throws(() => findMatches("20200", "cran3", WORDS), TypeError);
  assert.throws(() => findMatches("20200", "crane", "notanarray"), TypeError);
});

// ---------------------------------------------------------------------------
// patternIssues
// ---------------------------------------------------------------------------

test("patternIssues: clean pattern returns []", () => {
  assert.deepEqual(patternIssues("21010", "crane"), []);
  assert.deepEqual(patternIssues("22222", "crane"), []); // five greens is fine
  assert.deepEqual(patternIssues("22202", "crane"), []); // four greens + gray is fine
});

test("patternIssues: malformed pattern is reported", () => {
  assert.ok(patternIssues("2222", "crane").length > 0); // too short
  assert.ok(patternIssues("222222", "crane").length > 0); // too long
  assert.ok(patternIssues("2222a", "crane").length > 0); // bad char
});

test("patternIssues: malformed answer is reported", () => {
  assert.ok(patternIssues("22222", "cran3").length > 0);
  assert.ok(patternIssues("22222", "cranes").length > 0);
  assert.ok(patternIssues("22222", "").length > 0);
});

test("patternIssues: malformed pattern AND answer yields both issues", () => {
  assert.equal(patternIssues("22a22", "cr4ne").length, 2);
});

test("patternIssues: four greens + one yellow is impossible", () => {
  for (const pattern of ["12222", "21222", "22122", "22212", "22221"]) {
    const issues = patternIssues(pattern, "crane");
    assert.equal(issues.length, 1, `expected exactly one issue for ${pattern}`);
    assert.match(issues[0], /impossible/i);
  }
});

test("patternIssues: four greens + one gray is NOT flagged", () => {
  assert.deepEqual(patternIssues("22220", "crane"), []);
});

// ---------------------------------------------------------------------------
// achievablePatterns
// ---------------------------------------------------------------------------

test("achievablePatterns: exact Map contents on a tiny word list", () => {
  // Against answer "crane":
  //   crane -> 22222, crank -> 22220, crans -> 22220,
  //   bolts -> 00000, chick -> 20000
  const map = achievablePatterns("crane", ["crane", "crank", "crans", "bolts", "chick"]);
  assert.ok(map instanceof Map);
  assert.equal(map.size, 4);
  assert.equal(map.get("22222"), 1);
  assert.equal(map.get("22220"), 2);
  assert.equal(map.get("00000"), 1);
  assert.equal(map.get("20000"), 1);
});

test("achievablePatterns: agrees with feedbackFor over the word list", () => {
  const words = ["crane", "chick", "carts", "money", "cocoa", "crank", "crans", "bolts"];
  const map = achievablePatterns("crane", words);
  let total = 0;
  for (const [pattern, count] of map) {
    assert.equal(findMatches(pattern, "crane", words).length, count);
    total += count;
  }
  assert.equal(total, words.length);
});

test("achievablePatterns: skips entries that are not valid 5-letter words", () => {
  const map = achievablePatterns("crane", ["chick", "toolong", "xy", "", "ch1ck", "  CRANE "]);
  assert.equal(map.size, 2);
  assert.equal(map.get("20000"), 1);
  assert.equal(map.get("22222"), 1);
});

test("achievablePatterns: rejects malformed inputs", () => {
  assert.throws(() => achievablePatterns("cran3", ["crane"]), TypeError);
  assert.throws(() => achievablePatterns("crane", "notanarray"), TypeError);
});

// ---------------------------------------------------------------------------
// nearestAchievable
// ---------------------------------------------------------------------------

test("nearestAchievable: achievable pattern is an exact hit with cost 0", () => {
  const map = achievablePatterns("crane", ["crane", "crank", "bolts"]);
  assert.deepEqual(nearestAchievable("22220", map), { pattern: "22220", cost: 0 });
  assert.deepEqual(nearestAchievable("00000", map), { pattern: "00000", cost: 0 });
});

test("nearestAchievable: forced adaptation picks the hand-computed winner", () => {
  // Want "11112". Costs:
  //   00000 -> five painted<->gray tiles           = 10
  //   22222 -> four yellow<->green swaps           = 4
  //   11111 -> one yellow<->green swap (last tile) = 1  <- winner
  const achievable = new Map([["00000", 1], ["22222", 3], ["11111", 2]]);
  assert.deepEqual(nearestAchievable("11112", achievable), { pattern: "11111", cost: 1 });
});

test("nearestAchievable: yellow<->green swap (1) is cheaper than painted<->gray (2)", () => {
  // Want "10000": "20000" costs 1 (swap), "00000" costs 2 (unpaint).
  const achievable = new Map([["00000", 5], ["20000", 1]]);
  assert.deepEqual(nearestAchievable("10000", achievable), { pattern: "20000", cost: 1 });
});

test("nearestAchievable: equal cost — fewer changed tiles wins", () => {
  // Want "11000". Both candidates cost 2:
  //   22000 -> two swap tiles         (changed = 2)
  //   01000 -> one painted<->gray tile (changed = 1) <- winner
  const achievable = new Map([["22000", 1], ["01000", 1]]);
  assert.deepEqual(nearestAchievable("11000", achievable), { pattern: "01000", cost: 2 });
});

test("nearestAchievable: full tie — lexicographically smallest wins, regardless of Map order", () => {
  // Want "11000". "12000" and "21000" both cost 1 with 1 changed tile.
  const forward = new Map([["12000", 1], ["21000", 1]]);
  const backward = new Map([["21000", 1], ["12000", 1]]);
  assert.deepEqual(nearestAchievable("11000", forward), { pattern: "12000", cost: 1 });
  assert.deepEqual(nearestAchievable("11000", backward), { pattern: "12000", cost: 1 });
});

test("nearestAchievable: rejects malformed inputs", () => {
  const achievable = new Map([["00000", 1]]);
  assert.throws(() => nearestAchievable("2020", achievable), TypeError);
  assert.throws(() => nearestAchievable("20203", achievable), TypeError);
  assert.throws(() => nearestAchievable("20200", null), TypeError);
  assert.throws(() => nearestAchievable("20200", {}), TypeError);
  assert.throws(() => nearestAchievable("20200", new Map()), TypeError);
});
