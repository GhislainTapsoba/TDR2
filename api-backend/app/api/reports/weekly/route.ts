import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { requirePermission } from '@/lib/permissions';
import { generateWeeklyReports } from '@/lib/weeklyReports';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

export async function POST(request: NextRequest) {
    try {
        // Vérifier l'authentification et les permissions
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = user.role === 'admin' ? 'admin' : 'manager';
        const perm = await requirePermission(userRole, 'reports', 'create');
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        console.log(`📊 Génération manuelle des rapports hebdomadaires par ${user.email} (${user.role})`);

        // Générer et envoyer les rapports
        await generateWeeklyReports();

        return corsResponse({
            success: true,
            message: 'Rapports hebdomadaires générés et envoyés avec succès'
        }, request);

    } catch (error) {
        console.error('POST /api/reports/weekly error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
