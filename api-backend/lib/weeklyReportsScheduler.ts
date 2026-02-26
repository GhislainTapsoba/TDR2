import { generateWeeklyReports } from './weeklyReports';

// Démarrer le scheduler pour les rapports quotidiens
export function scheduleWeeklyReports(): void {
    console.log('📅 Démarrage du scheduler de rapports quotidiens...');

    // Calculer le temps jusqu'à minuit
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Minuit

    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    console.log(`📅 Prochaine exécution des rapports: ${tomorrow.toLocaleString('fr-FR')}`);
    console.log(`⏰ Temps d'attente: ${Math.round(timeUntilMidnight / (1000 * 60 * 60))} heures`);

    // Programmer l'exécution pour minuit
    setTimeout(() => {
        console.log('📊 Exécution planifiée des rapports quotidiens');
        generateWeeklyReports();

        // Programmer la prochaine exécution (chaque jour)
        setInterval(() => {
            console.log('📊 Exécution quotidienne des rapports');
            generateWeeklyReports();
        }, 24 * 60 * 60 * 1000); // Chaque jour

    }, timeUntilMidnight);
}

// Fonction pour arrêter le scheduler (optionnel)
export function stopWeeklyReportsScheduler(): void {
    console.log('🛑 Arrêt du scheduler de rapports quotidiens');
}
