// core/domain/Task_assignees.ts
export class TaskAssignee {
  constructor(
    public task_id: string,
    public user_id: string
  ) {}
}
