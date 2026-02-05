import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/role-permissions - Get role permissions mapping
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'permissions', 'read');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const role_id = searchParams.get('role_id');

        let query = `
      SELECT rp.*, r.name as role_name, p.name as permission_name, p.resource, p.action
      FROM role_permissions rp
      LEFT JOIN roles r ON rp.role_id = r.id
      LEFT JOIN permissions p ON rp.permission_id = p.id
    `;

        const params: any[] = [];

        if (role_id) {
            query += ' WHERE rp.role_id = $1';
            params.push(role_id);
        }

        query += ' ORDER BY r.name, p.resource, p.action';

        const { rows } = await db.query(query, params);

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/role-permissions error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
