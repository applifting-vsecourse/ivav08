import { api } from "@/lib/api-client"

export async function deleteQuack(quackId: string): Promise<void> {
  await api.delete(`quacks/${quackId}`)
}
