import { db } from './db';

export type UserRole = 'admin' | 'manager' | 'employee';
export type ResourceType = 'users' | 'projects' | 'stages' | 'tasks' | 'notifications' | 'settings' | 'documents' | 'permissions' | 'roles';
export type ActionType = 'create' | 'read' | 'update' | 'delete';

interface PermissionCheck {
    allowed: boolean;
    error?: string;
}

/**
 * Map database role to application role
 */
export function mapDbRoleToUserRole(dbRole: string | null): UserRole {
    if (!dbRole) return 'employee';
    const role = dbRole.toLowerCase();
    if (role === 'admin' || role === 'administrator') return 'admin';
    if (role === 'manager' || role === 'chef de projet') return 'manager';
    return 'employee';
}

/**
 * Check if a user has permission to perform an action on a resource
 */
export async function requirePermission(
    userRole: UserRole,
    resource: ResourceType,
    action: ActionType
): Promise<PermissionCheck> {
    // Admin has all permissions
    if (userRole === 'admin') {
        return { allowed: true };
    }

    // Define permission matrix
    const permissions: Record<UserRole, Record<ResourceType, ActionType[]>> = {
        admin: {
            users: ['create', 'read', 'update', 'delete'],
            projects: ['create', 'read', 'update', 'delete'],
            stages: ['create', 'read', 'update', 'delete'],
            tasks: ['create', 'read', 'update', 'delete'],
            notifications: ['create', 'read', 'update', 'delete'],
            settings: ['create', 'read', 'update', 'delete'],
            documents: ['create', 'read', 'update', 'delete'],
            permissions: ['read'],
            roles: ['read'],
        },
        manager: {
            users: ['read'],
            projects: ['create', 'read', 'update', 'delete'],
            stages: ['create', 'read', 'update', 'delete'],
            tasks: ['create', 'read', 'update', 'delete'],
            notifications: ['read', 'update', 'delete'],
            settings: ['read', 'update'],
            documents: ['create', 'read', 'update', 'delete'],
            permissions: [],
            roles: [],
        },
        employee: {
            users: ['read'],
            projects: ['read'],
            stages: ['read', 'update'],
            tasks: ['read', 'update'],
            notifications: ['read', 'update', 'delete'],
            settings: ['read', 'update'],
            documents: ['read', 'update'],
            permissions: [],
            roles: [],
        },
    };

    const rolePermissions = permissions[userRole];
    if (!rolePermissions || !rolePermissions[resource]) {
        return { allowed: false, error: 'Permission denied' };
    }

    const allowedActions = rolePermissions[resource];
    if (!allowedActions.includes(action)) {
        return { allowed: false, error: `You don't have permission to ${action} ${resource}` };
    }

    return { allowed: true };
}

/**
 * Check if a user can manage a specific project
 */
export function canManageProject(userRole: UserRole, userId: string, projectManagerId: string | null): boolean {
    if (userRole === 'admin') return true;
    if (userRole === 'manager' && userId === projectManagerId) return true;
    return false;
}

/**
 * Check if a user can work on a specific project (for employees)
 */
export async function canWorkOnProject(userId: string, projectId: string): Promise<boolean> {
    // For admins and managers, use existing logic
    const userResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) return false;

    const userRole = mapDbRoleToUserRole(userResult.rows[0].role);

    if (userRole === 'admin') return true;

    // For managers, check if they manage this project
    if (userRole === 'manager') {
        const projectResult = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [projectId]
        );
        return projectResult.rows.length > 0 && projectResult.rows[0].manager_id === userId;
    }

    // For employees, check if they are members of the project
    const memberResult = await db.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
    );

    return memberResult.rows.length > 0;
}

/**
 * Check if a user can access a specific project
 */
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
    // First check if user is admin
    const userResult = await db.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
        return true;
    }

    // For non-admin users, check project access
    const { rows } = await db.query(
        `SELECT 1 FROM projects p
     WHERE p.id = $1
       AND (p.manager_id = $2 OR p.created_by_id = $2
            OR EXISTS (
              SELECT 1 FROM tasks t
              JOIN task_assignees ta ON t.id = ta.task_id
              WHERE t.project_id = p.id AND ta.user_id = $2
            )
            OR EXISTS (
              SELECT 1 FROM project_members pm
              WHERE pm.project_id = p.id AND pm.user_id = $2
            ))
     LIMIT 1`,
        [projectId, userId]
    );
    return rows.length > 0;
}
