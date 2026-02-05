import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/email-reject - Reject task via email link
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return corsResponse({ error: 'Token manquant' }, request, { status: 400 });
        }

        // Find confirmation
        const { rows } = await db.query(
            `SELECT * FROM email_confirmations WHERE token = $1 AND confirmed = false AND expires_at > NOW()`,
            [token]
        );

        if (rows.length === 0) {
            return corsResponse({ error: 'Token invalide ou expiré' }, request, { status: 404 });
        }

        const confirmation = rows[0];

        // Check if user already accepted this task
        const existingResponse = await db.query(
            `SELECT response FROM task_responses 
             WHERE task_id = $1 AND user_id = $2 
             ORDER BY responded_at DESC LIMIT 1`,
            [confirmation.entity_id, confirmation.user_id]
        );

        // If user already accepted, prevent rejection
        if (existingResponse.rows.length > 0) {
            const previousResponse = existingResponse.rows[0].response;

            if (previousResponse === 'ACCEPTED') {
                return corsResponse({
                    error: 'Vous avez déjà accepté cette tâche. Vous ne pouvez plus la refuser.'
                }, request, { status: 409 });
            }

            // If already rejected, just confirm (idempotent)
            if (previousResponse === 'REJECTED') {
                await db.query(
                    `UPDATE email_confirmations SET confirmed = true, confirmed_at = NOW() WHERE id = $1`,
                    [confirmation.id]
                );
                return corsResponse({
                    success: true,
                    message: 'Vous avez déjà refusé cette tâche.',
                    entity_type: confirmation.entity_type,
                    entity_id: confirmation.entity_id,
                }, request);
            }
        }

        // Mark as confirmed
        await db.query(
            `UPDATE email_confirmations SET confirmed = true, confirmed_at = NOW() WHERE id = $1`,
            [confirmation.id]
        );

        // Create task response record
        await db.query(
            `INSERT INTO task_responses (task_id, user_id, response, responded_at, created_at)
             VALUES ($1, $2, 'REJECTED', NOW(), NOW())`,
            [confirmation.entity_id, confirmation.user_id]
        );

        // Update task status to REJECTED
        await db.query(
            `UPDATE tasks SET status = 'REJECTED' WHERE id = $1`,
            [confirmation.entity_id]
        );

        return corsResponse({
            success: true,
            message: 'Tâche refusée avec succès',
            entity_type: confirmation.entity_type,
            entity_id: confirmation.entity_id,
            metadata: confirmation.metadata,
        }, request);
    } catch (error) {
        console.error('GET /api/email-reject error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
