import { expect, test, type Browser } from "@playwright/test"

import { signIn, USERS } from "./signIn"

async function signedInPage(browser: Browser, user: { email: string; password: string }) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, user)
  return page
}

// cases.md, E1: sign in, like, see 1
test("like a quack: the heart shows 1 for me, stays after a reload, others see it too", async ({
  browser,
}) => {
  const text = `E2E like me ${Date.now()}`

  const me = await signedInPage(browser, USERS.caffeinatedDuck)
  await me.goto("/quacks")
  await me.getByLabel("Post context or text").fill(text)
  await me.getByRole("button", { name: "Quack", exact: true }).click()
  const myQuack = me.getByRole("article").filter({ hasText: text })
  const myHeart = myQuack.getByRole("button", { name: /^Like/ })
  await expect(myHeart).toHaveAttribute("aria-pressed", "false")
  await expect(myHeart).toHaveText("0")

  await myHeart.click()

  await expect(myHeart).toHaveAttribute("aria-pressed", "true")
  await expect(myHeart).toHaveText("1")

  await me.reload()
  await expect(myHeart).toHaveAttribute("aria-pressed", "true")
  await expect(myHeart).toHaveText("1")

  const other = await signedInPage(browser, USERS.deepDuckThoughts)
  await other.goto("/quacks")
  const theirHeart = other
    .getByRole("article")
    .filter({ hasText: text })
    .getByRole("button", { name: /^Like/ })
  await expect(theirHeart).toHaveAttribute("aria-pressed", "false")
  await expect(theirHeart).toHaveText("1")

  await myHeart.click()

  await expect(myHeart).toHaveAttribute("aria-pressed", "false")
  await expect(myHeart).toHaveText("0")
})
