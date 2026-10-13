export const QUACK_MOODS = ["happy", "sad", "angry", "silly"] as const

export type QuackMood = (typeof QUACK_MOODS)[number]
