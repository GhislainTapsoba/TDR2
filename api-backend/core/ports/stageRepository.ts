import { Stage } from "@/core/domain/Stage";

export interface StageRepository {
  findById(id: string): Promise<Stage | null>;
  save(stage: Stage): Promise<void>;
}
