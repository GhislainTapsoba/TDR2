import { db } from './db';

// Nettoyer les activités de la semaine précédente après l'envoi des rapports
export async function cleanupWeeklyActivities(): Promise<void> {
    try {
        console.log('🧹 Début du nettoyage des activités hebdomadaires...');

        // Supprimer les activités de plus de 7 jours
        const result = await db.query(
            `DELETE FROM activities 
             WHERE created_at < NOW() - INTERVAL '7 days'`
        );

        console.log(`✅ ${result.rowCount} activités anciennes supprimées`);
        
        // Optionnel: Archiver les statistiques avant suppression
        const stats = await db.query(
            `SELECT 
                COUNT(*) as total_activities,
                COUNT(DISTINCT user_id) as active_users,
                COUNT(CASE WHEN action = 'task_created' THEN 1 END) as tasks_created,
                COUNT(CASE WHEN action = 'task_updated' THEN 1 END) as tasks_updated,
                COUNT(CASE WHEN action = 'task_completed' THEN 1 END) as tasks_completed,
                COUNT(CASE WHEN action = 'project_created' THEN 1 END) as projects_created,
                COUNT(CASE WHEN action = 'user_created' THEN 1 END) as users_created
             FROM activities 
             WHERE created_at >= NOW() - INTERVAL '7 days'`
        );

        if (stats.rows[0]) {
            const weekStats = stats.rows[0];
            console.log('📊 Statistiques de la semaine écoulée:');
            console.log(`   - Total activités: ${weekStats.total_activities}`);
            console.log(`   - Utilisateurs actifs: ${weekStats.active_users}`);
            console.log(`   - Tâches créées: ${weekStats.tasks_created}`);
            console.log(`   - Tâches mises à jour: ${weekStats.tasks_updated}`);
            console.log(`   - Tâches terminées: ${weekStats.tasks_completed}`);
            console.log(`   - Projets créés: ${weekStats.projects_created}`);
            console.log(`   - Utilisateurs créés: ${weekStats.users_created}`);
        }

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage des activités:', error);
        throw error;
    }
}

// Alternative: Archiver dans une table séparée au lieu de supprimer
export async function archiveWeeklyActivities(): Promise<void> {
    try {
        console.log('📦 Archivage des activités hebdomadaires...');

        // Créer la table d'archive si elle n'existe pas
        await db.query(`
            CREATE TABLE IF NOT EXISTS activities_archive (
                id SERIAL PRIMARY KEY,
                user_id UUID,
                action VARCHAR(100),
                entity_type VARCHAR(50),
                entity_id INTEGER,
                description TEXT,
                created_at TIMESTAMP,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Déplacer les activités de plus de 7 jours vers l'archive
        const result = await db.query(`
            INSERT INTO activities_archive (user_id, action, entity_type, entity_id, description, created_at)
            SELECT user_id, action, entity_type, entity_id, description, created_at
            FROM activities
            WHERE created_at < NOW() - INTERVAL '7 days'
            RETURNING id
        `);

        // Supprimer les activités archivées
        await db.query(`
            DELETE FROM activities
            WHERE created_at < NOW() - INTERVAL '7 days'
        `);

        console.log(`✅ ${result.rowCount} activités archivées avec succès`);

    } catch (error) {
        console.error('❌ Erreur lors de l\'archivage des activités:', error);
        throw error;
    }
}
