import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canAccessProject } from '@/lib/permissions';

export async function GET(request: NextRequest) {
    try {
        // Get user from token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const tokenResult = await db.query(
            'SELECT user_id FROM tokens WHERE token = $1 AND expires_at > NOW()',
            [token]
        );

        if (tokenResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = tokenResult.rows[0].user_id;

        // Get recent activities
        const activitiesQuery = `
            SELECT 
                a.id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.description,
                a.created_at,
                u.name as user_name,
                u.email as user_email,
                CASE 
                    WHEN a.entity_type = 'project' THEN p.title
                    WHEN a.entity_type = 'stage' THEN s.name
                    WHEN a.entity_type = 'task' THEN t.title
                    ELSE NULL
                END as entity_title
            FROM activities a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN projects p ON a.entity_type = 'project' AND a.entity_id = p.id
            LEFT JOIN stages s ON a.entity_type = 'stage' AND a.entity_id = s.id
            LEFT JOIN tasks t ON a.entity_type = 'task' AND a.entity_id = t.id
            ORDER BY a.created_at DESC
            LIMIT 50
        `;

        const result = await db.query(activitiesQuery);

        return NextResponse.json({
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching activities:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
