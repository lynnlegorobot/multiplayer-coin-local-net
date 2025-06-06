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

// Player activity tracking
const PLAYER_TIMEOUT = 600000; // 1 minute of inactivity (3,600,000 ms)
const CLEANUP_INTERVAL = 100000; // Check every 10 seconds.

// Enhanced cleanup functions
function cleanupInactivePlayers() {
    const now = Date.now();
    let removedCount = 0;
    
    Object.keys(players).forEach(playerId => {
        const player = players[playerId];
        if (now - player.lastActivity > PLAYER_TIMEOUT) {
            console.log(`🧹 Cleaning up inactive player: ${player.name} (inactive for ${Math.round((now - player.lastActivity) / 1000)}s)`);
            delete players[playerId];
            removedCount++;
            
            // Notify all remaining players
            io.emit('playerDisconnected', playerId);
        }
    });
    
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} inactive player(s). Active players: ${Object.keys(players).length}`);
    }
}

// Cleanup function for orphaned/stale items
function cleanupStaleItems() {
    const now = Date.now();
    const MAX_ITEM_AGE = 300000; // 5 minutes
    let removedCount = 0;
    
    // Add timestamp to items if they don't have one
    gameState.items.forEach(item => {
        if (!item.createdAt) {
            item.createdAt = now;
        }
    });
    
    // Remove items that are too old or if we have too many
    const initialCount = gameState.items.length;
    
    // First, remove old items
    gameState.items = gameState.items.filter(item => {
        if (now - item.createdAt > MAX_ITEM_AGE) {
            removedCount++;
            return false;
        }
        return true;
    });
    
    // Then, if we still have too many, remove oldest ones
    if (gameState.items.length > gameState.maxItems) {
        gameState.items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const excess = gameState.items.length - gameState.maxItems;
        gameState.items.splice(0, excess);
        removedCount += excess;
    }
    
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} stale items. Items: ${initialCount} → ${gameState.items.length}`);
        
        // Notify all clients to refresh their item state
        io.emit('gameState', { items: gameState.items });
    }
}

// Enhanced generate item function with timestamp
function generateItemWithTimestamp() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 1150 + 50,
        y: Math.random() * 850 + 50,
        type: 'coin',
        createdAt: Date.now()
    };
}

// Start cleanup timers
setInterval(cleanupInactivePlayers, CLEANUP_INTERVAL);
setInterval(cleanupStaleItems, CLEANUP_INTERVAL); // Run item cleanup alongside player cleanup
console.log(`🧹 Enhanced cleanup system started (timeout: ${PLAYER_TIMEOUT/1000}s, check interval: ${CLEANUP_INTERVAL/1000}s)`);

// Generate random items on the map (matching client bounds)
function generateItem() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 1150 + 50, // 50-1150 (matching client bounds)
        y: Math.random() * 850 + 50,  // 50-850 (matching client bounds)
        type: 'coin'
    };
}

// Initialize some items with timestamps
for (let i = 0; i < gameState.maxItems; i++) {
    gameState.items.push(generateItemWithTimestamp());
}

function hslToRgb(h, s, l){
    let r, g, b;
    if(s == 0){
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    const to255 = (c) => Math.round(c * 255);
    return (to255(r) << 16) + (to255(g) << 8) + to255(b);
}

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Player joins
    socket.on('joinGame', (playerData) => {
        console.log(`🎮 Player ${socket.id} joining game:`, playerData?.playerName || 'Anonymous');
        
        const spawnX = 100 + Math.random() * (WORLD_WIDTH - 200);
        const spawnY = 100 + Math.random() * (WORLD_HEIGHT - 200);
        
        // Generate a vibrant, random color using HSL
        const randomHue = Math.random();
        // Use 0.5 lightness for maximum saturation/vividness
        const vibrantColor = hslToRgb(randomHue, 1.0, 0.5); 

        players[socket.id] = {
            id: socket.id,
            x: spawnX,
            y: spawnY,
            color: vibrantColor,
            name: playerData?.playerName || 'Anonymous',
            score: 0,
            lives: 3,           // Start with 3 lives
            hitCount: 0,        // Track hits towards losing a life
            coinsToLife: 100,    // Coins needed for extra life
            lastActivity: Date.now()
        };

        // Send existing players to new player
        socket.emit('currentPlayers', players);
        
        // Send current game state
        socket.emit('gameState', { items: Object.values(gameState.items) });

        // Notify all players about new player
        socket.broadcast.emit('newPlayer', players[socket.id]);
        
        console.log(`✅ Player ${players[socket.id].name} joined with ${players[socket.id].lives} lives`);
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
            players[socket.id].lastActivity = Date.now();
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
            
            // Check for extra life (every 100 coins)
            players[socket.id].coinsToLife -= 10;
            if (players[socket.id].coinsToLife <= 0) {
                players[socket.id].lives += 1;
                players[socket.id].coinsToLife = 100; // Reset counter
                console.log(`💚 Player ${players[socket.id].name} gained an extra life! Now has ${players[socket.id].lives} lives`);
                
                // Notify player of extra life
                socket.emit('extraLife', { 
                    lives: players[socket.id].lives,
                    playerId: socket.id 
                });
            }
            
            console.log(`✅ Item ${itemId} collected! New score: ${players[socket.id].score}`);
            console.log(`📊 Items remaining: ${gameState.items.length}`);
            
            // Generate new item only 70% of the time (reduced spawn rate)
            if (Math.random() < 0.7) {
                const newItem = generateItemWithTimestamp();
                gameState.items.push(newItem);
                
                console.log(`🆕 Generated new item: ${newItem.id} at (${newItem.x.toFixed(1)}, ${newItem.y.toFixed(1)})`);
                
                // Broadcast item collection and new item to ALL clients (including sender)
                io.emit('itemCollected', { 
                    itemId, 
                    playerId: socket.id, 
                    newItem: newItem,
                    collectedAt: { x: collectedItem.x, y: collectedItem.y }
                });
            } else {
                console.log(`🎲 Coin spawn skipped (30% chance) - total items: ${gameState.items.length}`);
                
                // Broadcast item collection without new item
                io.emit('itemCollected', { 
                    itemId, 
                    playerId: socket.id, 
                    newItem: null,  // No new item spawned
                    collectedAt: { x: collectedItem.x, y: collectedItem.y }
                });
            }
            io.emit('scoreUpdate', { playerId: socket.id, score: players[socket.id].score });
            io.emit('healthUpdate', { 
                playerId: socket.id, 
                lives: players[socket.id].lives,
                hitCount: players[socket.id].hitCount,
                coinsToLife: players[socket.id].coinsToLife
            });
            players[socket.id].lastActivity = Date.now();
        } else {
            console.log(`❌ Item ${itemId} not found - already collected?`);
        }
    });

    // Handle player collision damage
    socket.on('playerHit', (data) => {
        const { targetPlayerId } = data;
        const aggressorId = socket.id;

        if (players[targetPlayerId] && players[aggressorId]) {
            // --- DAMAGE LOGIC ---
            players[targetPlayerId].hitCount += 1;
            console.log(`💥 Player ${players[targetPlayerId].name} hit! Count: ${players[targetPlayerId].hitCount}/3`);
            
            // --- COLOR CHANGE LOGIC ---
            const darken = (colorNum, percent) => {
                let t=percent<0?0:255,p=percent<0?percent*-1:percent,R=colorNum>>16,G=colorNum>>8&0x00FF,B=colorNum&0x0000FF;
                R = Math.round((t-R)*p)+R; G = Math.round((t-G)*p)+G; B = Math.round((t-B)*p)+B;
                return (R<255?R:255)<<16 | (G<255?G:255)<<8 | (B<255?B:255);
            };
            const brighten = (colorNum, percent) => darken(colorNum, -percent);
            const getComplementary = (colorNum) => {
                const r = (colorNum >> 16) & 0xFF;
                const g = (colorNum >> 8) & 0xFF;
                const b = colorNum & 0xFF;
                return ((255 - r) << 16) | ((255 - g) << 8) | (255 - b);
            };

            // Victim gets darker (more intense effect)
            const newVictimColor = darken(players[targetPlayerId].color, 0.3);
            players[targetPlayerId].color = newVictimColor;

            // Aggressor gets a brighter, complementary color (more intense effect)
            const complementaryColor = getComplementary(players[aggressorId].color);
            const newAggressorColor = brighten(complementaryColor, 0.25);
            players[aggressorId].color = newAggressorColor;

            io.emit('colorsUpdated', [
                { playerId: targetPlayerId, newColor: '#' + newVictimColor.toString(16).padStart(6, '0') },
                { playerId: aggressorId, newColor: '#' + newAggressorColor.toString(16).padStart(6, '0') }
            ]);
            
            // --- LIFE LOST LOGIC ---
            if (players[targetPlayerId].hitCount >= 3) {
                players[targetPlayerId].lives -= 1;
                players[targetPlayerId].hitCount = 0; // Reset hit counter
                
                console.log(`💔 Player ${players[targetPlayerId].name} lost a life! Now has ${players[targetPlayerId].lives} lives`);
                
                // Check if player is eliminated
                if (players[targetPlayerId].lives <= 0) {
                    console.log(`☠️ Player ${players[targetPlayerId].name} eliminated with score ${players[targetPlayerId].score}!`);
                    
                    // Notify ALL players of elimination. This is the sole signal for clients to handle it.
                    io.emit('eliminated', {
                        finalScore: players[targetPlayerId].score,
                        playerId: targetPlayerId
                    });
                    
                    // Remove player from the server's state
                    delete players[targetPlayerId];

                } else {
                    // Player lost a life, but is not eliminated. Time to respawn.
                    const spawnX = 100 + Math.random() * (WORLD_WIDTH - 200);
                    const spawnY = 100 + Math.random() * (WORLD_HEIGHT - 200);

                    players[targetPlayerId].x = spawnX;
                    players[targetPlayerId].y = spawnY;

                    // Notify ALL players of the respawn event to trigger effects
                    io.emit('playerRespawned', {
                        playerId: targetPlayerId,
                        newX: spawnX,
                        newY: spawnY
                    });
                }
            }
            
            // Broadcast health update to all players
            io.emit('healthUpdate', { 
                playerId: targetPlayerId, 
                lives: players[targetPlayerId] ? players[targetPlayerId].lives : 0,
                hitCount: players[targetPlayerId] ? players[targetPlayerId].hitCount : 0,
                coinsToLife: players[targetPlayerId] ? players[targetPlayerId].coinsToLife : 0
            });
            
            // Send knockback to both players
            socket.emit('knockback', { direction: 'attacker' });
            io.to(targetPlayerId).emit('knockback', { direction: 'victim' });
            players[targetPlayerId].lastActivity = Date.now();
        }
    });

    // Handle name changes
    socket.on('nameChange', (data) => {
        console.log(`✏️ Player ${socket.id} changing name to:`, data.newName);
        
        if (players[socket.id] && data.newName && data.newName.trim()) {
            const oldName = players[socket.id].name;
            players[socket.id].name = data.newName.trim();
            players[socket.id].lastActivity = Date.now();
            
            console.log(`📝 Name updated: ${oldName} → ${players[socket.id].name}`);
            
            // Broadcast name change to all other players
            socket.broadcast.emit('playerNameChanged', {
                playerId: socket.id,
                newName: players[socket.id].name,
                oldName: oldName
            });
        }
    });

    // Handle heartbeat to keep player active
    socket.on('heartbeat', () => {
        if (players[socket.id]) {
            players[socket.id].lastActivity = Date.now();
            // Optional: send back acknowledgment
            // socket.emit('heartbeatAck');
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