-- Script pour créer un administrateur dans la base de données TDR2
-- Exécuter ce script dans PostgreSQL avec l'utilisateur deep-user sur la base de données deep-db

-- 1. Créer le rôle d'administrateur s'il n'existe pas déjà
INSERT INTO roles (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'Administrateur système avec tous les droits',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO NOTHING;

-- 2. Récupérer l'ID du rôle admin
DO $$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  
  -- 3. Insérer l'utilisateur TAPSOBA
  INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'arseneghislaintaps@gmail.com',
    'TAPSOBA',
    'admin',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;
  
  -- 4. Créer les préférences de notification pour l'admin
  INSERT INTO notification_preferences (user_id, created_at, updated_at)
  SELECT id, NOW(), NOW() 
  FROM users 
  WHERE email = 'arseneghislaintaps@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM notification_preferences np 
    WHERE np.user_id = users.id
  );
  
  -- 5. Créer les paramètres utilisateur pour l'admin
  INSERT INTO user_settings (user_id, created_at, updated_at)
  SELECT id, NOW(), NOW() 
  FROM users 
  WHERE email = 'arseneghislaintaps@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM user_settings us 
    WHERE us.user_id = users.id
  );
  
  RAISE NOTICE 'Administrateur TAPSOBA créé avec succès';
END $$;

-- 6. Mettre à jour le mot de passe (hashé avec bcrypt)
-- Le mot de passe "password" hashé avec bcrypt (cost 10)
UPDATE users 
SET password = '$2b$10$N9qo8uLOickgx2ZMRZoMye.IjdJrGqOdO8nJdJK1VjVNVfQ5GjX9G'
WHERE email = 'arseneghislaintaps@gmail.com';

-- Vérification
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.is_active,
  u.created_at
FROM users u 
WHERE u.email = 'arseneghislaintaps@gmail.com';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Script exécuté avec succès !';
  RAISE NOTICE 'Email: arseneghislaintaps@gmail.com';
  RAISE NOTICE 'Mot de passe: password';
  RAISE NOTICE 'Rôle: admin';
END $$;
