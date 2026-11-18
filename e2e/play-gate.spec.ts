import { expect, test, type BrowserContext } from "@playwright/test";

// The sign-up popup on /play: shown to anyone without an account unless they
// chose "Play as a guest" within the last day.
const HOUR = 60 * 60 * 1000;
const gateName = "Get your name in print";

async function setGuestChoice(context: BrowserContext, baseURL: string, value: string) {
  await context.addCookies([{ name: "yp_guest", value, url: baseURL }]);
}

test("playing as a guest hides the popup for a day", async ({ page }) => {
  await page.goto("/play");
  const gate = page.getByRole("dialog", { name: gateName });
  await expect(gate).toBeVisible();
  await gate.getByRole("button", { name: "Play as a guest" }).click();
  await expect(gate).toBeHidden();

  const cookie = (await page.context().cookies()).find((c) => c.name === "yp_guest");
  expect(cookie?.value).toMatch(/^\d{13}$/);
  // Expires in about a day, not a year.
  expect(cookie!.expires * 1000 - Date.now()).toBeLessThanOrEqual(24 * HOUR + 60_000);

  await page.reload();
  await expect(page.locator("#paper")).toBeVisible();
  await expect(page.getByRole("dialog", { name: gateName })).toHaveCount(0);
});

test("a guest choice over a day old asks again", async ({ page, context, baseURL }) => {
  await setGuestChoice(context, baseURL!, String(Date.now() - 25 * HOUR));
  await page.goto("/play");
  await expect(page.getByRole("dialog", { name: gateName })).toBeVisible();
});

test("an old year-long cookie no longer skips the popup", async ({ page, context, baseURL }) => {
  await setGuestChoice(context, baseURL!, "1");
  await page.goto("/play");
  await expect(page.getByRole("dialog", { name: gateName })).toBeVisible();
});
