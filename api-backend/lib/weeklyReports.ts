import { db } from './db';
import { sendEmail } from './email';
import { generateProjectReport, generateTeamReport, generateTasksReport, generateActivityReport } from './reportGenerator';
import { cleanupWeeklyActivities, archiveWeeklyActivities } from './activityCleanup';
import * as XLSX from 'xlsx';

// Générer les rapports spécifiques pour un manager
async function generateManagerReports(managerId: string) {
    try {
        console.log(`📊 Génération des rapports pour le manager ${managerId}`);

        // Récupérer les projets du manager
        const { rows: projects } = await db.query(`
            SELECT id FROM projects 
            WHERE manager_id = $1
        `, [managerId]);

        if (projects.length === 0) {
            console.log(`⚠️ Aucun projet trouvé pour le manager ${managerId}`);
            return {
                projects: "Aucun projet assigné",
                team: "Aucune équipe disponible",
                tasks: "Aucune tâche trouvée",
                activity: "Aucune activité récente"
            };
        }

        // Générer les rapports filtrés pour ce manager
        const reportsData = {
            projects: await generateProjectReport(), // Sera filtré dans la fonction
            team: await generateTeamReport(), // Sera filtré dans la fonction  
            tasks: await generateTasksReport(), // Sera filtré dans la fonction
            activity: await generateActivityReport(7) // Sera filtré dans la fonction
        };

        return reportsData;
    } catch (error) {
        console.error('❌ Erreur génération rapports manager:', error);
        throw error;
    }
}

// Générer et envoyer les rapports hebdomadaires automatiquement
export async function generateWeeklyReports(): Promise<void> {
    try {
        console.log('🔄 Génération des rapports hebdomadaires...');

        // Récupérer tous les managers et admins
        const { rows: users } = await db.query(`
            SELECT id, email, name, role 
            FROM users 
            WHERE role IN ('admin', 'manager') 
            AND is_active = true
        `);

        if (users.length === 0) {
            console.log('❌ Aucun manager ou admin trouvé');
            return;
        }

        // Envoyer les rapports à chaque utilisateur selon son rôle
        for (const user of users) {
            try {
                let reportsData: any;

                if (user.role === 'admin') {
                    // Admin reçoit TOUS les rapports
                    console.log(`📊 Génération des rapports complets pour l'admin ${user.email}`);
                    reportsData = {
                        projects: await generateProjectReport(),
                        team: await generateTeamReport(),
                        tasks: await generateTasksReport(),
                        activity: await generateActivityReport(7)
                    };
                } else if (user.role === 'manager') {
                    // Manager reçoit SEULEMENT les rapports de ses projets
                    console.log(`📊 Génération des rapports personnalisés pour le manager ${user.email}`);
                    reportsData = await generateManagerReports(user.id);
                } else {
                    console.log(`⚠️ Rôle non géré: ${user.role}`);
                    continue;
                }

                // Créer le contenu CSV simple et robuste
                const excelContent = generateExcelContent(reportsData);

                // Envoyer les rapports avec un email personnalisé selon le rôle
                await sendEmail({
                    to: user.email,
                    subject: `📊 Rapports Hebdomadaires - ${new Date().toLocaleDateString('fr-FR')}`,
                    html: generateWeeklyReportEmail(user.name, reportsData),
                    attachments: [{
                        filename: `rapports-hebdomadaires-${user.role}-${new Date().toISOString().split('T')[0]}.csv`,
                        content: excelContent.toString('utf-8'),
                        contentType: 'text/csv'
                    }]
                });

                console.log(`✅ Rapports envoyés à ${user.email} (${user.role})`);
            } catch (error) {
                console.error(`❌ Erreur envoi rapports à ${user.email}:`, error);
            }
        }

        console.log('✅ Rapports hebdomadaires générés et envoyés avec succès');

        // Nettoyer les activités de la semaine précédente
        const archiveActivities = process.env.ARCHIVE_WEEKLY_ACTIVITIES === 'true';

        if (archiveActivities) {
            console.log('📦 Archivage des activités...');
            await archiveWeeklyActivities();
        } else {
            console.log('🧹 Suppression des activités...');
            await cleanupWeeklyActivities();
        }

    } catch (error) {
        console.error('❌ Erreur génération rapports hebdomadaires:', error);
    }
}

// Générer le contenu CSV simple et robuste
function generateExcelContent(reportsData: any): Buffer {
    try {
        let csvContent = '';

        // En-tête principal avec BOM UTF-8 pour Excel
        csvContent += '\uFEFF';
        csvContent += 'Catégorie;Type;Métrique;Valeur\n';

        // Données Projets
        if (reportsData.projects && reportsData.projects !== 'Aucun projet trouvé pour générer un rapport.') {
            const projectData = extractDataFromReport(reportsData.projects, 'projects');
            projectData.forEach(item => {
                csvContent += `Projets;${item.type};${item.metric};${item.value}\n`;
            });
        }

        // Données Équipe
        if (reportsData.team && reportsData.team !== 'Aucune équipe trouvée pour générer un rapport.') {
            const teamData = extractDataFromReport(reportsData.team, 'team');
            teamData.forEach(item => {
                csvContent += `Équipe;${item.type};${item.metric};${item.value}\n`;
            });
        }

        // Données Tâches
        if (reportsData.tasks && reportsData.tasks !== 'Aucune tâche trouvée pour générer un rapport.') {
            const tasksData = extractDataFromReport(reportsData.tasks, 'tasks');
            tasksData.forEach(item => {
                csvContent += `Tâches;${item.type};${item.metric};${item.value}\n`;
            });
        }

        // Données Activité
        if (reportsData.activity && reportsData.activity !== 'Aucune activité trouvée pour générer un rapport.') {
            const activityData = extractDataFromReport(reportsData.activity, 'activity');
            activityData.forEach(item => {
                csvContent += `Activité;${item.type};${item.metric};${item.value}\n`;
            });
        }

        // S'assurer que le contenu est bien encodé en UTF-8
        return Buffer.from(csvContent, 'utf8');
    } catch (error) {
        console.error('❌ Erreur génération CSV:', error);
        return Buffer.from('\uFEFFCatégorie;Type;Métrique;Valeur\n', 'utf8');
    }
}

// Extraire les données réelles des rapports avec nettoyage complet
function extractDataFromReport(reportText: string, reportType: string): Array<{ type: string, metric: string, value: string }> {
    const data: Array<{ type: string, metric: string, value: string }> = [];

    // Nettoyer complètement le texte des caractères spéciaux
    const cleanReportText = reportText
        .replace(/[📊📋👥📈📝🔴🟡🟢⚠️📅⏰🏗️🎯📧©®™🆕✏️🔄]/g, '')
        .replace(/[^\w\sàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ%;.,\-\(\)\d]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Patterns d'extraction pour différents types de données
    const patterns = {
        projects: {
            total: { pattern: /total.*?(\d+)/i, type: 'Statistiques', metric: 'Total' },
            completed: { pattern: /termin.*?(\d+)/i, type: 'Statistiques', metric: 'Terminés' },
            inProgress: { pattern: /en cours.*?(\d+)/i, type: 'Statistiques', metric: 'En cours' },
            overdue: { pattern: /en retard.*?(\d+)/i, type: 'Statistiques', metric: 'En retard' },
            completionRate: { pattern: /taux.*?(\d+)%/i, type: 'Statistiques', metric: 'Taux de complétion (%)' },
            created: { pattern: /cré.*?(\d+)/i, type: 'Créations', metric: 'Projets créés' },
            updated: { pattern: /mis.*?jour.*?(\d+)/i, type: 'Mises à jour', metric: 'Projets mis à jour' }
        },
        team: {
            total: { pattern: /total.*?(\d+)/i, type: 'Membres', metric: 'Total' },
            active: { pattern: /actif.*?(\d+)/i, type: 'Membres', metric: 'Actifs' },
            inactive: { pattern: /inactif.*?(\d+)/i, type: 'Membres', metric: 'Inactifs' },
            created: { pattern: /cré.*?(\d+)/i, type: 'Créations', metric: 'Utilisateurs créés' },
            updated: { pattern: /mis.*?jour.*?(\d+)/i, type: 'Mises à jour', metric: 'Utilisateurs mis à jour' }
        },
        tasks: {
            total: { pattern: /total.*?(\d+)/i, type: 'Statistiques', metric: 'Total' },
            completed: { pattern: /termin.*?(\d+)/i, type: 'Statistiques', metric: 'Terminées' },
            inProgress: { pattern: /en cours.*?(\d+)/i, type: 'Statistiques', metric: 'En cours' },
            overdue: { pattern: /en retard.*?(\d+)/i, type: 'Statistiques', metric: 'En retard' },
            created: { pattern: /cré.*?(\d+)/i, type: 'Créations', metric: 'Tâches créées' },
            updated: { pattern: /mis.*?jour.*?(\d+)/i, type: 'Mises à jour', metric: 'Tâches mises à jour' },
            taskCompleted: { pattern: /termin.*?(\d+)/i, type: 'Actions', metric: 'Tâches terminées' }
        },
        activity: {
            total: { pattern: /total.*?(\d+)/i, type: 'Actions', metric: 'Total' },
            created: { pattern: /cré.*?(\d+)/i, type: 'Créations', metric: 'Éléments créés' },
            updated: { pattern: /mis.*?jour.*?(\d+)/i, type: 'Mises à jour', metric: 'Éléments mis à jour' },
            completed: { pattern: /termin.*?(\d+)/i, type: 'Actions', metric: 'Tâches terminées' },
            userActivity: { pattern: /actions.*?(\d+)/i, type: 'Utilisateurs', metric: 'Actions par utilisateur' }
        }
    };

    const currentPatterns = patterns[reportType as keyof typeof patterns] || {};
    const lines = cleanReportText.split('\n');

    for (const line of lines) {
        const cleanLine = line.trim();

        if (!cleanLine) continue;

        // Extraire les données avec les patterns
        for (const [key, config] of Object.entries(currentPatterns)) {
            const match = cleanLine.match(config.pattern);
            if (match) {
                data.push({
                    type: config.type,
                    metric: config.metric,
                    value: match[1]
                });
            }
        }
    }

    return data;
}

// Générer le contenu HTML de l'email
function generateWeeklyReportEmail(userName: string, reportsData: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #007bff; margin: 0; font-size: 28px; }
        .header p { color: #666; margin: 10px 0 0 0; font-size: 16px; }
        .report-section { margin-bottom: 30px; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; }
        .report-title { color: #007bff; font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #e9ecef; padding-bottom: 10px; }
        .report-preview { background-color: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #666; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Rapports Hebdomadaires</h1>
            <p>Bonjour ${userName || 'Utilisateur'},</p>
            <p>Voici les rapports détaillés de la semaine du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        </div>

        <div class="report-section">
            <div class="report-title">🏗️ Rapport Projets</div>
            <div class="report-preview">${reportsData.projects.substring(0, 500)}...</div>
        </div>

        <div class="report-section">
            <div class="report-title">👥 Rapport Équipe</div>
            <div class="report-preview">${reportsData.team.substring(0, 500)}...</div>
        </div>

        <div class="report-section">
            <div class="report-title">📋 Rapport Tâches</div>
            <div class="report-preview">${reportsData.tasks.substring(0, 500)}...</div>
        </div>

        <div class="report-section">
            <div class="report-title">📈 Rapport Activité</div>
            <div class="report-preview">${reportsData.activity.substring(0, 500)}...</div>
        </div>

        <div class="footer">
            <p>📎 Le fichier Excel complet est joint à cet email.</p>
            <p>Vous pouvez consulter les rapports détaillés à tout moment dans l'application.</p>
            <p>Cordialement,<br>L'équipe TDR2</p>
        </div>
    </div>
</body>
</html>
    `;
}
