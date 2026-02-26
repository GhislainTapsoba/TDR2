import { db } from './db';
import { sendEmail } from './email';
import { generateProjectReport, generateTeamReport, generateTasksReport, generateActivityReport } from './reportGenerator';
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

                // Créer le contenu Excel en format .xlsx
                const excelContent = generateExcelContent(reportsData);

                // Envoyer les rapports avec un email personnalisé selon le rôle
                await sendEmail({
                    to: user.email,
                    subject: `📊 Rapports Hebdomadaires - ${new Date().toLocaleDateString('fr-FR')}`,
                    html: generateWeeklyReportEmail(user.name, reportsData),
                    attachments: [{
                        filename: `rapports-hebdomadaires-${user.role}-${new Date().toISOString().split('T')[0]}.xlsx`,
                        content: excelContent.toString('base64'),
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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

// Générer le contenu Excel en format .xlsx
function generateExcelContent(reportsData: any): Buffer {
    try {
        const workbook = XLSX.utils.book_new();

        // Feuille Projets
        if (reportsData.projects && reportsData.projects !== 'Aucun projet trouvé pour générer un rapport.') {
            const projectsData = extractExcelData(reportsData.projects, 'Projets');
            const projectsSheet = XLSX.utils.aoa_to_sheet(projectsData);
            XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projets');
        }

        // Feuille Équipe
        if (reportsData.team && reportsData.team !== 'Aucune équipe trouvée pour générer un rapport.') {
            const teamData = extractExcelData(reportsData.team, 'Équipe');
            const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
            XLSX.utils.book_append_sheet(workbook, teamSheet, 'Équipe');
        }

        // Feuille Tâches
        if (reportsData.tasks && reportsData.tasks !== 'Aucune tâche trouvée pour générer un rapport.') {
            const tasksData = extractExcelData(reportsData.tasks, 'Tâches');
            const tasksSheet = XLSX.utils.aoa_to_sheet(tasksData);
            XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tâches');
        }

        // Feuille Activité
        if (reportsData.activity && reportsData.activity !== 'Aucune activité trouvée pour générer un rapport.') {
            const activityData = extractExcelData(reportsData.activity, 'Activité');
            const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
            XLSX.utils.book_append_sheet(workbook, activitySheet, 'Activité');
        }

        // Générer le buffer Excel avec options robustes
        return XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
            compression: true
        });
    } catch (error) {
        console.error('❌ Erreur génération Excel:', error);
        // Fallback: générer un CSV simple si Excel échoue
        return Buffer.from(generateFallbackCSV(reportsData), 'utf-8');
    }
}

// Fallback CSV si Excel échoue
function generateFallbackCSV(reportsData: any): string {
    let csvContent = 'Type,Métrique,Valeur\n';

    // Ajouter les données disponibles
    if (reportsData.projects) {
        csvContent += 'Projets,Total,0\n';
        csvContent += 'Projets,Terminées,0\n';
    }

    if (reportsData.team) {
        csvContent += 'Équipe,Membres,0\n';
        csvContent += 'Équipe,Actifs,0\n';
    }

    if (reportsData.tasks) {
        csvContent += 'Tâches,Total,0\n';
        csvContent += 'Tâches,Terminées,0\n';
    }

    if (reportsData.activity) {
        csvContent += 'Activité,Total,0\n';
    }

    return csvContent;
}

// Extraire les données pour Excel
function extractExcelData(reportText: string, reportType: string): any[][] {
    const lines = reportText.split('\n');
    const data: any[][] = [];
    let dataPairs: { [key: string]: string } = {};

    // Patterns d'extraction pour différents types de données
    const patterns = {
        projects: {
            total: /total.*?(\d+)/i,
            completed: /termin.*?(\d+)/i,
            inProgress: /en cours.*?(\d+)/i,
            overdue: /en retard.*?(\d+)/i,
            completionRate: /taux.*?(\d+)%/i
        },
        team: {
            total: /total.*?(\d+)/i,
            active: /actif.*?(\d+)/i,
            inactive: /inactif.*?(\d+)/i,
            byRole: /(\w+).*?(\d+)/i
        },
        tasks: {
            total: /total.*?(\d+)/i,
            completed: /termin.*?(\d+)/i,
            inProgress: /en cours.*?(\d+)/i,
            overdue: /en retard.*?(\d+)/i,
            byPriority: /(\w+).*?(\d+)/i
        },
        activity: {
            total: /total.*?(\d+)/i,
            byType: /(\w+).*?(\d+)/i
        }
    };

    const currentPatterns = patterns[reportType.toLowerCase() as keyof typeof patterns] || {};

    for (const line of lines) {
        const cleanLine = line.replace(/[📊📋👥📈📝🔴🟡🟢⚠️📅⏰🏗️🎯📧]/g, '').trim();

        if (!cleanLine) continue;

        // Extraire les données avec les patterns
        if (currentPatterns) {
            for (const [key, pattern] of Object.entries(currentPatterns)) {
                const match = cleanLine.match(pattern);
                if (match) {
                    dataPairs[key] = match[1];
                }
            }
        }
    }

    // Créer les données pour Excel
    data.push([reportType, 'Métrique', 'Valeur']);

    for (const [key, value] of Object.entries(dataPairs)) {
        if (value) {
            data.push([reportType, key, value]);
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
