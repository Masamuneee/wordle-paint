// presets.js — pure ES module, no DOM / Node-specific dependencies.
//
// Grid strings are rows of '0' | '1' | '2':
//   '0' gray, '1' yellow, '2' green.
//
// Exports:
//   PRESETS    — gallery of pixel-art patterns (1..6 rows of 5 tiles each)
//   PIXEL_FONT — 3x5 pixel font for a-z and 0-9 ('1' = painted, '0' = empty)
//   stampChar  — render one font glyph onto a 5x5 tile grid

/**
 * Built-in pixel-art presets.
 * Each entry: { id, name, icon (single emoji for the card header), rows }.
 * rows: 1..6 strings, each exactly 5 chars over '0' (gray) '1' (yellow) '2' (green).
 */
export const PRESETS = [
  {
    id: "heart",
    name: "Heart",
    icon: "\u{1F49B}", // 💛
    rows: ["01010", "11111", "11111", "01110", "00100"],
  },
  {
    id: "smiley",
    name: "Smiley",
    icon: "\u{1F600}", // 😀
    rows: ["00000", "01010", "00000", "10001", "01110"],
  },
  {
    id: "skull",
    name: "Skull",
    icon: "\u{1F480}", // 💀
    rows: ["01110", "11111", "10101", "11011", "01110", "01010"],
  },
  {
    id: "star",
    name: "Star",
    icon: "⭐", // ⭐
    rows: ["00100", "11111", "01110", "01010", "10001"],
  },
  {
    id: "diamond",
    name: "Diamond",
    icon: "\u{1F48E}", // 💎
    rows: ["00100", "01010", "10001", "01010", "00100"],
  },
  {
    id: "check",
    name: "Check Mark",
    icon: "✅", // ✅
    // Green check reads better than yellow.
    rows: ["00000", "00002", "00020", "20200", "02000"],
  },
  {
    id: "cross-x",
    name: "Cross",
    icon: "❌", // ❌
    rows: ["10001", "01010", "00100", "01010", "10001"],
  },
  {
    id: "arrow-up",
    name: "Arrow Up",
    icon: "⬆️", // ⬆️
    rows: ["00100", "01110", "10101", "00100", "00100"],
  },
  {
    id: "arrow-down",
    name: "Arrow Down",
    icon: "⬇️", // ⬇️
    rows: ["00100", "00100", "10101", "01110", "00100"],
  },
  {
    id: "sixty-seven",
    name: "67",
    icon: "\u{1F522}", // 🔢
    // Two-tone so the glued digits separate: 6 yellow (cols 0-2), 7 green (cols 3-4).
    rows: ["11122", "10002", "11102", "10102", "11102"],
  },
  {
    id: "amogus",
    name: "Amogus",
    icon: "\u{1F4EE}", // 📮
    // Crewmate: yellow body, green visor (cols 3-4), backpack (col 0).
    rows: ["01110", "01122", "11110", "11110", "01110", "01010"],
  },
  {
    id: "creeper",
    name: "Creeper",
    icon: "\u{1F4A5}", // 💥
    // Green face, gray eyes/mouth. Mouth is wider at the top and the two
    // bottom prongs stay open, like the classic texture.
    rows: ["02220", "20202", "22022", "20002", "20202", "20202"],
  },
  {
    id: "invader",
    name: "Invader",
    icon: "\u{1F47E}", // 👾
    rows: ["01010", "11111", "10101", "01010", "10001"],
  },
  {
    id: "tree",
    name: "Xmas Tree",
    icon: "\u{1F384}", // 🎄
    // Green tree widening downward, yellow trunk.
    rows: ["00200", "02220", "02220", "12221", "00100", "00100"],
  },
  {
    id: "frame",
    name: "Frame",
    icon: "\u{1F5BC}️", // 🖼️
    rows: ["11111", "10001", "10001", "10001", "11111"],
  },
  {
    id: "checkers",
    name: "Checkers",
    icon: "\u{1F3C1}", // 🏁
    rows: ["10101", "01010", "10101", "01010", "10101"],
  },
  {
    id: "stairs",
    name: "Stairs",
    icon: "\u{1F4F6}", // 📶
    rows: ["10000", "11000", "11100", "11110", "11111"],
  },
  {
    id: "sixty-nine",
    name: "69",
    icon: "\u{1F60F}", // 😏
    // Same two-tone layout as 67: 3-wide yellow 6, 2-wide green 9.
    rows: ["11122", "10022", "11102", "10102", "11102"],
  },
  {
    id: "moai",
    name: "Moai",
    icon: "\u{1F5FF}", // 🗿
    // Left-facing profile: brow ledge (row 2), gray eye socket, long nose (row 4).
    rows: ["02222", "12222", "02022", "12222", "02222", "02222"],
  },
  {
    id: "clown",
    name: "Clown",
    icon: "\u{1F921}", // 🤡
    // Green side hair, yellow face, gray eyes, green honk nose, wide gray grin.
    rows: ["20002", "21112", "10101", "11211", "10001", "01110"],
  },
  {
    id: "fire",
    name: "Fire",
    icon: "\u{1F525}", // 🔥
    // Yellow teardrop with a flicker at the tip and a green hot core.
    rows: ["00100", "00110", "01110", "11111", "11211", "01210"],
  },
  {
    id: "pacman",
    name: "Pac-Man",
    icon: "\u{1F7E1}", // 🟡
    // Yellow disc, gray wedge mouth opening right, one green pellet.
    rows: ["01110", "11100", "11002", "11100", "01110"],
  },
  {
    id: "ghost",
    name: "Ghost",
    icon: "\u{1F47B}", // 👻
    // Pac-Man ghost: green dome, yellow eyes, scalloped skirt.
    rows: ["02220", "21212", "22022", "22022", "20202"],
  },
  {
    id: "one-up",
    name: "1-UP",
    icon: "\u{1F344}", // 🍄
    // 1-UP mushroom: green cap with yellow spots, yellow stem.
    rows: ["02220", "21212", "22122", "01110", "01110"],
  },
  {
    id: "pokeball",
    name: "Pokeball",
    icon: "\u{1F534}", // 🔴
    // Two-tone hemispheres with the gray button on the equator.
    rows: ["01110", "11111", "22022", "22022", "02220"],
  },
  {
    id: "duck",
    name: "Rubber Duck",
    icon: "\u{1F986}", // 🦆
    // Left-facing duck: green beak tile, upswept tail, green water row.
    rows: ["01100", "21100", "01111", "11110", "22222"],
  },
  {
    id: "rocket",
    name: "Rocket",
    icon: "\u{1F680}", // 🚀
    // Nose cone, gray porthole, flared fins, yellow exhaust.
    rows: ["00200", "02220", "02020", "22022", "01110", "00100"],
  },
  {
    id: "crown",
    name: "Crown",
    icon: "\u{1F451}", // 👑
    // 3 rows only — stamp it above real guesses as a winner flex.
    rows: ["10101", "11111", "12121"],
  },
  {
    id: "thumbs-up",
    name: "Thumbs Up",
    icon: "\u{1F44D}", // 👍
    // Raised thumb, gray notch to the finger block, green cuff.
    rows: ["10000", "10000", "10111", "11111", "01111", "02222"],
  },
  {
    id: "gg",
    name: "GG",
    icon: "\u{1F3AE}", // 🎮
    // Two-tone 2-wide G's (C with a thickened chin) around a gap column.
    rows: ["11022", "10020", "10020", "11022", "11022"],
  },
  {
    id: "middle-finger",
    name: "The Bird",
    icon: "\u{1F595}", // 🖕
    // For the rage-quit share. Knuckle bumps at row 3, green sleeve.
    rows: ["00100", "00100", "10101", "11111", "11111", "02220"],
  },
  {
    id: "deal-with-it",
    name: "Deal With It",
    icon: "\u{1F576}️", // 🕶️
    // Pixel sunglasses descending onto your face; 3 rows.
    rows: ["00002", "21212", "22022"],
  },
  {
    id: "question-mark",
    name: "Huh?",
    icon: "❓", // ❓
    // Big bold ? for the "wtf was that word" share (bigger than the font glyph).
    rows: ["01110", "10001", "00010", "00100", "00000", "00100"],
  },
  {
    id: "chrome-dino",
    name: "No Internet",
    icon: "\u{1F996}", // 🦖
    // Chrome offline T-rex: 2x2 head top-right, rising tail, split legs.
    rows: ["00022", "00022", "20220", "22220", "02220", "02020"],
  },
  {
    id: "four-am",
    name: "Me at 4 AM",
    icon: "\u{1F303}", // 🌃
    // "Not Wordle, just me awake at 4am" — one lit window, off-center.
    rows: ["00000", "00000", "00000", "01000", "00000", "00000"],
  },
];

/**
 * Standard readable 3x5 pixel font.
 * Keys: 'a'-'z' and '0'-'9'. Values: 5 strings of 3 chars over '0'/'1'
 * ('1' = painted).
 */
export const PIXEL_FONT = {
  a: ["010", "101", "111", "101", "101"],
  b: ["110", "101", "110", "101", "110"],
  c: ["011", "100", "100", "100", "011"],
  d: ["110", "101", "101", "101", "110"],
  e: ["111", "100", "110", "100", "111"],
  f: ["111", "100", "110", "100", "100"],
  g: ["011", "100", "101", "101", "011"],
  h: ["101", "101", "111", "101", "101"],
  i: ["111", "010", "010", "010", "111"],
  j: ["001", "001", "001", "101", "010"],
  k: ["101", "101", "110", "101", "101"],
  l: ["100", "100", "100", "100", "111"],
  m: ["101", "111", "111", "101", "101"],
  n: ["110", "101", "101", "101", "101"],
  o: ["010", "101", "101", "101", "010"],
  p: ["111", "101", "111", "100", "100"],
  q: ["111", "101", "101", "111", "001"],
  r: ["111", "101", "110", "101", "101"],
  s: ["011", "100", "010", "001", "110"],
  t: ["111", "010", "010", "010", "010"],
  u: ["101", "101", "101", "101", "111"],
  v: ["101", "101", "101", "101", "010"],
  w: ["101", "101", "111", "111", "101"],
  x: ["101", "101", "010", "101", "101"],
  y: ["101", "101", "010", "010", "010"],
  z: ["111", "001", "010", "100", "111"],
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "011", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  "!": ["010", "010", "010", "000", "010"],
  "?": ["111", "001", "011", "000", "010"],
};

/**
 * Render one 3x5 glyph onto a 5-wide tile grid.
 *
 * @param {string} ch single char, case-insensitive letter a-z or digit 0-9
 * @param {number|string} colorDigit 1 (yellow) or 2 (green)
 * @returns {string[]|null} 5 row-strings of 5 chars: the glyph centered
 *   horizontally (cols 1-3), painted cells set to String(colorDigit),
 *   everything else '0'. Returns null for unknown chars.
 */
export function stampChar(ch, colorDigit) {
  const paint = String(colorDigit);
  if (paint !== "1" && paint !== "2") {
    throw new TypeError(`colorDigit must be 1 or 2, got ${JSON.stringify(colorDigit)}`);
  }
  const key = String(ch ?? "").toLowerCase();
  if (key.length !== 1 || !Object.prototype.hasOwnProperty.call(PIXEL_FONT, key)) {
    return null;
  }
  return PIXEL_FONT[key].map((row) => {
    let out = "0";
    for (const cell of row) out += cell === "1" ? paint : "0";
    return out + "0";
  });
}
