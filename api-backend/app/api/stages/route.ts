import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/stages - Get all stages
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const project_id = searchParams.get('project_id');

        let query = `
      SELECT s.*, p.title as project_title, c.name as created_by_name
      FROM stages s
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users c ON s.created_by_id = c.id
    `;

        const params: any[] = [];
        if (project_id) {
            query += ' WHERE s.project_id = $1';
            params.push(project_id);
        }

        query += ' ORDER BY s.project_id, s."order"';

        const { rows } = await db.query(query, params);

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/stages error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/stages - Create a new stage
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'stages', 'create');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { name, description, order = 0, duration, status = 'PENDING', project_id } = body;

        if (!name || !project_id) {
            return corsResponse({ error: 'Le nom et le project_id sont requis' }, request, { status: 400 });
        }

        // Verify project exists
        const { rows: projectRows } = await db.query(
            'SELECT id FROM projects WHERE id = $1',
            [project_id]
        );

        if (projectRows.length === 0) {
            return corsResponse({ error: 'Projet introuvable' }, request, { status: 404 });
        }

        const { rows } = await db.query(
            `INSERT INTO stages (name, description, "order", duration, status, project_id, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [name, description || null, order, duration || null, status, project_id, user.id]
        );

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/stages error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
