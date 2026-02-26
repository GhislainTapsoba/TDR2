import { db } from './db';
import { sendEmail } from './email';
import { generateProjectReport, generateTeamReport, generateTasksReport, generateActivityReport } from './reportGenerator';

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

        // Générer les différents rapports
        const reportsData = {
            projects: await generateProjectReport(),
            team: await generateTeamReport(),
            tasks: await generateTasksReport(),
            activity: await generateActivityReport(7)
        };

        // Créer le contenu Excel en format CSV simple
        const excelContent = generateExcelContent(reportsData);

        // Envoyer les rapports à chaque utilisateur
        for (const user of users) {
            try {
                await sendEmail({
                    to: user.email,
                    subject: `📊 Rapports Hebdomadaires - ${new Date().toLocaleDateString('fr-FR')}`,
                    html: generateWeeklyReportEmail(user.name, reportsData),
                    attachments: [{
                        filename: `rapports-hebdomadaires-${new Date().toISOString().split('T')[0]}.csv`,
                        content: excelContent,
                        contentType: 'text/csv'
                    }]
                });

                console.log(`✅ Rapports envoyés à ${user.email} (${user.role})`);
            } catch (error) {
                console.error(`❌ Erreur envoi rapports à ${user.email}:`, error);
            }
        }

        console.log('✅ Rapports hebdomadaires générés et envoyés avec succès');

    } catch (error) {
        console.error('❌ Erreur génération rapports hebdomadaires:', error);
    }
}

// Générer le contenu Excel (CSV) pour les rapports
function generateExcelContent(reportsData: any): string {
    let csvContent = '';

    // En-tête du fichier CSV
    csvContent += 'Type de Rapport,Donnée,Valeur\n';

    // Rapport Projets
    const projectsLines = extractReportData(reportsData.projects, 'Projets');
    csvContent += projectsLines;

    // Rapport Équipe
    const teamLines = extractReportData(reportsData.team, 'Équipe');
    csvContent += teamLines;

    // Rapport Tâches
    const tasksLines = extractReportData(reportsData.tasks, 'Tâches');
    csvContent += tasksLines;

    // Rapport Activité
    const activityLines = extractReportData(reportsData.activity, 'Activité');
    csvContent += activityLines;

    return csvContent;
}

// Extraire les données d'un rapport pour le format CSV
function extractReportData(reportText: string, reportType: string): string {
    const lines = reportText.split('\n');
    let csvLines = '';
    let inDataSection = false;

    for (const line of lines) {
        if (line.includes('**') && line.includes(':')) {
            inDataSection = true;
            continue;
        }

        if (inDataSection && line.trim()) {
            // Nettoyer la ligne pour le CSV
            const cleanLine = line.replace(/[📊📋👥📈📝🔴🟡🟢⚠️📅⏰]/g, '').trim();

            if (cleanLine && !cleanLine.startsWith('•') && !cleanLine.startsWith('-')) {
                // Extraire la clé et la valeur
                const colonIndex = cleanLine.indexOf(':');
                if (colonIndex > 0) {
                    const key = cleanLine.substring(0, colonIndex).trim();
                    const value = cleanLine.substring(colonIndex + 1).trim();
                    csvLines += `${reportType},${key},"${value}"\n`;
                }
            }
        }
    }

    return csvLines;
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
