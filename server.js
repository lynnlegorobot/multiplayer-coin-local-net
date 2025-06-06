const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const RESPAWN_TIME = 3000; // 3 seconds
const players = {};
const gameState = {
    items: [],
    maxItems: 10
};

// Generate random items on the map
function generateItem() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 800,
        y: Math.random() * 600,
        type: 'coin'
    };
}

// Initialize some items
for (let i = 0; i < gameState.maxItems; i++) {
    gameState.items.push(generateItem());
}

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Create new player
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 800,
        y: Math.random() * 600,
        color: Math.floor(Math.random() * 0xFFFFFF),
        score: 0,
        isAlive: true,
        lastActivity: Date.now()
    };

    // Send current game state to new player
    socket.emit('currentPlayers', players);
    socket.emit('gameState', gameState);

    // Tell other players about new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].lastActivity = Date.now();
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Handle item collection
    socket.on('collectItem', (itemId) => {
        if (!players[socket.id]) return;
        
        const itemIndex = gameState.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            players[socket.id].score += 10;
            players[socket.id].lastActivity = Date.now();
            gameState.items.splice(itemIndex, 1);
            gameState.items.push(generateItem());
            
            io.emit('itemCollected', { itemId, playerId: socket.id, newItem: gameState.items[gameState.items.length - 1] });
            io.emit('scoreUpdate', { playerId: socket.id, score: players[socket.id].score });
        }
    });

    // Handle player hits
    socket.on('playerHit', (targetId) => {
        // First check if the attacking player still exists
        if (!players[socket.id]) return;
        
        const target = players[targetId];
        if (target && target.isAlive) {
            target.isAlive = false;
            target.lastActivity = Date.now();
            io.emit('playerKilled', targetId);
            players[socket.id].score += 50;
            players[socket.id].lastActivity = Date.now();
            io.emit('scoreUpdate', { playerId: socket.id, score: players[socket.id].score });

            setTimeout(() => {
                if (players[targetId]) {
                    players[targetId].isAlive = true;
                    players[targetId].x = Math.random() * 800;
                    players[targetId].y = Math.random() * 600;
                    players[targetId].lastActivity = Date.now();
                    io.emit('playerRespawned', {
                        id: targetId,
                        x: players[targetId].x,
                        y: players[targetId].y
                    });
                }
            }, RESPAWN_TIME);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        socket.broadcast.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your mobile browser`);
});
