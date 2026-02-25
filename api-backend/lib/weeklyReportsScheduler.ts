import { generateWeeklyReports } from './weeklyReports';

// Démarrer le scheduler pour les rapports hebdomadaires
export function scheduleWeeklyReports(): void {
    // Exécuter immédiatement pour tester
    console.log('📅 Démarrage du scheduler de rapports hebdomadaires...');
    
    // Calculer le temps jusqu'au prochain lundi à 9h
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 - now.getDay() + 7) % 7); // Prochain lundi
    nextMonday.setHours(9, 0, 0, 0); // 9h du matin
    
    // Si c'est déjà lundi 9h ou plus tard, exécuter maintenant
    if (now.getDay() === 1 && now.getHours() >= 9) {
        console.log('📊 Exécution immédiate des rapports hebdomadaires (lundi après 9h)');
        generateWeeklyReports();
    } else {
        const timeUntilNext = nextMonday.getTime() - now.getTime();
        console.log(`📅 Prochaine exécution des rapports: ${nextMonday.toLocaleString('fr-FR')}`);
        console.log(`⏰ Temps d'attente: ${Math.round(timeUntilNext / (1000 * 60 * 60))} heures`);
        
        // Programmer l'exécution pour le prochain lundi à 9h
        setTimeout(() => {
            console.log('📊 Exécution planifiée des rapports hebdomadaires');
            generateWeeklyReports();
            
            // Programmer la prochaine exécution (chaque semaine)
            setInterval(() => {
                console.log('📊 Exécution hebdomadaire des rapports');
                generateWeeklyReports();
            }, 7 * 24 * 60 * 60 * 1000); // Chaque semaine
            
        }, timeUntilNext);
    }
}

// Fonction pour arrêter le scheduler (optionnel)
export function stopWeeklyReportsScheduler(): void {
    console.log('🛑 Arrêt du scheduler de rapports hebdomadaires');
}
