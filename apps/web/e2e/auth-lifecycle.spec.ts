import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/__auth-harness");
});

test("popup sign-in keeps the desk URL and mounts private data", async ({ page }) => {
  const initialUrl = page.url();
  const popupPromise = page.waitForEvent("popup");

  await page.getByRole("button", { name: "Sign in" }).click();
  const popup = await popupPromise;
  await popup.waitForEvent("close");

  await expect(page.getByTestId("session-state")).toHaveText("Session ready");
  await expect(page.getByTestId("private-content")).toBeVisible();
  expect(page.url()).toBe(initialUrl);
});

test("sign out clears private data without navigating the desk", async ({ page }) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("private-content")).toBeVisible();
  const signedInUrl = page.url();

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Sign out" }).click();
  const popup = await popupPromise;
  await popup.waitForEvent("close");

  await expect(page.getByTestId("session-state")).toHaveText("Signed out");
  await expect(page.getByTestId("signed-out-content")).toBeVisible();
  expect(page.url()).toBe(signedInUrl);
});

test("routine refresh retains the authenticated shell", async ({ page }) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("private-content")).toBeVisible();
  const signedInUrl = page.url();

  await page.getByRole("button", { name: "Simulate token refresh" }).click();

  await expect(page.getByTestId("session-state")).toHaveText("Secure session refreshed");
  await expect(page.getByTestId("private-content")).toBeVisible();
  expect(page.url()).toBe(signedInUrl);
});

test("popup cancellation reports inline without moving the desk", async ({ page }) => {
  const initialUrl = page.url();
  await page.getByRole("button", { name: "Simulate popup cancellation" }).click();

  await expect(page.getByTestId("session-state")).toContainText("desk did not move");
  expect(page.url()).toBe(initialUrl);
});
