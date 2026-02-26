import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { handleCorsOptions, corsResponse } from '@/lib/cors';
import { mapDbRoleToUserRole, requirePermission } from '@/lib/permissions';
import { cleanupWeeklyActivities, archiveWeeklyActivities } from '@/lib/activityCleanup';

export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

// POST /api/admin/cleanup-activities - Nettoyer les activités (admin only)
export async function POST(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return corsResponse({ error: 'Non autorisé' }, request, { status: 401 });
        }

        const userRole = mapDbRoleToUserRole(user.role);
        const perm = await requirePermission(userRole, 'users', 'update'); // Utiliser la permission users comme référence
        if (!perm.allowed) {
            return corsResponse({ error: perm.error }, request, { status: 403 });
        }

        const body = await request.json();
        const { archive = false } = body;

        console.log(`🧹 Nettoyage manuel des activités demandé par ${user.email}`);

        if (archive) {
            await archiveWeeklyActivities();
            return corsResponse({ 
                message: 'Activités archivées avec succès',
                action: 'archived'
            }, request);
        } else {
            await cleanupWeeklyActivities();
            return corsResponse({ 
                message: 'Activités supprimées avec succès',
                action: 'deleted'
            }, request);
        }

    } catch (error) {
        console.error('POST /api/admin/cleanup-activities error:', error);
        return corsResponse({ error: 'Erreur serveur' }, request, { status: 500 });
    }
}
