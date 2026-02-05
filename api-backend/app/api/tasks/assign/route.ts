import { NextResponse } from "next/server"
import { AssignTask } from "@/core/use-cases/AssignTask"
import { SupabaseTaskRepository } from "@/infrastructure/db/task.repository"

export async function POST(req: Request) {
  const { taskId, userId } = await req.json()

  const useCase = new AssignTask(new SupabaseTaskRepository())
  await useCase.execute(taskId, userId)

  return NextResponse.json({ success: true })
}
