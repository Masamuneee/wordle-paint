// Independent reference implementation of NYT Wordle tile coloring.
// Two-pass algorithm with correct duplicate handling.
// feedbackFor(guess, answer) -> string of 5 chars: '2' green, '1' yellow, '0' gray.
export function feedbackFor(guess, answer) {
  guess = guess.toLowerCase();
  answer = answer.toLowerCase();
  const n = 5;
  const result = new Array(n).fill('0');
  const remaining = Object.create(null); // counts of answer letters not matched green

  // Pass 1: greens
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      result[i] = '2';
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }

  // Pass 2: yellows, left to right, consuming remaining counts
  for (let i = 0; i < n; i++) {
    if (result[i] === '2') continue;
    const c = guess[i];
    if (remaining[c] > 0) {
      result[i] = '1';
      remaining[c]--;
    }
  }

  return result.join('');
}
