// Newspaper-style counts and lists: "six sections", "Politics, Sports and Ads".
// Plain TS (no parameter properties) so Node can run it directly.

const WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** 6 → "six"; numbers above twelve stay as digits. */
export function countWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

/** "six sections", "one section". */
export function countNoun(n: number, singular: string, plural = `${singular}s`): string {
  return `${countWord(n)} ${n === 1 ? singular : plural}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ["A", "B", "C"] → "A, B and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
