// solver.mjs — pure ES module, no DOM / Node-specific dependencies.
//
// Feedback strings are 5 chars over '0' | '1' | '2':
//   '2' green  (right letter, right spot)
//   '1' yellow (letter in answer, wrong spot)
//   '0' gray   (letter not available)

const WORD_RE = /^[a-z]{5}$/;
const PATTERN_RE = /^[012]{5}$/;

/** Defensive normalization: coerce to string, trim, lowercase. */
function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * NYT Wordle feedback with correct duplicate-letter handling (two passes).
 *
 * Pass 1: mark greens and consume that letter from the answer's letter-count
 * pool. Pass 2 (left to right): for each non-green position, if the guessed
 * letter still has remaining count in the pool, mark '1' and consume; else '0'.
 *
 * Example: answer "geese", guess "eeeee" -> "02202".
 *
 * @param {string} guess 5-char lowercase a-z string
 * @param {string} answer 5-char lowercase a-z string
 * @returns {string} 5-char string over '0'|'1'|'2'
 */
export function feedbackFor(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!WORD_RE.test(g)) {
    throw new TypeError(`guess must be a 5-letter a-z string, got ${JSON.stringify(guess)}`);
  }
  if (!WORD_RE.test(a)) {
    throw new TypeError(`answer must be a 5-letter a-z string, got ${JSON.stringify(answer)}`);
  }

  const result = ["0", "0", "0", "0", "0"];
  const pool = Object.create(null);

  // Pass 1: greens; non-green answer letters feed the pool.
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) {
      result[i] = "2";
    } else {
      pool[a[i]] = (pool[a[i]] || 0) + 1;
    }
  }

  // Pass 2: yellows, left to right, consuming from the pool.
  for (let i = 0; i < 5; i++) {
    if (result[i] === "2") continue;
    const ch = g[i];
    if (pool[ch] > 0) {
      result[i] = "1";
      pool[ch] -= 1;
    }
  }

  return result.join("");
}

/**
 * Every word w in `words` (preserving input order) whose feedback against
 * `answer` equals `pattern`. Entries that are not valid 5-letter words after
 * normalization are skipped (they cannot match).
 *
 * @param {string} pattern 5-char string over 0/1/2
 * @param {string} answer 5-char lowercase a-z string
 * @param {string[]} words candidate words
 * @returns {string[]} matching words, input order preserved
 */
export function findMatches(pattern, answer, words) {
  const p = normalize(pattern);
  const a = normalize(answer);
  if (!PATTERN_RE.test(p)) {
    throw new TypeError(`pattern must be a 5-char string over 0/1/2, got ${JSON.stringify(pattern)}`);
  }
  if (!WORD_RE.test(a)) {
    throw new TypeError(`answer must be a 5-letter a-z string, got ${JSON.stringify(answer)}`);
  }
  if (!Array.isArray(words)) {
    throw new TypeError("words must be an array of strings");
  }

  const out = [];
  for (const w of words) {
    const cand = normalize(w);
    if (!WORD_RE.test(cand)) continue;
    if (feedbackFor(cand, a) === p) out.push(w);
  }
  return out;
}

/**
 * Human-readable structural problems with a pattern/answer pair; [] if none.
 *
 * Detects:
 *  (a) malformed pattern or answer (wrong length or characters),
 *  (b) exactly four greens + one yellow — impossible, because the only
 *      remaining answer letter would have to sit in the one non-green slot,
 *      which would make it green.
 *
 * @param {string} pattern 5-char string over 0/1/2
 * @param {string} answer 5-char lowercase a-z string
 * @returns {string[]} list of issues, empty if the inputs are structurally fine
 */
export function patternIssues(pattern, answer) {
  const issues = [];
  const p = normalize(pattern);
  const a = normalize(answer);

  const patternOk = PATTERN_RE.test(p);
  if (!patternOk) {
    issues.push(
      `Pattern must be exactly 5 characters, each 0 (gray), 1 (yellow), or 2 (green); got "${p}".`
    );
  }
  if (!WORD_RE.test(a)) {
    issues.push(`Answer must be exactly 5 lowercase letters a-z; got "${a}".`);
  }

  if (patternOk) {
    let greens = 0;
    let yellows = 0;
    for (const ch of p) {
      if (ch === "2") greens += 1;
      else if (ch === "1") yellows += 1;
    }
    if (greens === 4 && yellows === 1) {
      issues.push(
        "Impossible pattern: four greens plus one yellow. The only remaining answer letter " +
          "would have to sit in the one non-green slot, which would make it green."
      );
    }
  }

  return issues;
}

/**
 * Every feedback pattern achievable against `answer` using `words`, with how
 * many words produce each. Single O(words) sweep; there are at most 243
 * distinct patterns. Entries that are not valid 5-letter words after
 * normalization are skipped (they cannot produce feedback).
 *
 * @param {string} answer 5-char lowercase a-z string
 * @param {string[]} words candidate guess words
 * @returns {Map<string, number>} pattern -> count of words producing it
 */
export function achievablePatterns(answer, words) {
  const a = normalize(answer);
  if (!WORD_RE.test(a)) {
    throw new TypeError(`answer must be a 5-letter a-z string, got ${JSON.stringify(answer)}`);
  }
  if (!Array.isArray(words)) {
    throw new TypeError("words must be an array of strings");
  }

  const counts = new Map();
  for (const w of words) {
    const cand = normalize(w);
    if (!WORD_RE.test(cand)) continue;
    const pattern = feedbackFor(cand, a);
    counts.set(pattern, (counts.get(pattern) || 0) + 1);
  }
  return counts;
}

/**
 * The achievable pattern closest to `pattern` by per-tile cost:
 *   same digit               -> 0
 *   yellow <-> green swap    -> 1
 *   painted <-> gray change  -> 2
 * If `pattern` itself is achievable it is returned with cost 0. Ties are
 * broken deterministically: fewer changed tiles wins, then the
 * lexicographically smallest pattern.
 *
 * @param {string} pattern desired 5-char string over 0/1/2
 * @param {Map<string, number>|{keys(): Iterable<string>}} achievable the Map
 *   from achievablePatterns (or any object with .keys() yielding patterns)
 * @returns {{ pattern: string, cost: number }}
 */
export function nearestAchievable(pattern, achievable) {
  const p = normalize(pattern);
  if (!PATTERN_RE.test(p)) {
    throw new TypeError(`pattern must be a 5-char string over 0/1/2, got ${JSON.stringify(pattern)}`);
  }
  if (achievable == null || typeof achievable.keys !== "function") {
    throw new TypeError("achievable must expose .keys() (e.g. the Map from achievablePatterns)");
  }

  let best = null;
  let bestCost = Infinity;
  let bestChanged = Infinity;

  for (const raw of achievable.keys()) {
    const cand = normalize(raw);
    if (!PATTERN_RE.test(cand)) continue;

    let cost = 0;
    let changed = 0;
    for (let i = 0; i < 5; i++) {
      const want = p[i];
      const got = cand[i];
      if (want === got) continue;
      changed += 1;
      cost += want === "0" || got === "0" ? 2 : 1;
    }

    if (
      cost < bestCost ||
      (cost === bestCost &&
        (changed < bestChanged || (changed === bestChanged && cand < best)))
    ) {
      best = cand;
      bestCost = cost;
      bestChanged = changed;
      if (cost === 0) break; // exact hit: nothing can beat it
    }
  }

  if (best === null) {
    throw new TypeError("achievable must contain at least one valid pattern");
  }
  return { pattern: best, cost: bestCost };
}
