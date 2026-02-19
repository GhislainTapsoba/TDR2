#!/bin/bash

# Script de monitoring de la persistance de la base de données
# Usage: ./db-monitor.sh

set -e

# Configuration
DB_NAME=${POSTGRES_DB:-deep-db}
DB_USER=${POSTGRES_USER:-deep-user}
DB_HOST=${POSTGRES_HOST:-postgres}
BACKUP_DIR="/backups"

echo "🔍 Database Persistence Monitor"
echo "============================"
echo ""

# Vérifier la connexion à la base de données
echo "📊 Database Connection Test..."
if pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; then
    echo "✅ Database is accessible"
    DB_STATUS="Connected"
else
    echo "❌ Database is not accessible"
    DB_STATUS="Disconnected"
fi

# Vérifier le volume de données
echo ""
echo "📁 Data Volume Status:"
if docker volume inspect postgres-data 2>/dev/null | grep -q '"Mountpoint"'; then
    echo "✅ postgres-data volume exists"
    VOLUME_STATUS="Present"
else
    echo "❌ postgres-data volume missing"
    VOLUME_STATUS="Missing"
fi

# Analyser les backups
echo ""
echo "💾 Backup Analysis:"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -printf '%T@%p\n' | sort -n | tail -1 | cut -d@ -f2-)
    
    echo "📦 Total backups: $BACKUP_COUNT"
    
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_AGE=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -printf '%T@%p\n' | sort -n | tail -1 | cut -d@ -f1)
        CURRENT_TIME=$(date +%s)
        AGE_HOURS=$(( (CURRENT_TIME - BACKUP_AGE) / 3600 ))
        
        echo "📅 Latest backup: $(basename "$LATEST_BACKUP")"
        echo "⏰ Age: $AGE_HOURS hours"
        
        if [ $AGE_HOURS -gt 24 ]; then
            echo "⚠️ WARNING: Latest backup is older than 24 hours!"
            BACKUP_STATUS="Old"
        elif [ $AGE_HOURS -gt 6 ]; then
            echo "⚠️ CAUTION: Latest backup is older than 6 hours"
            BACKUP_STATUS="Aging"
        else
            echo "✅ Latest backup is recent"
            BACKUP_STATUS="Fresh"
        fi
    else
        echo "❌ No backups found"
        BACKUP_STATUS="None"
    fi
else
    echo "❌ Backup directory not found"
    BACKUP_COUNT=0
    BACKUP_STATUS="Missing"
fi

# Vérifier l'espace disque
echo ""
echo "💽 Disk Space Analysis:"
if command -v df >/dev/null 2>&1; then
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    DISK_AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')
    
    echo "📊 Disk usage: ${DISK_USAGE}%"
    echo "💽 Available space: $DISK_AVAILABLE"
    
    if [ "${DISK_USAGE%?}" -gt 80 ]; then
        echo "⚠️ WARNING: Disk usage is above 80%!"
        DISK_STATUS="Critical"
    elif [ "${DISK_USAGE%?}" -gt 60 ]; then
        echo "⚠️ CAUTION: Disk usage is above 60%"
        DISK_STATUS="Warning"
    else
        echo "✅ Disk usage is normal"
        DISK_STATUS="Normal"
    fi
else
    echo "❌ Cannot check disk space"
    DISK_STATUS="Unknown"
fi

# Vérifier les services Docker
echo ""
echo "🐳 Docker Services Status:"
if command -v docker >/dev/null 2>&1; then
    # Vérifier PostgreSQL
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "postgres.*Up"; then
        echo "✅ PostgreSQL container is running"
        POSTGRES_STATUS="Running"
    else
        echo "❌ PostgreSQL container is not running"
        POSTGRES_STATUS="Stopped"
    fi
    
    # Vérifier le service de backup
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "db-backup.*Up"; then
        echo "✅ Backup service is running"
        BACKUP_SERVICE_STATUS="Running"
    else
        echo "⚠️ Backup service is not running"
        BACKUP_SERVICE_STATUS="Stopped"
    fi
else
    echo "❌ Docker command not available"
    POSTGRES_STATUS="Unknown"
    BACKUP_SERVICE_STATUS="Unknown"
fi

# Résumé et recommandations
echo ""
echo "📋 Summary & Recommendations:"
echo "================================"

# Évaluer la santé globale
OVERALL_STATUS="Healthy"

if [ "$DB_STATUS" != "Connected" ] || [ "$VOLUME_STATUS" != "Present" ]; then
    OVERALL_STATUS="Critical"
    echo "🚨 CRITICAL: Database access or volume issues detected!"
    echo "💡 Recommendation: Check Docker containers and volumes"
elif [ "$BACKUP_STATUS" = "None" ] || [ "$BACKUP_STATUS" = "Old" ]; then
    OVERALL_STATUS="Warning"
    echo "⚠️ WARNING: Backup issues detected!"
    echo "💡 Recommendation: Check backup service and storage"
elif [ "$DISK_STATUS" = "Critical" ]; then
    OVERALL_STATUS="Warning"
    echo "⚠️ WARNING: Disk space issues detected!"
    echo "💡 Recommendation: Free up disk space or cleanup old files"
elif [ "$POSTGRES_STATUS" != "Running" ]; then
    OVERALL_STATUS="Warning"
    echo "⚠️ WARNING: PostgreSQL container issues!"
    echo "💡 Recommendation: Restart PostgreSQL container"
else
    echo "✅ All systems appear to be functioning normally"
    echo "💡 Recommendation: Continue monitoring regularly"
fi

# Exporter le statut pour d'autres scripts
echo "OVERALL_STATUS=$OVERALL_STATUS" > /tmp/db_status.txt

echo ""
echo "🎯 Overall Status: $OVERALL_STATUS"
echo "📊 Database: $DB_STATUS"
echo "📁 Volume: $VOLUME_STATUS"  
echo "💾 Backups: $BACKUP_COUNT ($BACKUP_STATUS)"
echo "💽 Disk: $DISK_STATUS"
echo "🐳 PostgreSQL: $POSTGRES_STATUS"
echo "🔄 Backup Service: $BACKUP_SERVICE_STATUS"
