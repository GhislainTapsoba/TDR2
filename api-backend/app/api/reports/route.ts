import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { sendWhatsApp } from '@/lib/email';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// GET /api/reports - Get all reports
export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const { rows } = await db.query(
            'SELECT * FROM reports ORDER BY created_at DESC'
        );

        return corsResponse(rows, request);
    } catch (error) {
        console.error('GET /api/reports error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const body = await request.json();
        const { title, content, type } = body;

        if (!title || !content) {
            return corsResponse({ error: 'Titre et contenu requis' }, request, { status: 400 });
        }

        const { rows } = await db.query(
            'INSERT INTO reports (title, description, type, created_by_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [title, content, type, user.id]
        );

        // Envoyer une notification WhatsApp pour le nouveau rapport
        try {
            // Récupérer le téléphone de l'utilisateur qui a créé le rapport
            const { rows: userRows } = await db.query(
                'SELECT phone FROM users WHERE id = $1',
                [user.id]
            );

            if (userRows.length > 0 && userRows[0].phone) {
                const message = `📊 *Nouveau rapport créé*

📋 *Titre:* ${title}
📝 *Type:* ${type || 'Général'}
👤 *Créé par:* ${user.email}

---
*Le rapport a été enregistré avec succès dans le système.*`;

                await sendWhatsApp({
                    to: userRows[0].phone,
                    message
                });

                console.log('✅ WhatsApp notification sent for new report:', title);
            }
        } catch (whatsappError) {
            console.error('❌ Failed to send WhatsApp notification for report:', whatsappError);
        }

        return corsResponse(rows[0], request, { status: 201 });
    } catch (error) {
        console.error('POST /api/reports error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
