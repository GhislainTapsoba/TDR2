import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { db } from '@/lib/db';
import {
    generateProjectReport,
    generateTeamReport,
    generateTasksReport,
    generateActivityReport
} from '@/lib/reportGenerator';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/reports/generate - Generate automated reports
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        // Vérifier si l'utilisateur a les permissions (admin ou manager)
        if (user.role !== 'admin' && user.role !== 'manager') {
            return corsResponse({ error: 'Permissions insuffisantes' }, request, { status: 403 });
        }

        const body = await request.json();
        const { type, projectId, days } = body;

        let reportContent = '';
        let reportTitle = '';

        switch (type) {
            case 'projects':
                reportContent = await generateProjectReport(projectId);
                reportTitle = projectId ? `Rapport du projet ${projectId}` : 'Rapport de tous les projets';
                break;

            case 'team':
                reportContent = await generateTeamReport();
                reportTitle = 'Rapport d\'équipe';
                break;

            case 'tasks':
                reportContent = await generateTasksReport();
                reportTitle = 'Rapport des tâches';
                break;

            case 'activity':
                reportContent = await generateActivityReport(days || 7);
                reportTitle = `Rapport d'activité (${days || 7} derniers jours)`;
                break;

            default:
                return corsResponse({ error: 'Type de rapport non valide' }, request, { status: 400 });
        }

        // Sauvegarder le rapport dans la base de données
        const { rows } = await db.query(
            'INSERT INTO reports (title, description, type, created_by_id, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [reportTitle, reportContent, type, user.id]
        );

        return corsResponse({
            success: true,
            report: rows[0],
            message: 'Rapport généré avec succès'
        }, request);

    } catch (error) {
        console.error('POST /api/reports/generate error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
