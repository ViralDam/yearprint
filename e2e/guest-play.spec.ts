import { expect, test } from "@playwright/test";

// One full game as a brand-new guest: unfold, guess until the paper is
// dated or the guesses run out, then check the reveal and the board.
// The answer is never visible before the end, so the test follows the hints
// instead of knowing the year.
test("a guest plays today's edition to the end", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "YEARPRINT" })).toBeVisible();
  await page.getByRole("link", { name: "Play today's edition" }).first().click();
  await expect(page).toHaveURL(/\/play$/);

  // A first-time visitor is asked to sign up, sign in or play as a guest.
  const gate = page.getByRole("dialog", { name: "Get your name in print" });
  await expect(gate).toBeVisible();
  await expect(gate.getByRole("link", { name: "Create a free account" })).toBeVisible();
  await gate.getByRole("button", { name: "Play as a guest" }).click();
  await expect(gate).toBeHidden();

  // The paper, with its year torn off and nothing paid yet.
  const paper = page.locator("#paper");
  await expect(paper.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(paper.getByLabel("year redacted")).toBeVisible();
  const score = page.locator("header [aria-live] .tabular-nums");
  await expect(score).toHaveText("1,000");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  // The guess controls are docked on screen, not waiting below the paper.
  await expect(
    page.getByRole("button", { name: /^Send to press — guess \d{4}$/ }),
  ).toBeInViewport();

  // Unfold the last (cheapest) section: two taps, then pay.
  const unfold = page.getByRole("button", { name: /^Unfold the .+ page for \d+ points$/ }).last();
  const label = (await unfold.getAttribute("aria-label")) ?? "";
  const cost = Number(label.match(/for (\d+) points/)?.[1]);
  const sectionName = label.match(/^Unfold the (.+) page for/)?.[1] ?? "";
  await unfold.click();
  const confirm = page.getByRole("button", {
    name: `Confirm: pay ${cost} points to unfold ${sectionName}`,
  });
  await confirm.click();
  await expect(score).toHaveText((1000 - cost).toLocaleString("en-US"));
  await expect(page.getByRole("heading", { name: new RegExp(sectionName) })).toBeVisible();
  // Inside pages never carry the reveal notes before the end.
  await expect(page.getByText("The real story behind it")).toHaveCount(0);

  // Guess the slider's suggestion (the middle of what the hints allow).
  const results = page.locator("#results");
  for (let i = 0; i < 3 && !(await results.isVisible()); i++) {
    const send = page.getByRole("button", { name: /^Send to press — guess \d{4}$/ });
    await send.click();
    await expect(page.getByRole("button", { name: /Sending to press/ })).toHaveCount(0);
  }

  // The reveal: a year, a verdict, a spoiler-free share card, every note.
  await expect(results).toBeVisible();
  const year = await results.locator("div.font-display").first().textContent();
  expect(year?.trim()).toMatch(/^(19[6-9]\d|20[0-2]\d)$/);
  await expect(paper.getByText(year!.trim(), { exact: true })).toBeVisible(); // masthead date
  const share = await results.locator(".whitespace-pre-line").textContent();
  expect(share).toContain("YEARPRINT #");
  expect(share).not.toMatch(/\b(19|20)\d\d\b/);
  await expect(page.getByText("The real story behind it").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account to keep it →" })).toBeVisible();

  // Guests don't see the board, only an invitation to create an account.
  await expect(results.getByRole("heading", { name: /leaderboard/i })).toBeVisible();
  await expect(results.getByText(/board is for readers with an account/i)).toBeVisible();
  await expect(results.getByRole("table")).toHaveCount(0);

  // A reload resumes the finished game instead of starting a new one.
  await page.reload();
  await expect(page.locator("#results")).toBeVisible();
  await expect(page.locator("#results div.font-display").first()).toHaveText(year!.trim());
});
