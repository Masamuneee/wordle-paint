// Wordle Paint — front end. Solver logic lives in solver.mjs (see API contract).
import { feedbackFor, findMatches, patternIssues, achievablePatterns, nearestAchievable } from './solver.mjs';
import { PRESETS, stampChar } from './presets.js';
import { GUESSES, COMMON } from './words.js';

const MAX_ROWS = 6;
const COLS = 5;
const CHIP_LIMIT = 12;
const COLOR_NAMES = ['gray', 'yellow', 'green'];
const EMOJI = ['⬛', '🟨', '🟩']; // ⬛ 🟨 🟩
const ALLOWED = new Set(GUESSES);
const ANSWER_RE = /^[a-z]{5}$/;

// ---------------------------------------------------------------- state

const state = {
  answer: '',
  rowCount: MAX_ROWS,
  grid: Array.from({ length: MAX_ROWS }, () => new Array(COLS).fill(0)), // 0|1|2
  brush: null,                          // null = cycle mode, else 0|1|2
  chosen: new Array(MAX_ROWS).fill(null),   // manual word pick per row
  samples: new Array(MAX_ROWS).fill(null),  // { key, words } chip sample per row
};

const matchCache = new Array(MAX_ROWS).fill(null); // { key, ranked, issues }

let currentWords = []; // selected word (or null) per active row, from last render
let currentEmoji = '';

// ---------------------------------------------------------------- dom refs

const $ = (sel) => document.querySelector(sel);

const answerInput = $('#answer-input');
const answerWarning = $('#answer-warning');
const fetchBtn = $('#fetch-today');
const puzzleIdEl = $('#puzzle-id');
const fallbackPanel = $('#fetch-fallback');
const fallbackLink = $('#fallback-link');
const rowsMinus = $('#rows-minus');
const rowsPlus = $('#rows-plus');
const rowsValue = $('#rows-value');
const clearBtn = $('#clear-btn');
const brushHint = $('#brush-hint');
const boardEl = $('#board');
const wordsList = $('#words-list');
const emojiPreview = $('#emoji-preview');
const copyWordsBtn = $('#copy-words');
const copyEmojiBtn = $('#copy-emoji');
const swatches = Array.from(document.querySelectorAll('.swatch'));
const galleryGrid = $('#gallery-grid');
const adaptCheck = $('#adapt-check');
const finishCheck = $('#finish-check');
const adaptNotice = $('#adapt-notice');
const stampInput = $('#stamp-input');
const stampBtn = $('#stamp-btn');
const stampSwatches = Array.from(document.querySelectorAll('.stamp-swatch'));

// ---------------------------------------------------------------- board dom

const rowEls = [];

function buildBoard() {
  for (let r = 0; r < MAX_ROWS; r++) {
    const block = document.createElement('div');
    block.className = 'row-block';

    const tilesWrap = document.createElement('div');
    tilesWrap.className = 'row-tiles';
    const tiles = [];
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.dataset.row = String(r);
      tile.dataset.col = String(c);
      tile.dataset.color = '0';
      tilesWrap.appendChild(tile);
      tiles.push(tile);
    }

    const panel = document.createElement('div');
    panel.className = 'row-panel';

    const meta = document.createElement('div');
    meta.className = 'row-meta';
    const count = document.createElement('span');
    count.className = 'match-count';
    const autoTag = document.createElement('span');
    autoTag.className = 'auto-tag';
    autoTag.textContent = 'auto pick';
    autoTag.hidden = true;
    const reroll = document.createElement('button');
    reroll.type = 'button';
    reroll.className = 'reroll';
    reroll.textContent = '↻ reroll';
    reroll.setAttribute('aria-label', `Show a different sample of matching words for row ${r + 1}`);
    reroll.addEventListener('click', () => rerollRow(r));
    meta.append(count, autoTag, reroll);

    const chips = document.createElement('div');
    chips.className = 'chips';
    const warnings = document.createElement('ul');
    warnings.className = 'row-warnings';

    panel.append(meta, chips, warnings);
    block.append(tilesWrap, panel);
    boardEl.appendChild(block);
    rowEls.push({ block, tiles, count, autoTag, reroll, chips, warnings });
  }
}

// ---------------------------------------------------------------- solving

function orderRanked(words) {
  const common = [];
  const rest = [];
  for (const w of words) (COMMON.has(w) ? common : rest).push(w);
  common.sort();
  rest.sort();
  return common.concat(rest);
}

function rowKey(r) {
  return state.grid[r].join('') + '|' + state.answer;
}

function getRowSolve(r) {
  const key = rowKey(r);
  let cached = matchCache[r];
  if (!cached || cached.key !== key) {
    const pattern = state.grid[r].join('');
    let ranked = [];
    let issues = [];
    try {
      const rawIssues = patternIssues(pattern, state.answer);
      issues = Array.isArray(rawIssues) ? rawIssues.slice() : [];
      ranked = orderRanked(findMatches(pattern, state.answer, GUESSES) || []);
    } catch (err) {
      issues = ['solver error: ' + (err && err.message ? err.message : String(err))];
      ranked = [];
    }
    cached = { key, ranked, issues };
    matchCache[r] = cached;
  }
  return cached;
}

function randomSample(words, n) {
  const copy = words.slice();
  const take = Math.min(n, copy.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return orderRanked(copy.slice(0, take));
}

function getSample(r, ranked, key) {
  const s = state.samples[r];
  if (s && s.key === key) return s.words;
  const words = ranked.slice(0, CHIP_LIMIT);
  state.samples[r] = { key, words };
  return words;
}

function rerollRow(r) {
  if (!ANSWER_RE.test(state.answer)) return;
  const { ranked } = getRowSolve(r);
  state.samples[r] = { key: rowKey(r), words: randomSample(ranked, CHIP_LIMIT) };
  scheduleRender();
}

// ---------------------------------------------------------------- rendering

let renderQueued = false;

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function renderWarnings(ul, items) {
  ul.textContent = '';
  for (const msg of items) {
    const li = document.createElement('li');
    li.textContent = msg;
    ul.appendChild(li);
  }
}

function render() {
  const answerOk = ANSWER_RE.test(state.answer);
  answerWarning.hidden = !(answerOk && !ALLOWED.has(state.answer));
  updateGalleryBadges(answerOk);

  currentWords = [];

  for (let r = 0; r < MAX_ROWS; r++) {
    const els = rowEls[r];
    const active = r < state.rowCount;
    els.block.hidden = !active;
    if (!active) continue;

    const pattern = state.grid[r].join('');
    let ranked = [];
    let issues = [];
    let selected = null;
    let isAuto = true;

    if (answerOk) {
      const solve = getRowSolve(r);
      ranked = solve.ranked;
      issues = solve.issues;
      if (state.chosen[r] && !ranked.includes(state.chosen[r])) state.chosen[r] = null;
      selected = state.chosen[r] || ranked[0] || null;
      isAuto = !state.chosen[r];
    }
    currentWords.push(selected);

    // tiles: painted colors + letters of the selected word
    for (let c = 0; c < COLS; c++) {
      const tile = els.tiles[c];
      const color = state.grid[r][c];
      const letter = selected ? selected[c] : '';
      tile.dataset.color = String(color);
      tile.textContent = letter;
      tile.classList.toggle('has-letter', letter !== '');
      tile.setAttribute(
        'aria-label',
        `Row ${r + 1}, column ${c + 1}: ${COLOR_NAMES[color]}` +
          (letter ? `, letter ${letter.toUpperCase()}` : '')
      );
    }

    // structural warning that needs no answer
    const structural = [];
    if (pattern === '22222' && r !== state.rowCount - 1) {
      structural.push('guessing the answer ends the game — make this the last row');
    }

    if (!answerOk) {
      els.count.textContent = 'waiting for a 5-letter answer…';
      els.count.classList.add('muted');
      els.autoTag.hidden = true;
      els.reroll.disabled = true;
      els.chips.textContent = '';
      renderWarnings(els.warnings, structural);
      continue;
    }

    const n = ranked.length;
    els.count.textContent = `${n.toLocaleString()} ${n === 1 ? 'match' : 'matches'}`;
    els.count.classList.remove('muted');
    els.autoTag.hidden = !(selected && isAuto);
    els.reroll.disabled = n <= CHIP_LIMIT;
    els.reroll.title = n <= CHIP_LIMIT ? 'All matches are already shown' : 'Show a different random sample';

    els.chips.textContent = '';
    let sample = getSample(r, ranked, rowKey(r));
    if (selected && !sample.includes(selected)) {
      // keep the selected word visible even when a reroll sampled past it
      sample = orderRanked(sample.slice(0, -1).concat(selected));
    }
    for (const w of sample) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = w;
      const isSel = w === selected;
      chip.setAttribute('aria-pressed', String(isSel));
      chip.setAttribute('aria-label', `Use ${w.toUpperCase()} for row ${r + 1}`);
      if (isSel) {
        chip.classList.add('selected');
        if (isAuto) {
          chip.classList.add('auto');
          chip.title = 'Auto pick (top-ranked)';
        }
      }
      chip.addEventListener('click', () => {
        state.chosen[r] = state.chosen[r] === w ? null : w; // click again to go back to auto
        scheduleRender();
      });
      els.chips.appendChild(chip);
    }

    const warn = [];
    if (n === 0) warn.push('no dictionary word makes this pattern — tweak a tile');
    warn.push(...issues, ...structural);
    renderWarnings(els.warnings, warn);
  }

  renderOutputs(answerOk);
}

function renderOutputs(answerOk) {
  wordsList.textContent = '';
  currentWords.forEach((w) => {
    const li = document.createElement('li');
    if (w) {
      li.textContent = w;
    } else {
      li.textContent = answerOk ? 'no word for this row' : '—';
      li.classList.add('placeholder');
    }
    wordsList.appendChild(li);
  });

  currentEmoji = state.grid
    .slice(0, state.rowCount)
    .map((row) => row.map((c) => EMOJI[c]).join(''))
    .join('\n');
  emojiPreview.textContent = currentEmoji;
}

// ---------------------------------------------------------------- meme gallery

const presetCards = []; // { preset, badge }

// achievablePatterns is one ~15k-word sweep, so run it once per answer and
// share the result between the badges and preset adaptation.
let achievableCache = null; // { answer, map }
let badgeAnswer = null;     // answer the badges were last rendered for

function getAchievable() {
  if (!achievableCache || achievableCache.answer !== state.answer) {
    achievableCache = { answer: state.answer, map: achievablePatterns(state.answer, GUESSES) };
  }
  return achievableCache.map;
}

function buildGallery() {
  for (const preset of PRESETS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preset-card';
    card.setAttribute('aria-label', `Apply preset: ${preset.name}`);

    const head = document.createElement('div');
    head.className = 'preset-head';
    const icon = document.createElement('span');
    icon.className = 'preset-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = preset.icon;
    const name = document.createElement('span');
    name.className = 'preset-name';
    name.textContent = preset.name;
    head.append(icon, name);

    const mini = document.createElement('div');
    mini.className = 'mini-grid';
    mini.setAttribute('aria-hidden', 'true');
    for (const row of preset.rows) {
      for (const ch of row) {
        const cell = document.createElement('span');
        cell.className = 'mini-cell';
        cell.dataset.color = ch;
        mini.appendChild(cell);
      }
    }

    const badge = document.createElement('span');
    badge.className = 'preset-badge';

    card.append(head, mini, badge);
    card.addEventListener('click', () => applyRows(preset.rows));
    galleryGrid.appendChild(card);
    presetCards.push({ preset, badge });
  }
}

// Called from render(); the badgeAnswer guard makes every pass after the
// first one per answer free, so paint-drags never re-sweep the dictionary.
function updateGalleryBadges(answerOk) {
  const key = answerOk ? state.answer : '';
  if (badgeAnswer === key) return;
  badgeAnswer = key;
  const achievable = answerOk ? getAchievable() : null;
  for (const { preset, badge } of presetCards) {
    if (!achievable) {
      badge.textContent = '';
      badge.className = 'preset-badge';
      continue;
    }
    let misses = 0;
    for (const row of preset.rows) {
      if (!achievable.has(row)) misses++;
    }
    badge.textContent = misses === 0 ? '✓ paintable' : `~ adapts ${misses} row(s)`;
    badge.className = misses === 0 ? 'preset-badge ok' : 'preset-badge adapt';
  }
}

// Apply preset/stamp rows to the grid, honoring the two gallery options.
function applyRows(rows) {
  const answerOk = ANSWER_RE.test(state.answer);
  const finish = finishCheck.checked && rows.length <= MAX_ROWS - 1;
  let adapted = 0;
  let applied = rows;
  if (adaptCheck.checked && answerOk) {
    const achievable = getAchievable();
    applied = rows.map((row, r) => {
      if (achievable.has(row)) return row;
      adapted++;
      // all-green is always "achievable" (it is the answer itself), but it
      // ends the game — never adapt a row to it unless it is the final row
      const canBeAllGreen = r === rows.length - 1 && !finish;
      const pool = canBeAllGreen
        ? achievable
        : { keys: () => [...achievable.keys()].filter((p) => p !== '22222') };
      return nearestAchievable(row, pool).pattern;
    });
  }

  for (let r = 0; r < MAX_ROWS; r++) {
    let next = '00000'; // rows beyond the preset reset to gray
    if (r < applied.length) next = applied[r];
    else if (finish && r === applied.length) next = '22222';
    let changed = false;
    for (let c = 0; c < COLS; c++) {
      const color = Number(next[c]);
      if (state.grid[r][c] !== color) {
        state.grid[r][c] = color;
        changed = true;
      }
    }
    if (changed) {
      state.chosen[r] = null;
      state.samples[r] = null;
    }
  }

  adaptNotice.hidden = adapted === 0;
  if (adapted > 0) adaptNotice.textContent = `adapted ${adapted} row(s) to stay paintable`;
  setRowCount(applied.length + (finish ? 1 : 0)); // schedules the render
}

let stampColor = 2; // 1 = yellow, 2 = green

function updateStampToggle() {
  for (const b of stampSwatches) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.color) === stampColor));
  }
}

for (const b of stampSwatches) {
  b.addEventListener('click', () => {
    stampColor = Number(b.dataset.color);
    updateStampToggle();
  });
}

function doStamp() {
  const ch = stampInput.value.trim();
  const rows = ch ? stampChar(ch, stampColor) : null;
  if (!rows) {
    flashButton(stampBtn, 'no glyph');
    return;
  }
  applyRows(rows);
}

stampBtn.addEventListener('click', doStamp);
stampInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doStamp();
});

// ---------------------------------------------------------------- painting

function setCell(r, c, color) {
  if (state.grid[r][c] === color) return;
  state.grid[r][c] = color;
  scheduleRender();
}

function cycleCell(r, c) {
  state.grid[r][c] = (state.grid[r][c] + 1) % 3;
  scheduleRender();
}

function tilePos(tile) {
  return { r: Number(tile.dataset.row), c: Number(tile.dataset.col) };
}

let painting = false;

// click covers mouse clicks, touch taps and keyboard activation.
// Cycle mode only acts here (so touch scrolling never repaints tiles);
// brush mode also acts here but setCell is idempotent, so the extra
// click after pointerdown is harmless.
boardEl.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  const { r, c } = tilePos(tile);
  if (state.brush !== null) setCell(r, c, state.brush);
  else cycleCell(r, c);
});

// brush drag-painting (mouse + touch via pointer events)
boardEl.addEventListener('pointerdown', (e) => {
  if (state.brush === null) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const tile = e.target.closest('.tile');
  if (!tile) return;
  e.preventDefault(); // no text selection / native drag while painting
  painting = true;
  const { r, c } = tilePos(tile);
  setCell(r, c, state.brush);
});

window.addEventListener('pointermove', (e) => {
  if (!painting || state.brush === null) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) {
    // missed the pointerup (dialog, cmd-tab, out-of-window release)
    painting = false;
    return;
  }
  // touch implicitly captures the pointer, so resolve the tile by position
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const tile = el && el.closest ? el.closest('.tile') : null;
  if (!tile) return;
  const { r, c } = tilePos(tile);
  setCell(r, c, state.brush);
});

window.addEventListener('pointerup', () => { painting = false; });
window.addEventListener('pointercancel', () => { painting = false; });
window.addEventListener('blur', () => { painting = false; });

// ---------------------------------------------------------------- toolbar

function updatePalette() {
  for (const b of swatches) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.color) === state.brush));
  }
  document.body.classList.toggle('brush-armed', state.brush !== null);
  brushHint.textContent =
    state.brush === null
      ? 'No brush armed — click a tile to cycle gray → yellow → green.'
      : `Brush armed — click or drag across tiles to paint ${COLOR_NAMES[state.brush]}. ` +
        'Click the swatch again to go back to cycle mode.';
}

for (const b of swatches) {
  b.addEventListener('click', () => {
    const color = Number(b.dataset.color);
    state.brush = state.brush === color ? null : color;
    updatePalette();
  });
}

function setRowCount(n) {
  state.rowCount = Math.max(1, Math.min(MAX_ROWS, n));
  rowsValue.textContent = String(state.rowCount);
  rowsMinus.disabled = state.rowCount <= 1;
  rowsPlus.disabled = state.rowCount >= MAX_ROWS;
  scheduleRender();
}

rowsMinus.addEventListener('click', () => setRowCount(state.rowCount - 1));
rowsPlus.addEventListener('click', () => setRowCount(state.rowCount + 1));

clearBtn.addEventListener('click', () => {
  for (let r = 0; r < MAX_ROWS; r++) {
    state.grid[r].fill(0);
    state.chosen[r] = null;
    state.samples[r] = null;
  }
  scheduleRender();
});

// ---------------------------------------------------------------- answer

answerInput.addEventListener('input', () => {
  const cleaned = answerInput.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, COLS);
  if (cleaned !== answerInput.value) answerInput.value = cleaned;
  state.answer = cleaned;
  puzzleIdEl.hidden = true; // manual edits detach from the fetched puzzle
  scheduleRender();
});

function localDateString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// The NYT endpoint sends no CORS headers, so a direct browser fetch is
// normally blocked. Routes, in order:
//   1. serve.py's same-origin proxy (local runs)
//   2. data/daily.json — a static cache a GitHub Action refreshes every few
//      hours, so the hosted GitHub Pages site can auto-fill too
//   3. direct NYT (in case they ever open CORS)
// All fail -> the manual-paste panel.
async function fetchTodayJson(date) {
  const tryJson = async (url, pick) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = pick(await res.json());
      return data && typeof data.solution === 'string' ? data : null;
    } catch {
      return null; // CORS block or network error — try the next route
    }
  };
  return (
    (await tryJson(`/api/today?date=${date}`, (d) => d)) ||
    (await tryJson('./data/daily.json', (d) => d && d.days && d.days[date])) ||
    (await tryJson(`https://www.nytimes.com/svc/wordle/v2/${date}.json`, (d) => d))
  );
}

fetchBtn.addEventListener('click', async () => {
  const date = localDateString();
  fallbackPanel.hidden = true;
  fetchBtn.disabled = true;
  const label = fetchBtn.textContent;
  fetchBtn.textContent = 'Fetching…';
  try {
    const data = await fetchTodayJson(date);
    if (!data) throw new Error('all fetch routes failed');
    const word = data.solution.toLowerCase().replace(/[^a-z]/g, '').slice(0, COLS);
    answerInput.value = word;
    state.answer = word;
    const num = data.days_since_launch ?? data.id;
    puzzleIdEl.textContent = num !== undefined && num !== null ? `Puzzle #${num}` : 'Fetched';
    puzzleIdEl.hidden = false;
    scheduleRender();
  } catch {
    const url = `https://www.nytimes.com/svc/wordle/v2/${date}.json`;
    puzzleIdEl.hidden = true;
    fallbackLink.href = url;
    fallbackLink.textContent = url;
    fallbackPanel.hidden = false;
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = label;
  }
});

// ---------------------------------------------------------------- copying

async function copyText(text, btn) {
  let ok = false;
  if (text) {
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // fallback for insecure contexts / older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
  }
  flashButton(btn, ok ? 'Copied!' : text ? 'Copy failed' : 'Nothing to copy');
}

function flashButton(btn, msg) {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = msg;
  clearTimeout(btn._flashTimer);
  btn._flashTimer = setTimeout(() => {
    btn.textContent = btn.dataset.label;
  }, 1400);
}

copyWordsBtn.addEventListener('click', () => {
  // keep one line per row so the copied list stays aligned with the grid
  const text = currentWords.some(Boolean)
    ? currentWords.map((w, i) => w || `(no word for row ${i + 1})`).join('\n')
    : '';
  copyText(text, copyWordsBtn);
});

copyEmojiBtn.addEventListener('click', () => {
  copyText(currentEmoji, copyEmojiBtn);
});

// ---------------------------------------------------------------- init

// keep the contract import honest even though findMatches wraps it:
// used for a dev-console sanity helper.
window.__wordlePaint = { feedbackFor, findMatches, patternIssues, state };

buildBoard();
buildGallery();
updatePalette();
updateStampToggle();
setRowCount(MAX_ROWS);
render();
