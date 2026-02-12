import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/projects/[id]/members - Get project members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const paramsResolved = await params;
        const projectId = paramsResolved.id;

        // Get project members with user details
        const result = await db.query(
            `SELECT 
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.role_id,
        pm.joined_at,
        u.name as user_name,
        u.email as user_email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.joined_at DESC`,
            [projectId]
        );

        return corsResponse({ data: result.rows }, request);
    } catch (error: any) {
        console.error('Error fetching project members:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}

// POST /api/projects/[id]/members - Add multiple members to project
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const paramsResolved = await params;
        const projectId = paramsResolved.id;
        const { member_ids } = await request.json();

        if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
            return corsResponse({ error: 'IDs des membres requis' }, request, { status: 400 });
        }

        // Check if user is project manager or admin
        const projectCheck = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectCheck.rows.length === 0) {
            return corsResponse({ error: 'Projet non trouvé' }, request, { status: 404 });
        }

        const isManager = projectCheck.rows[0].manager_id === user.id;
        const isAdmin = user.role === 'admin';

        if (!isManager && !isAdmin) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // Add multiple members
        const values = member_ids.map((memberId: string, index: number) =>
            `($1, $${index + 2}, NULL, NOW())`
        ).join(', ');

        const queryParams = [projectId, ...member_ids];

        const result = await db.query(
            `INSERT INTO project_members (project_id, user_id, role_id, joined_at)
             VALUES ${values}
             ON CONFLICT (project_id, user_id) DO NOTHING
             RETURNING *`,
            queryParams
        );

        return corsResponse(result.rows, request, { status: 201 });
    } catch (error) {
        console.error('POST /api/projects/[id]/members error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
