import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { corsResponse, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/tasks/[id]/reminders - Get task reminders
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
        tr.reminder_type,
        tr.sent_at,
        tr.created_at
      FROM task_reminders tr
      WHERE tr.task_id = $1
      ORDER BY tr.created_at DESC`,
            [taskId]
        );

        return corsResponse({ data: result.rows }, request);
    } catch (error: any) {
        console.error('Error fetching task reminders:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}

// POST /api/tasks/[id]/reminders - Create task reminder
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
        const { reminder_type = 'EMAIL' } = await request.json();

        // Validate reminder_type
        const validTypes = ['EMAIL', 'SMS', 'WHATSAPP', 'ALL'];
        if (!validTypes.includes(reminder_type)) {
            return corsResponse({
                error: `Type invalide: ${reminder_type}. Types valides: ${validTypes.join(', ')}`
            }, request, { status: 400 });
        }

        // Create reminder
        const result = await db.query(
            `INSERT INTO task_reminders (task_id, reminder_type, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
            [taskId, reminder_type]
        );

        return corsResponse({ data: result.rows[0] }, request, { status: 201 });
    } catch (error: any) {
        console.error('Error creating task reminder:', error);
        return corsResponse({ error: error.message }, request, { status: 500 });
    }
}
