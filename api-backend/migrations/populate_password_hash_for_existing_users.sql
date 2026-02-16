-- Populate password_hash column for existing users with plain text passwords
-- This migration should be run once to convert existing plain text passwords to hashes using pgcrypto

UPDATE users 
SET password_hash = crypt(password, gen_salt('bf'), 8)
WHERE password_hash IS NULL 
  AND password IS NOT NULL 
  AND length(password) >= 6;

-- Add index for better performance
CREATE INDEX idx_users_password_hash_temp ON users(password_hash) WHERE password_hash IS NOT NULL;

-- Log the migration
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) 
SELECT id, 'password_hash_migration', 'user', id, 
       'Migrated ' || COUNT(*) || '0' || ' users from plain text to hashed passwords'
FROM users 
WHERE password_hash IS NULL AND password IS NOT NULL AND length(password) >= 6;
