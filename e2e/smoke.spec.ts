import { expect, test } from "@playwright/test";

// Every public page renders without errors or sideways scrolling.
const PAGES = [
  { path: "/", heading: "YEARPRINT" },
  { path: "/how-to-play", heading: "How to Play" },
  { path: "/signin", heading: "Welcome back" },
  { path: "/signup", heading: "Create your account" },
  { path: "/account", heading: /guest|Your account/ },
  { path: "/play", heading: /./ },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("unknown pages get the newspaper 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /page you wanted/i })).toBeVisible();
});

test("the leaderboard has no page of its own", async ({ page }) => {
  const res = await page.goto("/leaderboard");
  expect(res?.status()).toBe(404);
});
