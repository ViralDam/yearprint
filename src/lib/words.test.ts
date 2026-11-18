import { describe, expect, it } from "vitest";
import { capitalize, countNoun, countWord, listNames } from "./words";

describe("words", () => {
  it("spells small counts and keeps big ones as digits", () => {
    expect(countWord(6)).toBe("six");
    expect(countWord(0)).toBe("no");
    expect(countWord(12)).toBe("twelve");
    expect(countWord(13)).toBe("13");
  });

  it("pluralises with the count", () => {
    expect(countNoun(6, "section")).toBe("six sections");
    expect(countNoun(1, "section")).toBe("one section");
    expect(capitalize(countNoun(5, "folded section"))).toBe("Five folded sections");
  });

  it("lists names the newspaper way", () => {
    expect(listNames(["Politics"])).toBe("Politics");
    expect(listNames(["Politics", "Sports"])).toBe("Politics and Sports");
    expect(listNames(["Politics", "Sports", "Ads & Lifestyle"])).toBe(
      "Politics, Sports and Ads & Lifestyle",
    );
  });
});
