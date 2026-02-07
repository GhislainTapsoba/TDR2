# Configuration des Services de Notification - Team Project

Ce guide vous aide à configurer les trois canaux de notification (Email, SMS, WhatsApp) pour que les rappels soient envoyés au nom de "Team Project".

## 📧 Email (Mailjet)

### 1. Créer un compte Mailjet
- Allez sur [mailjet.com](https://mailjet.com)
- Créez un compte gratuit ou payant
- Vérifiez votre domaine d'envoi

### 2. Obtenir les clés API
- Dans le dashboard Mailjet → Account → API Keys
- Créez une nouvelle clé API avec permissions d'envoi
- Copiez l'API Key et le Secret Key

### 3. Configurer l'environnement
```env
MAILJET_API_KEY=votre_clé_api_mailjet
MAILJET_SECRET_KEY=votre_clé_secrète_mailjet
MAIL_FROM_EMAIL=noreply@teamproject.com
MAIL_FROM_NAME=Team Project
```

## 📱 SMS (Twilio)

### 1. Créer un compte Twilio
- Allez sur [twilio.com](https://twilio.com)
- Créez un compte
- Ajoutez des crédits pour l'envoi de SMS

### 2. Obtenir un numéro de téléphone
- Dans le dashboard → Phone Numbers → Buy a Number
- Choisissez un numéro pour votre pays
- Configurez-le pour les SMS

### 3. Obtenir les identifiants
- Dashboard → Settings → General
- Copiez le Account SID et Auth Token

### 4. Configurer l'environnement
```env
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Votre numéro Twilio
```

## 💬 WhatsApp (Meta Business)

### 1. Créer une application WhatsApp Business
- Allez sur [developers.facebook.com](https://developers.facebook.com)
- Créez une nouvelle application Meta Business
- Configurez WhatsApp dans l'application

### 2. Vérifier votre numéro WhatsApp
- Ajoutez et vérifiez votre numéro de téléphone
- Configurez les templates de messages

### 3. Obtenir le token d'accès
- Dans les settings de l'application WhatsApp
- Générez un token d'accès permanent

### 4. Configurer l'environnement
```env
WHATSAPP_API_URL=https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID
WHATSAPP_API_TOKEN=votre_token_whatsapp
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 🧪 Mode Test/Développement

Le système fonctionne automatiquement en mode test :
- Les emails sont simulés et loggués dans la console
- Les SMS sont simulés et loggués dans la console  
- Les WhatsApp sont simulés et loggués dans la console
- Les logs sont enregistrés dans la base de données

Pour passer en mode production :
```env
NODE_ENV=production
```

## 📋 Templates de Messages

### Email
- Sujet : `📋 Team Project - Rappel: [Titre de la tâche]`
- Template HTML avec branding Team Project
- Inclusion des détails de la tâche

### SMS
- Format : `📋 Team Project - Rappel: [Titre]. [Message]`
- Limité à 160 caractères

### WhatsApp
- Format riche avec mise en forme
- Détails complets de la tâche
- Signature "_Géré par Team Project_"

## 🔧 Tests de Configuration

### Tester l'email
```bash
curl -X POST http://localhost:3000/api/task_reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_id": "uuid-task",
    "reminder_time": "2024-12-31T10:00:00Z",
    "reminder_type": "email",
    "message": "Test de rappel Team Project"
  }'
```

### Tester le SMS
```bash
curl -X POST http://localhost:3000/api/task_reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_id": "uuid-task", 
    "reminder_time": "2024-12-31T10:00:00Z",
    "reminder_type": "sms",
    "message": "Test SMS Team Project"
  }'
```

### Tester WhatsApp
```bash
curl -X POST http://localhost:3000/api/task_reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_id": "uuid-task",
    "reminder_time": "2024-12-31T10:00:00Z", 
    "reminder_type": "whatsapp",
    "message": "Test WhatsApp Team Project"
  }'
```

## 📊 Monitoring

### Logs d'envoi
- `email_logs` : Historique des emails envoyés
- `sms_logs` : Historique des SMS envoyés
- `whatsapp_logs` : Historique des messages WhatsApp

### Requêtes SQL utiles
```sql
-- Vérifier les emails envoyés aujourd'hui
SELECT * FROM email_logs WHERE DATE(sent_at) = CURRENT_DATE;

-- Vérifier les erreurs d'envoi
SELECT * FROM email_logs WHERE status = 'failed' ORDER BY sent_at DESC LIMIT 10;

-- Statistiques d'envoi par type
SELECT 
  'email' as type, COUNT(*) as sent, 
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success
  FROM email_logs WHERE DATE(sent_at) = CURRENT_DATE
UNION ALL
SELECT 
  'sms' as type, COUNT(*) as sent,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success  
  FROM sms_logs WHERE DATE(sent_at) = CURRENT_DATE
UNION ALL
SELECT 
  'whatsapp' as type, COUNT(*) as sent,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success
  FROM whatsapp_logs WHERE DATE(sent_at) = CURRENT_DATE;
```

## 🚨 Dépannage

### Problèmes courants
1. **Email non reçu** : Vérifiez le dossier spam et la configuration DNS
2. **SMS non reçu** : Vérifiez le format du numéro (+countrycode)
3. **WhatsApp non reçu** : Vérifiez que le utilisateur a accepté les messages

### Support
- Mailjet : [support.mailjet.com](https://support.mailjet.com)
- Twilio : [support.twilio.com](https://support.twilio.com)
- Meta Business : [developers.facebook.com/support](https://developers.facebook.com/support)
