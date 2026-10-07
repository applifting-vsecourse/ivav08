export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: (search = "") => [...quackKeys.all(), "list", search] as const,
}
