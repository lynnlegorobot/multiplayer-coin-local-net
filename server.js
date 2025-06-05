const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve environment variables for client-side Supabase
app.get('/config.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        // Environment configuration for client
        window.SUPABASE_URL = ${JSON.stringify(process.env.SUPABASE_URL || '')};
        window.SUPABASE_ANON_KEY = ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')};
        console.log('🔧 Environment config loaded:', {
            supabaseConfigured: !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
        });
    `);
});

// Simple favicon endpoint to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content, but successful response
});

// Game constants (matching client)
const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

// Game state
const players = {};
const gameState = {
    items: [],
    maxItems: 15 // Increased to match client
};

// Generate random items on the map (matching client bounds)
function generateItem() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 1150 + 50, // 50-1150 (matching client bounds)
        y: Math.random() * 850 + 50,  // 50-850 (matching client bounds)
        type: 'coin'
    };
}

// Initialize some items
for (let i = 0; i < gameState.maxItems; i++) {
    gameState.items.push(generateItem());
}

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Player joins
    socket.on('joinGame', (playerData) => {
        console.log(`🎮 Player ${socket.id} joining game:`, playerData?.playerName || 'Anonymous');
        
        const spawnX = 100 + Math.random() * (WORLD_WIDTH - 200);
        const spawnY = 100 + Math.random() * (WORLD_HEIGHT - 200);
        
        players[socket.id] = {
            id: socket.id,
            x: spawnX,
            y: spawnY,
            color: Math.random() * 0xffffff,
            name: playerData?.playerName || 'Anonymous',
            score: 0
        };

        // Send existing players to new player
        socket.emit('currentPlayers', players);
        
        // Send current game state
        socket.emit('gameState', { items: Object.values(gameState.items) });

        // Notify all players about new player
        socket.broadcast.emit('newPlayer', players[socket.id]);
        
        console.log(`✅ Player ${players[socket.id].name} joined at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);
        console.log(`👥 Total players: ${Object.keys(players).length}`);
    });

    // Handle player movement
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            // Handle rotation if provided
            if (movementData.rotation !== undefined) {
                players[socket.id].rotation = movementData.rotation;
            }
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Handle item collection - ENHANCED
    socket.on('collectItem', (itemId) => {
        console.log(`🪙 Player ${socket.id} attempting to collect item ${itemId}`);
        
        const itemIndex = gameState.items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            const collectedItem = gameState.items[itemIndex];
            gameState.items.splice(itemIndex, 1);
            players[socket.id].score += 10;
            
            console.log(`✅ Item ${itemId} collected! New score: ${players[socket.id].score}`);
            console.log(`📊 Items remaining: ${gameState.items.length}`);
            
            // Generate new item
            const newItem = generateItem();
            gameState.items.push(newItem);
            
            console.log(`🆕 Generated new item: ${newItem.id} at (${newItem.x.toFixed(1)}, ${newItem.y.toFixed(1)})`);
            
            // Broadcast item collection and new item to ALL clients (including sender)
            io.emit('itemCollected', { 
                itemId, 
                playerId: socket.id, 
                newItem: newItem,
                collectedAt: { x: collectedItem.x, y: collectedItem.y }
            });
            io.emit('scoreUpdate', { playerId: socket.id, score: players[socket.id].score });
        } else {
            console.log(`❌ Item ${itemId} not found - already collected?`);
        }
    });

    // Handle name changes
    socket.on('nameChange', (data) => {
        console.log(`✏️ Player ${socket.id} changing name to:`, data.newName);
        
        if (players[socket.id] && data.newName && data.newName.trim()) {
            const oldName = players[socket.id].name;
            players[socket.id].name = data.newName.trim();
            
            console.log(`📝 Name updated: ${oldName} → ${players[socket.id].name}`);
            
            // Broadcast name change to all other players
            socket.broadcast.emit('playerNameChanged', {
                playerId: socket.id,
                newName: players[socket.id].name,
                oldName: oldName
            });
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