import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks/[id]/responses - Get task responses
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
        const taskId = paramsResolved.id;

        const result = await db.query(
            `SELECT 
        tr.id,
        tr.task_id,
        tr.user_id,
        tr.response,
        tr.responded_at,
        tr.created_at,
        u.name as user_name,
        u.email as user_email
      FROM task_responses tr
      JOIN users u ON tr.user_id = u.id
      WHERE tr.task_id = $1
      ORDER BY tr.created_at DESC`,
            [taskId]
        );

        return corsResponse({ data: result.rows }, request);
    } catch (error: any) {
        console.error('Error fetching task responses:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}

// POST /api/tasks/[id]/responses - Create task response
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
        const taskId = paramsResolved.id;
        const { response } = await request.json();

        if (!response) {
            return corsResponse({ error: 'response requis' }, request, { status: 400 });
        }

        const result = await db.query(
            `INSERT INTO task_responses (task_id, user_id, response, responded_at, created_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
            [taskId, user.id, response]
        );

        return corsResponse({ data: result.rows[0] }, request, { status: 201 });
    } catch (error: any) {
        console.error('Error creating task response:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
