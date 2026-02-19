// Test script pour vérifier le format des messages WhatsApp d'assignation
const http = require('http');

const testData = {
    to: "+22605929883",
    recipientId: "test-user-id",
    recipientName: "Arsène TAPSOBA",
    taskTitle: "Déployer le nouveau service WhatsApp",
    taskId: "task-123",
    projectName: "TDR2 Platform",
    assignedBy: "Chef de projet",
    assignedById: "manager-id",
    confirmationToken: "test-token-123"
};

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/test-whatsapp-assignment',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify(testData));
req.end();

console.log('Test assignment WhatsApp sent...');
