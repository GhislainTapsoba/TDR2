# TDR2 - Plateforme de Gestion de Projets

Application complète de gestion et suivi de projets avec architecture CRUD, construite avec Next.js, PostgreSQL, et système de notifications par email.

## 🚀 Fonctionnalités

- **Authentification JWT** - Système de connexion sécurisé
- **Gestion de Projets** - CRUD complet pour les projets
- **Gestion des Étapes** - Organisation des projets en étapes
- **Gestion des Tâches** - Création, assignation et suivi des tâches
- **Notifications Email** - Envoi automatique d'emails lors de l'assignation de tâches
- **Accusés de Réception** - Tracking des confirmations d'emails
- **Système de Permissions** - Contrôle d'accès basé sur les rôles (Admin, Manager, Employee)
- **Dashboard Interactif** - Vue d'ensemble des projets et tâches

## 📋 Prérequis

- Docker et Docker Compose
- Node.js 20+ (pour le développement local)
- PostgreSQL 15+ (si non utilisé via Docker)
- Compte Mailjet (pour l'envoi d'emails)

## 🛠️ Installation

### 1. Cloner le projet

```bash
cd TDR2
```

### 2. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet:

```bash
cp .env.example .env
```

Modifiez les variables dans `.env`:

```env
# Database
POSTGRES_DB=deep-db
POSTGRES_USER=deep-user
POSTGRES_PASSWORD=votre-mot-de-passe-securise

# Backend
JWT_SECRET=votre-cle-secrete-jwt-tres-longue-et-securisee
MAILJET_API_KEY=votre-cle-api-mailjet
MAILJET_SECRET_KEY=votre-cle-secrete-mailjet
MAIL_FROM_EMAIL=noreply@votredomaine.com
MAIL_FROM_NAME=TDR2 Platform

# URLs
PLATFORM_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Démarrage avec Docker

```bash
docker-compose up -d
```

L'application sera accessible sur:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **PostgreSQL**: localhost:5432

### 4. Initialisation de la base de données

La base de données doit être initialisée avec le schéma du projet TDR. Connectez-vous à PostgreSQL et exécutez le script de schéma:

```bash
docker exec -it tdr2-postgres-1 psql -U deep-user -d deep-db -f /path/to/schema.sql
```

Ou copiez le fichier `schema.sql` depuis le projet TDR:

```bash
docker cp ../TDR/api-backend/supabase/schema.sql tdr2-postgres-1:/tmp/
docker exec -it tdr2-postgres-1 psql -U deep-user -d deep-db -f /tmp/schema.sql
```

## 🏗️ Structure du Projet

```
TDR2/
├── api-backend/          # Backend API (Next.js)
│   ├── app/
│   │   └── api/         # Routes API
│   │       ├── auth/    # Authentification
│   │       ├── users/   # Gestion utilisateurs
│   │       ├── projects/# Gestion projets
│   │       ├── stages/  # Gestion étapes
│   │       ├── tasks/   # Gestion tâches
│   │       └── ...
│   ├── lib/             # Utilitaires
│   │   ├── db.ts        # Connexion PostgreSQL
│   │   ├── auth.ts      # JWT & hashing
│   │   ├── email.ts     # Service email
│   │   └── permissions.ts # RBAC
│   └── package.json
│
├── web-frontend/        # Frontend (Next.js)
│   ├── app/
│   │   ├── login/       # Page de connexion
│   │   ├── register/    # Page d'inscription
│   │   ├── dashboard/   # Tableau de bord
│   │   ├── projects/    # Interface projets
│   │   ├── tasks/       # Interface tâches
│   │   └── email-redirect/ # Redirection emails
│   ├── contexts/        # React contexts
│   ├── lib/             # API client
│   └── package.json
│
├── docker-compose.yml   # Configuration Docker
└── README.md
```

## 🔧 Développement Local

### Backend

```bash
cd api-backend
npm install
npm run dev
```

### Frontend

```bash
cd web-frontend
npm install
npm run dev
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription

### Users

- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur

### Projects

- `GET /api/projects` - Liste des projets
- `POST /api/projects` - Créer un projet
- `GET /api/projects/:id` - Détails d'un projet
- `PUT /api/projects/:id` - Modifier un projet
- `DELETE /api/projects/:id` - Supprimer un projet

### Tasks

- `GET /api/tasks` - Liste des tâches
- `POST /api/tasks` - Créer une tâche (envoie des emails)
- `GET /api/tasks/:id` - Détails d'une tâche
- `PUT /api/tasks/:id` - Modifier une tâche
- `DELETE /api/tasks/:id` - Supprimer une tâche

### Email

- `GET /api/email-confirm?token=xxx` - Confirmer un email

## 🔐 Rôles et Permissions

### Admin
- Accès complet à toutes les fonctionnalités
- Gestion des utilisateurs
- Gestion de tous les projets

### Manager
- Création et gestion de ses propres projets
- Création et assignation de tâches
- Vue sur les projets dont il est responsable

### Employee
- Vue sur les projets auxquels il est assigné
- Modification du statut de ses tâches
- Vue en lecture seule

## 📧 Système d'Emails

Les emails sont envoyés automatiquement via Mailjet lors de:
- Assignation d'une tâche à un utilisateur
- Modification d'une tâche avec changement d'assignation

Chaque email contient:
- Un bouton de redirection vers la plateforme
- Un token de confirmation pour l'accusé de réception
- Les détails de la tâche et du projet

## 🐛 Dépannage

### La base de données ne démarre pas

Vérifiez les logs:
```bash
docker-compose logs postgres
```

### Les emails ne sont pas envoyés

Vérifiez vos credentials Mailjet dans le fichier `.env` et les logs du backend:
```bash
docker-compose logs api-backend
```

### Erreur de connexion à l'API

Vérifiez que `NEXT_PUBLIC_API_URL` est correctement configuré dans le frontend.

## 📝 License

Ce projet est développé pour un usage interne.

## 👥 Auteurs

Développé par l'équipe TDR2
