#!/bin/bash

# Script de sauvegarde automatique de la base de données PostgreSQL
# Usage: ./backup.sh

set -e

# Configuration
DB_NAME=${POSTGRES_DB:-deep-db}
DB_USER=${POSTGRES_USER:-deep-user}
DB_HOST=${POSTGRES_HOST:-postgres}
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

echo "🗄️ Starting database backup..."
echo "📅 Timestamp: $TIMESTAMP"
echo "🗃️ Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "📁 Backup file: $BACKUP_FILE"

# Créer le répertoire de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Attendre que PostgreSQL soit prêt
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"; do
    echo "PostgreSQL not ready, waiting..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Créer le backup
echo "📦 Creating backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --compress=9 \
    --serializable-deferrable \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    
    # Compresser le backup
    echo "🗜️ Compressing backup..."
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup compressed successfully: $COMPRESSED_FILE"
        
        # Calculer la taille
        BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        echo "📊 Backup size: $BACKUP_SIZE"
        
        # Supprimer le fichier non compressé
        rm "$BACKUP_FILE"
        
        # Créer un fichier de métadonnées
        METADATA_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.meta"
        cat > "$METADATA_FILE" << EOF
{
    "timestamp": "$TIMESTAMP",
    "database": "$DB_NAME",
    "user": "$DB_USER",
    "host": "$DB_HOST",
    "filename": "$(basename "$COMPRESSED_FILE")",
    "size": "$BACKUP_SIZE",
    "created_at": "$(date -Iseconds)",
    "compressed": true
}
EOF
        echo "📋 Metadata created: $METADATA_FILE"
        
    else
        echo "❌ Failed to compress backup"
        exit 1
    fi
    
else
    echo "❌ Failed to create backup"
    exit 1
fi

# Nettoyer les anciens backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "backup_*.meta" -mtime +$RETENTION_DAYS -delete

# Compter les backups restants
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)
echo "📊 Total backups retained: $BACKUP_COUNT"

# Afficher le résumé
echo ""
echo "🎉 Backup completed successfully!"
echo "📁 Location: $COMPRESSED_FILE"
echo "📊 Size: $BACKUP_SIZE"
echo "📅 Retention: $RETENTION_DAYS days"
echo "📦 Total backups: $BACKUP_COUNT"

# Créer un lien symbolique vers le dernier backup
LATEST_BACKUP="$BACKUP_DIR/latest_backup.sql.gz"
ln -sf "$COMPRESSED_FILE" "$LATEST_BACKUP"
echo "🔗 Latest backup link: $LATEST_BACKUP"
