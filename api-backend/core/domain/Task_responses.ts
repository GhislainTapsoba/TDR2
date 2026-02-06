// core/domain/Task_responses.ts
export class TaskResponse {
  constructor(
    public id: string,
    public task_id: string,
    public user_id: string,
    public response: string | null,
    public response_type: string | null, // or enum if available
    public created_at: Date | null
  ) {}
}
