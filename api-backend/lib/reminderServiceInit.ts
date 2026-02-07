import ReminderService from './reminderService';

// Initialiser le service de rappels
const reminderService = ReminderService.getInstance();

// Démarrer le service au démarrage
reminderService.start();

// Arrêter le service à l'arrêt
process.on('SIGINT', () => {
  reminderService.stop();
  process.exit(0);
});

export default reminderService;
