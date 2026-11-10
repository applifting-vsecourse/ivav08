import { expect, test, type Browser } from "@playwright/test"

import { API, signIn, USERS } from "./signIn"

async function signedInPage(browser: Browser, user: { email: string; password: string }) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, user)
  return page
}

test("reply, then delete the quack: replies stay, the text is gone everywhere", async ({
  browser,
}) => {
  const secret = `E2E secret ${Date.now()}`
  const replyText = `E2E reply ${Date.now()}`

  // 1. The author posts a quack.
  const author = await signedInPage(browser, USERS.caffeinatedDuck)
  await author.goto("/quacks")
  await author.getByLabel("Post context or text").fill(secret)
  await author.getByRole("button", { name: "Quack", exact: true }).click()
  await expect(author.getByRole("article").filter({ hasText: secret })).toBeVisible()

  // 2. Someone else replies through the UI.
  const replier = await signedInPage(browser, USERS.deepDuckThoughts)
  await replier.goto("/quacks")
  const quackForReplier = replier.getByRole("article").filter({ hasText: secret })
  await quackForReplier.getByRole("button", { name: /^Reply/ }).click()
  await quackForReplier.getByLabel("Your reply").fill(replyText)
  await quackForReplier.getByRole("button", { name: "Reply", exact: true }).click()
  await expect(quackForReplier.getByRole("list", { name: "Replies" })).toContainText(replyText)

  // 3. The author deletes the quack.
  await author.reload()
  const quackForAuthor = author.getByRole("article").filter({ hasText: secret })
  await quackForAuthor.getByRole("button", { name: "Delete quack" }).click()
  await author.getByRole("dialog").getByRole("button", { name: "Delete" }).click()

  // 4. The reply stays under a placeholder; the text appears nowhere.
  const tombstone = author.getByRole("article", { name: "Deleted quack" }).filter({
    hasText: replyText,
  })
  await expect(tombstone).toBeVisible()
  await expect(tombstone).toContainText("This quack was deleted.")
  await expect(author.getByText(secret)).toHaveCount(0)

  const feed = await (await author.request.get(`${API}/quacks`)).text()
  expect(feed).toContain(replyText)
  expect(feed).not.toContain(secret)

  const search = await (
    await author.request.get(`${API}/quacks?search=${encodeURIComponent(secret)}`)
  ).json()
  expect(search).toEqual([])

  const mine = await (await author.request.get(`${API}/quacks?mine=true`)).text()
  expect(mine).not.toContain(secret)
})

test("only the author or an admin can delete a reply; signed out gets 401", async ({
  browser,
  request,
}) => {
  const author = await signedInPage(browser, USERS.caffeinatedDuck)
  const quack = (await (
    await author.request.post(`${API}/quacks`, { data: { text: `E2E parent ${Date.now()}` } })
  ).json()) as { id: string }

  const replier = await signedInPage(browser, USERS.deepDuckThoughts)
  const created = await replier.request.post(`${API}/quacks/${quack.id}/replies`, {
    data: { text: "a reply to moderate" },
  })
  expect(created.status()).toBe(201)
  const reply = (await created.json()) as { id: string }

  // the quack's author is not the reply's author → 403
  expect((await author.request.delete(`${API}/replies/${reply.id}`)).status()).toBe(403)
  // signed out → 401
  expect((await request.delete(`${API}/replies/${reply.id}`)).status()).toBe(401)
  expect(
    (await request.post(`${API}/quacks/${quack.id}/replies`, { data: { text: "x" } })).status(),
  ).toBe(401)

  // an admin may remove it
  const admin = await signedInPage(browser, USERS.admin)
  expect((await admin.request.delete(`${API}/replies/${reply.id}`)).status()).toBe(204)
})

test("a deleted quack can't be replied to or deleted again", async ({ browser }) => {
  const author = await signedInPage(browser, USERS.caffeinatedDuck)
  const quack = (await (
    await author.request.post(`${API}/quacks`, { data: { text: `E2E gone ${Date.now()}` } })
  ).json()) as { id: string }
  expect((await author.request.delete(`${API}/quacks/${quack.id}`)).status()).toBe(204)

  expect(
    (
      await author.request.post(`${API}/quacks/${quack.id}/replies`, { data: { text: "late" } })
    ).status(),
  ).toBe(404)
  expect((await author.request.delete(`${API}/quacks/${quack.id}`)).status()).toBe(404)
})
