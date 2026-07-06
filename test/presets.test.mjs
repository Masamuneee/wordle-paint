import { test } from "node:test";
import assert from "node:assert/strict";

import { PRESETS, PIXEL_FONT, stampChar } from "../presets.js";

const ROW_RE = /^[012]{5}$/;
const GLYPH_ROW_RE = /^[01]{3}$/;

// ---------------------------------------------------------------------------
// PRESETS — structure
// ---------------------------------------------------------------------------

test("PRESETS: non-empty array with the expected ids, no duplicates", () => {
  assert.ok(Array.isArray(PRESETS) && PRESETS.length > 0);
  const ids = PRESETS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "preset ids must be unique");
  for (const id of [
    "heart", "smiley", "skull", "star", "diamond", "check", "cross-x",
    "arrow-up", "arrow-down", "sixty-seven", "amogus", "creeper", "invader",
    "tree", "frame", "checkers", "stairs",
  ]) {
    assert.ok(ids.includes(id), `missing preset id "${id}"`);
  }
});

test("PRESETS: every preset has id, name, icon and 1-6 valid rows", () => {
  for (const preset of PRESETS) {
    assert.equal(typeof preset.id, "string");
    assert.ok(preset.id.length > 0, "id must be non-empty");
    assert.equal(typeof preset.name, "string");
    assert.ok(preset.name.length > 0, `${preset.id}: name must be non-empty`);
    assert.equal(typeof preset.icon, "string");
    assert.ok(preset.icon.length > 0, `${preset.id}: icon must be non-empty`);
    assert.ok(Array.isArray(preset.rows), `${preset.id}: rows must be an array`);
    assert.ok(
      preset.rows.length >= 1 && preset.rows.length <= 6,
      `${preset.id}: expected 1-6 rows, got ${preset.rows.length}`
    );
    for (const row of preset.rows) {
      assert.match(row, ROW_RE, `${preset.id}: bad row ${JSON.stringify(row)}`);
    }
  }
});

test("PRESETS: no interior all-green rows (guessing the answer ends the game)", () => {
  for (const preset of PRESETS) {
    preset.rows.slice(0, -1).forEach((row, r) => {
      assert.notEqual(
        row,
        "22222",
        `${preset.id}: row ${r + 1} is all green but not last — the game would end there`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// PIXEL_FONT — structure
// ---------------------------------------------------------------------------

test("PIXEL_FONT: covers a-z and 0-9", () => {
  for (let c = 0; c < 26; c++) {
    const ch = String.fromCharCode(97 + c);
    assert.ok(ch in PIXEL_FONT, `missing glyph for "${ch}"`);
  }
  for (let d = 0; d <= 9; d++) {
    assert.ok(String(d) in PIXEL_FONT, `missing glyph for "${d}"`);
  }
});

test("PIXEL_FONT: every glyph is 5 rows x 3 cols over 0/1 and paints something", () => {
  for (const [ch, glyph] of Object.entries(PIXEL_FONT)) {
    assert.ok(Array.isArray(glyph), `${ch}: glyph must be an array`);
    assert.equal(glyph.length, 5, `${ch}: expected 5 rows`);
    for (const row of glyph) {
      assert.match(row, GLYPH_ROW_RE, `${ch}: bad glyph row ${JSON.stringify(row)}`);
    }
    assert.ok(glyph.join("").includes("1"), `${ch}: glyph paints no cells`);
  }
});

// ---------------------------------------------------------------------------
// stampChar
// ---------------------------------------------------------------------------

test("stampChar('a', 1): centered yellow glyph", () => {
  assert.deepEqual(stampChar("a", 1), [
    "00100",
    "01010",
    "01110",
    "01010",
    "01010",
  ]);
});

test("stampChar('7', 2): centered green glyph", () => {
  assert.deepEqual(stampChar("7", 2), [
    "02220",
    "00020",
    "00200",
    "00200",
    "00200",
  ]);
});

test("stampChar: every known char maps its glyph into cols 1-3 with the right digit", () => {
  for (const [ch, glyph] of Object.entries(PIXEL_FONT)) {
    for (const colorDigit of [1, 2]) {
      const grid = stampChar(ch, colorDigit);
      assert.ok(Array.isArray(grid) && grid.length === 5, `${ch}: expected 5 rows`);
      for (let r = 0; r < 5; r++) {
        const row = grid[r];
        assert.equal(row.length, 5, `${ch}: row ${r} must be 5 chars`);
        assert.equal(row[0], "0", `${ch}: col 0 must stay gray`);
        assert.equal(row[4], "0", `${ch}: col 4 must stay gray`);
        for (let c = 0; c < 3; c++) {
          const expected = glyph[r][c] === "1" ? String(colorDigit) : "0";
          assert.equal(row[c + 1], expected, `${ch}: cell (${r},${c + 1})`);
        }
      }
    }
  }
});

test("stampChar: case-insensitive letters", () => {
  assert.deepEqual(stampChar("A", 2), stampChar("a", 2));
  assert.deepEqual(stampChar("Z", 1), stampChar("z", 1));
});

test("stampChar: punctuation glyphs ! and ?", () => {
  assert.deepEqual(stampChar("!", 1), ["00100", "00100", "00100", "00000", "00100"]);
  assert.deepEqual(stampChar("?", 2), ["02220", "00020", "00220", "00000", "00200"]);
});

test("stampChar: unknown chars return null", () => {
  assert.equal(stampChar("#", 1), null);
  assert.equal(stampChar(" ", 1), null);
  assert.equal(stampChar("", 1), null);
  assert.equal(stampChar("ab", 1), null);
  assert.equal(stampChar(null, 1), null);
  assert.equal(stampChar("é", 2), null);
});

test("stampChar: rejects colorDigit outside 1/2", () => {
  assert.throws(() => stampChar("a", 0), TypeError);
  assert.throws(() => stampChar("a", 3), TypeError);
  assert.throws(() => stampChar("a", "green"), TypeError);
});
