import { expect, test } from "@playwright/test"

import { signIn, USERS } from "./signIn"

test("signed-out visitor is sent to the login page", async ({ page }) => {
  await page.goto("/quacks")
  await expect(page).toHaveURL(/\/login/)
})

test("user can sign in", async ({ page }) => {
  await signIn(page, USERS.caffeinatedDuck)
  await page.goto("/quacks")
  await expect(page.getByRole("heading", { name: "Quacks" })).toBeVisible()
})
