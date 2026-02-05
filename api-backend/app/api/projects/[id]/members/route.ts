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
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return corsResponse({ error: 'Non authentifié' }, request, { status: 401 });
        }

        const projectId = params.id;

        // Get project members with user details
        const result = await db.query(
            `SELECT 
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.role,
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

// POST /api/projects/[id]/members - Add member to project
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.authenticated || !authResult.user) {
            return corsResponse({ error: 'Non authentifié' }, request, { status: 401 });
        }

        const projectId = params.id;
        const { user_id, role = 'member' } = await request.json();

        if (!user_id) {
            return corsResponse({ error: 'user_id requis' }, request, { status: 400 });
        }

        // Check if user is project manager or admin
        const projectCheck = await db.query(
            'SELECT manager_id FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectCheck.rows.length === 0) {
            return corsResponse({ error: 'Projet non trouvé' }, request, { status: 404 });
        }

        const isManager = projectCheck.rows[0].manager_id === authResult.user.id;
        const isAdmin = authResult.user.role === 'admin';

        if (!isManager && !isAdmin) {
            return corsResponse({ error: 'Permission refusée' }, request, { status: 403 });
        }

        // Check if member already exists
        const existingMember = await db.query(
            'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, user_id]
        );

        if (existingMember.rows.length > 0) {
            return corsResponse({ error: 'Membre déjà ajouté' }, request, { status: 400 });
        }

        // Add member
        const result = await db.query(
            `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
            [projectId, user_id, role]
        );

        return corsResponse({ data: result.rows[0] }, request, { status: 201 });
    } catch (error: any) {
        console.error('Error adding project member:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
