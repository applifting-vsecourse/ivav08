import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ProfileSettingsForm } from "@/features/settings/components/ProfileSettingsForm"

const user = {
  id: "u1",
  email: "mira@example.com",
  name: "Mira Example",
  username: "mira.example",
  bio: "A short bio",
  defaultMood: "happy",
}

describe("ProfileSettingsForm", () => {
  it("starts with the saved profile values", () => {
    render(
      <ProfileSettingsForm
        user={user}
        isSaving={false}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole("textbox", { name: "Username" })).toHaveValue("mira.example")
    expect(screen.getByRole("textbox", { name: "Display name" })).toHaveValue("Mira Example")
    expect(screen.getByRole("textbox", { name: "Bio" })).toHaveValue("A short bio")
    expect(screen.getByRole("combobox", { name: "Default mood" })).toHaveTextContent("Happy")
  })

  it("discards edits and restores the saved values", async () => {
    render(
      <ProfileSettingsForm
        user={user}
        isSaving={false}
        onSave={vi.fn()}
      />,
    )

    const name = screen.getByRole("textbox", { name: "Display name" })
    await userEvent.clear(name)
    await userEvent.type(name, "A different name")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    expect(name).toHaveValue("Mira Example")
  })

  it("shows a taken username beside the field and keeps the draft", async () => {
    const onSave = vi.fn().mockRejectedValue(
      Object.assign(new Error("Username is already taken"), {
        code: "USERNAME_IS_ALREADY_TAKEN",
      }),
    )
    render(
      <ProfileSettingsForm
        user={user}
        isSaving={false}
        onSave={onSave}
      />,
    )

    const username = screen.getByRole("textbox", { name: "Username" })
    await userEvent.clear(username)
    await userEvent.type(username, "taken.name")
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }))

    expect(await screen.findByText("That username is already taken")).toBeInTheDocument()
    expect(username).toHaveValue("taken.name")
  })
})
