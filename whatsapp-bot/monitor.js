#!/usr/bin/env node

// Script de monitoring pour la persistance WhatsApp
const fs = require('fs');
const path = require('path');
const http = require('http');

const AUTH_DIR = path.join(__dirname, 'auth_info');
const LOGS_DIR = path.join(__dirname, 'logs');
const API_URL = 'http://localhost:3002/status';

function checkPersistence() {
    console.log('🔍 Vérification de la persistance WhatsApp...');
    
    // Vérifier si les crédits existent
    const authExists = fs.existsSync(AUTH_DIR);
    console.log(`📁 Auth directory: ${authExists ? '✅ Exists' : '❌ Missing'}`);
    
    // Vérifier les sauvegardes
    let backupCount = 0;
    if (fs.existsSync(LOGS_DIR)) {
        const backups = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('auth_backup_'));
        backupCount = backups.length;
        console.log(`💾 Backups available: ${backupCount}`);
    }
    
    // Vérifier le statut du service
    http.get(API_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const status = JSON.parse(data);
                console.log(`📱 Service status: ${status.connected ? '✅ Connected' : '❌ Disconnected'}`);
                console.log(`👤 User: ${status.user?.id || 'Not connected'}`);
                
                if (status.persistence) {
                    console.log(`🔄 Persistence status:`);
                    console.log(`   - Auth exists: ${status.persistence.authExists ? '✅' : '❌'}`);
                    console.log(`   - Backup count: ${status.persistence.backupCount}`);
                    console.log(`   - Last backup: ${status.persistence.lastBackup}`);
                }
                
                // Alertes si problèmes
                if (!authExists) {
                    console.log('\n🚨 ALERTE: Les crédits WhatsApp sont manquants!');
                    console.log('💡 Solution: Redémarrez le conteneur et scannez le QR code');
                }
                
                if (!status.connected && authExists) {
                    console.log('\n🚨 ALERTE: Service déconnecté mais crédits disponibles!');
                    console.log('💡 Solution: Le service devrait se reconnecter automatiquement');
                }
                
                if (backupCount === 0 && status.connected) {
                    console.log('\n⚠️ ATTENTION: Aucune sauvegarde trouvée!');
                    console.log('💡 Solution: Une sauvegarde sera créée automatiquement');
                }
                
            } catch (error) {
                console.error('❌ Error parsing status:', error.message);
            }
        });
    }).on('error', (err) => {
        console.error('❌ Error checking service status:', err.message);
        console.log('💡 Solution: Vérifiez que le service WhatsApp est démarré');
    });
}

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(LOGS_DIR, `manual_backup_${timestamp}`);
    
    if (fs.existsSync(AUTH_DIR)) {
        fs.cpSync(AUTH_DIR, backupPath, { recursive: true });
        console.log(`✅ Sauvegarde manuelle créée: ${backupPath}`);
    } else {
        console.log('❌ Aucun crédit à sauvegarder');
    }
}

// Command line interface
const command = process.argv[2];

switch (command) {
    case 'check':
        checkPersistence();
        break;
    case 'backup':
        createBackup();
        break;
    default:
        console.log('Usage:');
        console.log('  node monitor.js check    - Vérifier la persistance');
        console.log('  node monitor.js backup   - Créer une sauvegarde manuelle');
        console.log('');
        console.log('Exemples:');
        console.log('  node monitor.js check');
        console.log('  node monitor.js backup');
        break;
}
