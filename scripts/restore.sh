#!/bin/bash

# Script de restauration de la base de données PostgreSQL
# Usage: ./restore.sh [backup_file]

set -e

# Configuration
DB_NAME=${POSTGRES_DB:-deep-db}
DB_USER=${POSTGRES_USER:-deep-user}
DB_HOST=${POSTGRES_HOST:-postgres}
BACKUP_DIR="/backups"

# Vérifier les arguments
if [ $# -eq 0 ]; then
    echo "📋 Available backups:"
    echo ""
    
    # Lister les backups disponibles
    if [ -d "$BACKUP_DIR" ]; then
        for backup in "$BACKUP_DIR"/backup_*.sql.gz; do
            if [ -f "$backup" ]; then
                filename=$(basename "$backup")
                size=$(du -h "$backup" | cut -f1)
                date=$(echo "$filename" | sed 's/backup_\(.*\)\.sql\.gz/\1/' | sed 's/_\(.*\)_\(.*\)/\1 \2/')
                echo "📦 $filename ($size) - $date"
            fi
        done
        echo ""
        echo "Usage: ./restore.sh backup_YYYYMMDD_HHMMSS.sql.gz"
        echo "       ./restore.sh latest_backup.sql.gz"
        exit 0
    else
        echo "❌ No backup directory found: $BACKUP_DIR"
        exit 1
    fi
fi

BACKUP_FILE="$1"

# Vérifier si le backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    # Si ce n'est pas un chemin complet, chercher dans le répertoire de backups
    if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        echo "❌ Backup file not found: $BACKUP_FILE"
        echo "❌ Also not found in: $BACKUP_DIR/$BACKUP_FILE"
        exit 1
    else
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    fi
fi

echo "🔄 Starting database restore..."
echo "📅 Timestamp: $(date)"
echo "🗃️ Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "📁 Backup file: $BACKUP_FILE"

# Vérifier si le backup est compressé
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "🗜️ Backup is compressed, decompressing..."
    TEMP_FILE=$(mktemp --suffix=.sql)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Attendre que PostgreSQL soit prêt
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"; do
    echo "PostgreSQL not ready, waiting..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Confirmation de sécurité
echo ""
echo "⚠️ WARNING: This will completely replace the current database!"
echo "⚠️ All current data will be LOST!"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Restore cancelled by user"
    exit 1
fi

# Arrêter les services qui utilisent la base de données
echo "⏸️ Stopping services that use the database..."
# Note: Dans un environnement de production, vous pourriez vouloir arrêter
# les services API ici pour éviter les conflits

# Restaurer la base de données
echo "🔄 Restoring database..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --no-password \
    "$RESTORE_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    
    # Nettoyer le fichier temporaire
    if [ -n "$TEMP_FILE" ]; then
        rm "$TEMP_FILE"
    fi
    
    # Créer un log de restauration
    RESTORE_LOG="$BACKUP_DIR/restore_log_$(date +"%Y%m%d_%H%M%S").log"
    cat > "$RESTORE_LOG" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "database": "$DB_NAME",
    "user": "$DB_USER",
    "host": "$DB_HOST",
    "backup_file": "$BACKUP_FILE",
    "status": "success",
    "restored_at": "$(date -Iseconds)"
}
EOF
    
    echo "📋 Restore log created: $RESTORE_LOG"
    
    # Redémarrer les services
    echo "🔄 Services can now be restarted"
    
else
    echo "❌ Failed to restore database"
    
    # Nettoyer le fichier temporaire
    if [ -n "$TEMP_FILE" ]; then
        rm "$TEMP_FILE"
    fi
    
    exit 1
fi

echo ""
echo "🎉 Database restore completed successfully!"
echo "📁 From: $BACKUP_FILE"
echo "🗃️ To: $DB_NAME"
echo "📅 At: $(date)"
