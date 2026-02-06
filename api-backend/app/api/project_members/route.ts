import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/project_members - Get project members
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('project_id');

        if (!projectId) {
            return corsResponse({ error: 'project_id requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            `SELECT pm.*, u.name, u.email, r.name as role_name
             FROM project_members pm
             JOIN users u ON pm.user_id = u.id
             JOIN roles r ON pm.role_id = r.id
             WHERE pm.project_id = $1`,
            [projectId]
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/project_members error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/project_members - Add project member
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'projects', 'update');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { project_id, user_id, role_id } = body;

        if (!project_id || !user_id || !role_id) {
            return corsResponse({ error: 'project_id, user_id et role_id requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            'INSERT INTO project_members (project_id, user_id, role_id) VALUES ($1, $2, $3) RETURNING *',
            [project_id, user_id, role_id]
        );

        return corsResponse(rows[0], request);
    } catch (error) {
        console.error('POST /api/project_members error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
