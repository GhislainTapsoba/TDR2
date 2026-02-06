// core/domain/Project_members.ts
export class ProjectMember {
  constructor(
    public project_id: string,
    public user_id: string,
    public role_id: string
  ) {}
}
