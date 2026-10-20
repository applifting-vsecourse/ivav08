import { expect, test, type Browser } from "@playwright/test"

import { API, signIn, USERS } from "./signIn"

// A fresh, separately signed-in browser per account, like two different people.
async function signedInPage(browser: Browser, user: { email: string; password: string }) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, user)
  return page
}

test("an admin deletes someone else's quack; a regular user gets 403", async ({ browser }) => {
  // 1. A regular user posts a quack.
  const text = `E2E nasty quack ${Date.now()}`
  const author = await signedInPage(browser, USERS.caffeinatedDuck)
  await author.goto("/quacks")
  await author.getByLabel("Post context or text").fill(text)
  await author.getByRole("button", { name: "Quack", exact: true }).click()
  await expect(author.getByRole("article").filter({ hasText: text })).toBeVisible()

  const quacks = (await (await author.request.get(`${API}/quacks`)).json()) as {
    id: string
    text: string
  }[]
  const quackId = quacks.find((quack) => quack.text === text)?.id
  expect(quackId).toBeTruthy()

  // 2. Another regular user can neither see Delete nor call the API.
  const other = await signedInPage(browser, USERS.deepDuckThoughts)
  await other.goto("/quacks")
  const otherArticle = other.getByRole("article").filter({ hasText: text })
  await expect(otherArticle).toBeVisible()
  await expect(otherArticle.getByRole("button", { name: "Delete quack" })).toHaveCount(0)
  const forbidden = await other.request.delete(`${API}/quacks/${quackId}`)
  expect(forbidden.status()).toBe(403)

  // 3. The admin sees Delete on it and removes it through the UI.
  const admin = await signedInPage(browser, USERS.admin)
  await admin.goto("/quacks")
  const adminArticle = admin.getByRole("article").filter({ hasText: text })
  await adminArticle.getByRole("button", { name: "Delete quack" }).click()
  await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(admin.getByRole("article").filter({ hasText: text })).toHaveCount(0)

  // 4. It is gone for the author too.
  await author.reload()
  await expect(author.getByRole("article").filter({ hasText: text })).toHaveCount(0)
})

test("the admin sees Delete on every quack", async ({ page }) => {
  await signIn(page, USERS.admin)
  await page.goto("/quacks")

  const articles = page.getByRole("article")
  await expect(articles.first()).toBeVisible()
  const total = await articles.count()
  await expect(articles.getByRole("button", { name: "Delete quack" })).toHaveCount(total)
})

test("admin-only stats: 200 for an admin, 403 for a regular user", async ({ browser }) => {
  const admin = await signedInPage(browser, USERS.admin)
  expect((await admin.request.get(`${API}/quacks/stats`)).status()).toBe(200)

  const user = await signedInPage(browser, USERS.deepDuckThoughts)
  expect((await user.request.get(`${API}/quacks/stats`)).status()).toBe(403)
})

test("the Stats page is for admins only", async ({ browser }) => {
  const admin = await signedInPage(browser, USERS.admin)
  await admin.goto("/stats")
  await expect(admin.getByRole("heading", { name: "Stats" })).toBeVisible()
  await expect(admin.getByRole("main").getByText("Quacks", { exact: true })).toBeVisible()

  const user = await signedInPage(browser, USERS.deepDuckThoughts)
  await user.goto("/stats")
  await expect(user).toHaveURL(/\/quacks/)
})
