# TDR2 Backend API

API backend pour la plateforme de gestion de projets TDR2, construit avec Next.js et PostgreSQL.

## Technologies

- **Next.js 15** - Framework React pour le backend API
- **PostgreSQL** - Base de données relationnelle
- **JWT** - Authentification par tokens
- **Mailjet** - Service d'envoi d'emails
- **TypeScript** - Typage statique

## Installation

```bash
npm install
```

## Configuration

Créez un fichier `.env` basé sur `.env.example`:

```bash
cp .env.example .env
```

Configurez les variables d'environnement:
- `DATABASE_URL` - URL de connexion PostgreSQL
- `JWT_SECRET` - Clé secrète pour JWT
- `MAILJET_API_KEY` et `MAILJET_SECRET_KEY` - Credentials Mailjet
- `MAIL_FROM_EMAIL` - Email d'envoi
- `PLATFORM_URL` - URL du frontend

## Développement

```bash
npm run dev
```

L'API sera accessible sur `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription

### Users
- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur

### Projects
- `GET /api/projects` - Liste des projets
- `POST /api/projects` - Créer un projet
- `GET /api/projects/[id]` - Détails d'un projet
- `PUT /api/projects/[id]` - Modifier un projet
- `DELETE /api/projects/[id]` - Supprimer un projet

### Stages
- `GET /api/stages` - Liste des étapes
- `POST /api/stages` - Créer une étape

### Tasks
- `GET /api/tasks` - Liste des tâches
- `POST /api/tasks` - Créer une tâche (envoie des emails)
- `GET /api/tasks/[id]` - Détails d'une tâche
- `PUT /api/tasks/[id]` - Modifier une tâche (envoie des emails si changement d'assignation)
- `DELETE /api/tasks/[id]` - Supprimer une tâche

### Notifications
- `GET /api/notifications` - Liste des notifications

### Email
- `GET /api/email-confirm?token=xxx` - Confirmer un email (accusé de réception)

## Fonctionnalités

- **Authentification JWT** - Sécurisation des endpoints
- **RBAC** - Contrôle d'accès basé sur les rôles (admin, manager, employee)
- **Emails automatiques** - Envoi d'emails lors de l'assignation de tâches
- **Accusés de réception** - Tracking des confirmations d'emails
- **Notifications** - Système de notifications in-app
