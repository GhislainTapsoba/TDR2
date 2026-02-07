# Système de Gestion des Rappels - Documentation

## Vue d'ensemble

Le système de gestion des rappels de TDR2 a été unifié pour fournir une solution cohérente et complète. Le système permet d'envoyer des rappels de tâches par email, SMS et WhatsApp.

## Architecture

### Composants principaux

1. **ReminderService** (`/lib/reminderService.ts`)
   - Service singleton qui gère le traitement des rappels
   - Vérifie les rappels pending toutes les minutes
   - Envoie les notifications selon le type choisi

2. **Modèle de données** (`/core/domain/Task_reminders.ts`)
   - `TaskReminder` avec champs unifiés
   - Support des 3 types de notification: email, sms, whatsapp

3. **Endpoints API**
   - `GET /api/task_reminders` - Lister les rappels de l'utilisateur
   - `POST /api/task_reminders` - Créer un nouveau rappel
   - `DELETE /api/reminders/[id]` - Supprimer un rappel

## Migration

### Script de migration
Un script SQL est disponible dans `/scripts/migrate_reminders.sql` pour migrer les données de l'ancienne table `task_reminders` vers la nouvelle table unifiée `reminders`.

### Étapes de migration
1. Exécuter le script SQL dans votre base de données
2. Vérifier les logs de migration
3. (Optionnel) Supprimer l'ancienne table après validation

## Utilisation

### Créer un rappel

```bash
POST /api/task_reminders
Content-Type: application/json

{
  "task_id": "uuid-de-la-tache",
  "reminder_time": "2024-12-31T10:00:00Z",
  "reminder_type": "email",
  "message": "N'oubliez pas de compléter cette tâche importante !"
}
```

### Types de rappels disponibles
- `email`: Envoi par email avec template HTML
- `sms`: Envoi par SMS (via Twilio)
- `whatsapp`: Envoi par WhatsApp (via API Facebook)

### Lister les rappels

```bash
GET /api/task_reminders
Authorization: Bearer <token>
```

Retourne la liste des rappels de l'utilisateur avec les détails des tâches associées.

### Supprimer un rappel

```bash
DELETE /api/reminders/[id]
Authorization: Bearer <token>
```

## Configuration

### Variables d'environnement requises

```env
# Email (Mailjet)
MAILJET_API_KEY=votre_clé_api
MAILJET_SECRET_KEY=votre_clé_secrète
MAIL_FROM_EMAIL=noreply@votredomaine.com
MAIL_FROM_NAME=TDR Projects

# SMS (Twilio)
TWILIO_ACCOUNT_SID=votre_sid_twilio
TWILIO_AUTH_TOKEN=votre_token_twilio
TWILIO_PHONE_NUMBER=votre_numero_twilio

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID
WHATSAPP_API_TOKEN=votre_token_whatsapp
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Mode développement
En mode développement (`NODE_ENV != production`), les notifications sont simulées et logguées dans la console sans envoi réel.

## Service de traitement

### Démarrage automatique
Le service de rappels démarre automatiquement avec l'application via `reminderServiceInit.ts`.

### Fréquence de traitement
- Vérification toutes les 60 secondes
- Seuls les rappels actifs non envoyés sont traités
- Marquage automatique comme envoyé après traitement

### Logs
Le service génère des logs détaillés pour:
- Démarrage/arrêt du service
- Création de rappels
- Envoi de notifications
- Erreurs de traitement

## Sécurité

### Authentification
- Tous les endpoints nécessitent une authentification JWT
- Les utilisateurs ne peuvent voir que leurs propres rappels
- Vérification des permissions avant suppression

### Validation des données
- Validation des types de rappel
- Vérification des formats de date
- Protection contre les injections SQL

## Monitoring

### Tables de logs
- `email_logs`: Journal des envois d'emails
- `sms_logs`: Journal des envois SMS  
- `whatsapp_logs`: Journal des envois WhatsApp

### Métriques disponibles
- Nombre de rappels créés par utilisateur
- Taux d'envoi réussi par type
- Erreurs de traitement

## Dépannage

### Problèmes courants
1. **Rappels non envoyés**: Vérifier que le service est démarré et les variables d'environnement configurées
2. **Erreurs Twilio**: Vérifier les crédits et les numéros de téléphone
3. **Erreurs Mailjet**: Vérifier les clés API et les templates

### Commandes utiles
```sql
-- Vérifier les rappels en attente
SELECT * FROM reminders WHERE is_active = true AND sent_at IS NULL;

-- Vérifier les erreurs récentes
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY sent_at DESC LIMIT 10;
```
