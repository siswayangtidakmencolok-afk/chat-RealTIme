const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 3000;        // balik ke 3000
const WS_PORT = 8080;     // balik ke 8080

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`HTTP Server: http://localhost:${PORT}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });

const clients = new Map(); // Simpan client dengan data: {id, username}
let clientCounter = 0;

wss.on('connection', (ws) => {
    clientCounter++;
    const clientId = `user_${clientCounter}`;
    
    // Initialize client data
    clients.set(ws, {
        id: clientId,
        username: null
    });

    console.log(`${clientId} terhubung. Total client: ${clients.size}`);

    // Kirim ID ke client baru
    ws.send(JSON.stringify({
        type: 'assign-id',
        userId: clientId
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const clientData = clients.get(ws);
            
            if (message.type === 'set-username') {
                // Set username
                clientData.username = message.username;
                clients.set(ws, clientData);
                
                // Confirm username set
                ws.send(JSON.stringify({
                    type: 'username-set',
                    username: message.username
                }));
                
                // Broadcast join notification
                broadcast({
                    type: 'system',
                    message: `${message.username} bergabung`,
                    timestamp: new Date().toLocaleTimeString('id-ID')
                });
                
                console.log(`${clientData.id} set username: ${message.username}`);
            }
            else if (message.text) {
                // Broadcast chat message
                broadcast({
                    type: 'message',
                    userId: clientData.id,
                    username: clientData.username || 'Anonymous',
                    message: message.text,
                    timestamp: new Date().toLocaleTimeString('id-ID')
                });
            }

        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        const clientData = clients.get(ws);
        const displayName = clientData.username || clientData.id;
        clients.delete(ws);
        
        console.log(`${displayName} disconnect. Sisa client: ${clients.size}`);
        
        broadcast({
            type: 'system',
            message: `${displayName} keluar`,
            timestamp: new Date().toLocaleTimeString('id-ID')
        });
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

console.log(`WebSocket Server: ws://localhost:${WS_PORT}`);