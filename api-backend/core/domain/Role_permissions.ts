// core/domain/Role_permissions.ts
export class RolePermission {
  constructor(
    public role_id: string,
    public permission_id: string
  ) {}
}
