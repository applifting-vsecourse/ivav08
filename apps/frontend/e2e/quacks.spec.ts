import { expect, test, type Page } from "@playwright/test"

import { API, signIn, USERS } from "./signIn"

type ApiQuack = { id: string; text: string; user: { username: string } }

// Uses the signed-in browser's cookies, exactly like the app does.
async function findQuackNotBy(page: Page, username: string): Promise<ApiQuack> {
  const response = await page.request.get(`${API}/quacks`)
  expect(response.ok()).toBeTruthy()
  const quacks = (await response.json()) as ApiQuack[]
  const quack = quacks.find(
    (candidate) => candidate.user.username.toLowerCase() !== username.toLowerCase(),
  )
  if (!quack) throw new Error(`No quack by anyone other than ${username} in the feed`)
  return quack
}

test("author can post a quack and delete it", async ({ page }) => {
  const text = `E2E delete me ${Date.now()}`
  await signIn(page, USERS.caffeinatedDuck)
  await page.goto("/quacks")

  await page.getByLabel("Post context or text").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const article = page.getByRole("article").filter({ hasText: text })
  await expect(article).toBeVisible()

  await article.getByRole("button", { name: "Delete quack" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()

  await expect(page.getByRole("article").filter({ hasText: text })).toHaveCount(0)
})

test("Mine shows only my own quacks", async ({ page }) => {
  const text = `E2E mine ${Date.now()}`
  await signIn(page, USERS.caffeinatedDuck)
  await page.goto("/quacks")
  await page.getByLabel("Post context or text").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  await expect(page.getByRole("article").filter({ hasText: text })).toBeVisible()

  await page.getByRole("tab", { name: "Mine" }).click()

  const articles = page.getByRole("article")
  await expect(articles.filter({ hasText: text })).toBeVisible()
  await expect(articles.filter({ hasNotText: /@caffeinatedduck/i })).toHaveCount(0)

  // clean up after ourselves
  await articles.filter({ hasText: text }).getByRole("button", { name: "Delete quack" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect(articles.filter({ hasText: text })).toHaveCount(0)
})

test("nobody can delete someone else's quack", async ({ page }) => {
  await signIn(page, USERS.deepDuckThoughts)
  await page.goto("/quacks")

  const foreign = await findQuackNotBy(page, "DeepDuckThoughts")
  const foreignArticle = page
    .getByRole("article")
    .filter({ hasText: `@${foreign.user.username}` })
    .first()
  await expect(foreignArticle).toBeVisible()
  await expect(foreignArticle.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

  // Hiding the button is not enough — the API itself must refuse.
  const response = await page.request.delete(`${API}/quacks/${foreign.id}`)
  expect(response.status()).toBe(403)
})

test("a quack whose poll already has votes can still be deleted", async ({ browser }) => {
  const authorContext = await browser.newContext()
  const author = await authorContext.newPage()
  await signIn(author, USERS.caffeinatedDuck)
  const created = await author.request.post(`${API}/quacks`, {
    data: { text: `E2E poll ${Date.now()}`, polls: [{ question: "Lunch?", options: ["Pond", "Park"] }] },
  })
  expect(created.status()).toBe(201)
  const quack = (await created.json()) as { id: string; polls: { id: string; options: { id: string }[] }[] }
  const poll = quack.polls[0]!

  const voterContext = await browser.newContext()
  const voter = await voterContext.newPage()
  await signIn(voter, USERS.deepDuckThoughts)
  const vote = await voter.request.post(`${API}/polls/${poll.id}/vote`, {
    data: { optionId: poll.options[0]!.id },
  })
  expect(vote.status()).toBe(200)

  const deleted = await author.request.delete(`${API}/quacks/${quack.id}`)
  expect(deleted.status()).toBe(204)
})

test("signed-out callers get 401 from the delete endpoint", async ({ request }) => {
  const response = await request.delete(`${API}/quacks/any-id`)
  expect(response.status()).toBe(401)
})
