-- Migration script: unifier les tables de rappels
-- Ce script migre les données de task_reminders vers la table reminders unifiée

-- Étape 1: Créer la table reminders si elle n'existe pas
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP NOT NULL,
    reminder_type VARCHAR(10) NOT NULL DEFAULT 'email' CHECK (reminder_type IN ('email', 'sms', 'whatsapp')),
    message TEXT,
    is_active BOOLEAN DEFAULT true,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Étape 2: Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(is_active, reminder_time);

-- Étape 3: Migre les données de task_reminders vers reminders
INSERT INTO reminders (task_id, user_id, reminder_time, reminder_type, message, created_at)
SELECT 
    tr.task_id,
    tr.created_by_id as user_id,
    tr.reminder_date as reminder_time,
    'email' as reminder_type, -- Type par défaut lors de la migration
    tr.message,
    tr.created_at
FROM task_reminders tr
WHERE NOT EXISTS (
    SELECT 1 FROM reminders r 
    WHERE r.task_id = tr.task_id 
    AND r.reminder_time = tr.reminder_date
    AND r.user_id = tr.created_by_id
);

-- Étape 4: Afficher un résumé de la migration
DO $$
DECLARE
    task_reminders_count INTEGER;
    reminders_count INTEGER;
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_reminders_count FROM task_reminders;
    SELECT COUNT(*) INTO reminders_count FROM reminders;
    
    RAISE NOTICE '=== RÉSUMÉ DE LA MIGRATION DES RAPPELS ===';
    RAISE NOTICE 'Nombre d''enregistrements dans task_reminders: %', task_reminders_count;
    RAISE NOTICE 'Nombre d''enregistrements dans reminders: %', reminders_count;
    
    IF task_reminders_count > 0 THEN
        migrated_count := reminders_count - (SELECT COUNT(*) FROM reminders WHERE created_at < NOW() - INTERVAL '1 minute');
        RAISE NOTICE 'Nombre d''enregistrements migrés: %', migrated_count;
        RAISE NOTICE 'Taux de migration: %', ROUND((migrated_count::FLOAT / task_reminders_count::FLOAT) * 100, 2) || '%';
    END IF;
    
    RAISE NOTICE '=========================================';
END $$;

-- Étape 5: Optionnel - Supprimer l'ancienne table (décommentez pour exécuter)
-- DROP TABLE IF EXISTS task_reminders;

-- Étape 6: Optionnel - Nettoyer les anciennes tables et vues (décommentez pour exécuter)
-- DROP VIEW IF EXISTS task_reminders_view;
-- DROP TABLE IF EXISTS task_reminders_backup;
