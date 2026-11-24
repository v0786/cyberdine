import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(role + "@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
test("mobile QR order, revision, KDS and checkout", async ({ browser }) => {
  const manager = await browser.newPage();
  const waiter = await browser.newPage();
  const kitchen = await browser.newPage({
    viewport: { width: 768, height: 1024 },
  });
  const guest = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  for (const p of [manager, waiter, kitchen, guest])
    p.on("dialog", (d) => void d.accept());
  await login(manager, "manager");
  await manager.getByRole("link", { name: "Admin" }).click();
  await manager.getByRole("button", { name: "Tables & QR" }).click();
  const t = manager.locator("section.panel").filter({
    has: manager.getByRole("heading", { name: "Table 01", exact: true }),
  });
  await t.getByRole("button", { name: "Generate QR", exact: true }).click();
  const path = await t
    .getByRole("link", { name: "Open menu" })
    .getAttribute("href");
  expect(path).toMatch(/\/menu\/[a-f0-9]{48}$/);
  await login(waiter, "waiter");
  await waiter.getByRole("button", { name: "Scan a table" }).click();
  await expect(waiter.getByRole("alert")).toContainText("Camera unavailable");
  await waiter.getByRole("link", { name: /Table 01/ }).click();
  await waiter.getByRole("button", { name: "Open table" }).click();
  const pin = (await waiter.locator(".pin").innerText()).trim();
  expect(pin).toMatch(/^\d{4}$/);
  await login(kitchen, "kitchen");
  await expect(
    kitchen.getByText("No approved tickets right now."),
  ).toBeVisible();
  await guest.goto(path!);
  await expect(
    guest.getByRole("heading", { name: "{ RESTAURANT NAME }" }),
  ).toBeVisible();
  const dish = guest.locator("article").filter({
    has: guest.getByRole("heading", { name: "Paneer Tikka", exact: true }),
  });
  await dish.getByRole("button", { name: "Add", exact: true }).click();
  await guest.getByLabel("Cooking notes").fill("No chilli");
  await guest.getByRole("button", { name: /Save ·/ }).click();
  await guest.getByRole("button", { name: /View cart/ }).click();
  await guest
    .getByLabel("4-digit table PIN")
    .fill(pin === "0000" ? "1111" : "0000");
  await guest.getByRole("button", { name: "Send to waiter" }).click();
  await expect(guest.getByRole("alert")).toContainText("Incorrect table PIN");
  await guest.getByLabel("4-digit table PIN").fill(pin);
  await guest.getByRole("button", { name: "Send to waiter" }).click();
  await expect(
    guest.getByText("pending waiter approval", { exact: true }),
  ).toBeVisible();
  await expect(
    kitchen.getByText("No approved tickets right now."),
  ).toBeVisible();
  await waiter.getByText("Save revised order", { exact: true }).first().click();
  const order = waiter.locator("article.order");
  await order.getByRole("button", { name: "Edit", exact: true }).click();
  await waiter.getByLabel("Quantity", { exact: true }).fill("2");
  await waiter.getByRole("button", { name: /Save ·/ }).click();
  await order
    .getByRole("button", { name: "Save revised order", exact: true })
    .click();
  await expect(
    waiter.getByText("Waiting for diner to confirm the revision."),
  ).toBeVisible();
  await guest.getByRole("button", { name: "Confirm revised order" }).click();
  await order
    .getByRole("checkbox", {
      name: "I confirmed this order with the diners in person",
    })
    .check();
  await waiter
    .getByRole("button", { name: "Approve and send to kitchen" })
    .click();
  await kitchen.getByRole("button", { name: "Mark preparing" }).click();
  await kitchen.getByRole("button", { name: "Mark ready" }).click();
  await waiter.getByRole("link", { name: "KDS", exact: true }).click();
  await waiter.getByRole("button", { name: "Mark served" }).click();
  await expect(guest.getByText("served", { exact: true })).toBeVisible();
  await guest.getByRole("button", { name: "Request bill" }).click();
  await waiter.getByRole("link", { name: "Bills", exact: true }).click();
  await waiter.getByRole("button", { name: "Finalize bill" }).click();
  await waiter.getByLabel("Payment method").selectOption("upi");
  await waiter.getByLabel("Payment received outside this app").check();
  await waiter
    .getByRole("button", { name: "Record payment and close" })
    .click();
  await expect(waiter.getByText("No open tables.")).toBeVisible();
  await expect(guest.getByText(/Table access expired/)).toBeVisible({
    timeout: 12000,
  });
  expect(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
