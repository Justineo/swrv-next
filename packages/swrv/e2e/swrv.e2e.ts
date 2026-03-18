import { expect, test } from "@playwright/test";

test.describe("swrv browser fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("revalidates on focus in a browser page", async ({ page }) => {
    await expect(page.getByTestId("focus-data")).toHaveText("focus:0");

    await page.getByTestId("focus-advance").click();
    await page.getByTestId("focus-trigger").click();

    await expect(page.getByTestId("focus-data")).toHaveText("focus:1");
  });

  test("revalidates on reconnect in a browser page", async ({ page }) => {
    await expect(page.getByTestId("reconnect-data")).toHaveText("online:0");

    await page.getByTestId("reconnect-advance").click();
    await page.getByTestId("reconnect-trigger").click();

    await expect(page.getByTestId("reconnect-data")).toHaveText("online:1");
  });

  test("shows optimistic mutation state before the final cache value", async ({ page }) => {
    await expect(page.getByTestId("mutation-data")).toHaveText("server-0");

    await page.getByTestId("mutation-trigger").click();

    await expect(page.getByTestId("mutation-data")).toHaveText("optimistic");
    await page.getByTestId("mutation-resolve").click();
    await expect(page.getByTestId("mutation-data")).toHaveText("server-0|mutation-result");
  });

  test("receives subscription pushes in a browser page", async ({ page }) => {
    await expect(page.getByTestId("subscription-data")).toHaveText("waiting");

    await page.getByTestId("subscription-push").click();

    await expect(page.getByTestId("subscription-data")).toHaveText("live:1");
  });
});
