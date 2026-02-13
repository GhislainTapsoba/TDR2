import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
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

        // Create some test activities
        const testActivities = [
            {
                user_id: userId,
                action: 'created',
                entity_type: 'project',
                entity_id: '00000000-0000-0000-0000-000000000001', // UUID example
                details: { description: 'Création du projet de test' }
            },
            {
                user_id: userId,
                action: 'updated',
                entity_type: 'task',
                entity_id: '00000000-0000-0000-0000-000000000002', // UUID example
                details: { description: 'Mise à jour de la tâche de test' }
            },
            {
                user_id: userId,
                action: 'completed',
                entity_type: 'task',
                entity_id: '00000000-0000-0000-0000-000000000003', // UUID example
                details: { description: 'Tâche terminée avec succès' }
            }
        ];

        for (const activity of testActivities) {
            await db.query(
                'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
                [activity.user_id, activity.action, activity.entity_type, activity.entity_id, JSON.stringify(activity.details)]
            );
        }

        return NextResponse.json({
            message: 'Test activities created successfully',
            count: testActivities.length
        });

    } catch (error) {
        console.error('Error creating test activities:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
