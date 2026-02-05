import { NextResponse } from "next/server";
import { ValidateStage } from "@/core/use-cases/ValidateStage";
import { SupabaseStageRepository } from "@/infrastructure/db/repositories/stage.repository";
import { SupabaseTaskRepository } from "@/infrastructure/db/repositories/task.repository";
import { EmailNotificationAdapter } from "@/infrastructure/mail/EmailNotificationAdapter";
import { TaskGenerationService } from "@/core/services/TaskGenerationService";

export async function POST(req: Request) {
  const { stageId, actorId } = await req.json();

  const useCase = new ValidateStage(
    new SupabaseStageRepository(),
    new SupabaseTaskRepository(),
    new EmailNotificationAdapter(),
    new TaskGenerationService()
  );

  await useCase.execute(stageId, actorId);

  return NextResponse.json({ success: true });
}
