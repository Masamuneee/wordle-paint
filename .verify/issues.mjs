// Step 4: sanity-check patternIssues against its documented contract:
//  (a) malformed pattern or answer -> issue string(s), no throw
//  (b) exactly four greens + one yellow -> flagged as impossible
//  well-formed possible inputs -> []
import { patternIssues } from "../solver.mjs";

let failures = 0;
function expect(name, fn) {
  try {
    const ok = fn();
    if (!ok) {
      failures++;
      console.log(`FAIL: ${name}`);
    } else {
      console.log(`ok:   ${name}`);
    }
  } catch (e) {
    failures++;
    console.log(`THREW: ${name} -> ${e.message}`);
  }
}

// Malformed patterns
expect("short pattern '2222' flagged", () => patternIssues("2222", "crane").length > 0);
expect("long pattern '222222' flagged", () => patternIssues("222222", "crane").length > 0);
expect("bad chars 'abcde' flagged", () => patternIssues("abcde", "crane").length > 0);
expect("bad char '2222x' flagged", () => patternIssues("2222x", "crane").length > 0);
expect("digit out of range '22223' flagged", () => patternIssues("22223", "crane").length > 0);
expect("empty pattern flagged", () => patternIssues("", "crane").length > 0);
expect("null pattern flagged, no throw", () => patternIssues(null, "crane").length > 0);
expect("undefined pattern flagged, no throw", () => patternIssues(undefined, "crane").length > 0);
expect("number pattern 22221 (non-string) handled", () => Array.isArray(patternIssues(22221, "crane")));

// Malformed answers
expect("short answer 'cran' flagged", () => patternIssues("22222", "cran").length > 0);
expect("digit in answer 'cr4ne' flagged", () => patternIssues("22222", "cr4ne").length > 0);
expect("null answer flagged, no throw", () => patternIssues("22222", null).length > 0);
expect("both malformed -> two issues", () => patternIssues("9", "x").length >= 2);

// Impossible: exactly 4 greens + 1 yellow, in every arrangement
for (const p of ["12222", "21222", "22122", "22212", "22221"]) {
  expect(`4 greens + 1 yellow '${p}' flagged impossible`, () => {
    const issues = patternIssues(p, "crane");
    return issues.length > 0 && issues.some((s) => /impossible/i.test(s));
  });
}

// Possible patterns must NOT be flagged
expect("'22222' clean", () => patternIssues("22222", "crane").length === 0);
expect("'22220' (4 greens + gray) clean", () => patternIssues("22220", "crane").length === 0);
expect("'00000' clean", () => patternIssues("00000", "crane").length === 0);
expect("'11111' clean", () => patternIssues("11111", "least").length === 0);
expect("'21012' clean", () => patternIssues("21012", "geese").length === 0);
expect("uppercase/whitespace normalized ' CRANE ' clean", () => patternIssues("22222", " CRANE ").length === 0);

if (failures > 0) {
  console.log(`STEP 4 FAILURES: ${failures}`);
  process.exit(1);
}
console.log("STEP 4 CLEAN.");
