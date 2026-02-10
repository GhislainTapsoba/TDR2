-- Script simplifié pour créer l'administrateur Ghislain TAPSOBA
-- Ce script contient uniquement les commandes essentielles

-- 1. Créer le rôle d'administrateur s'il n'existe pas
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'Administrateur système avec tous les droits',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- 2. Insérer l'utilisateur admin directement
INSERT INTO users (
    id,
    email, 
    name, 
    role, 
    is_active, 
    created_at, 
    updated_at,
    password
) VALUES (
    gen_random_uuid(),
    'arseneghislaintaps@gmail.com',
    'Ghislain TAPSOBA',
    'admin',
    true,
    NOW(),
    NOW(),
    '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdJrGqOdO8nJdJK1VjVNVfQ5GjX9G'
);

-- 3. Vérification de l'insertion
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.is_active,
    u.created_at
FROM users u 
WHERE u.email = 'arseneghislaintaps@gmail.com';
