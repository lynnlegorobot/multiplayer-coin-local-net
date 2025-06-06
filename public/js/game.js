// Version tracking for debugging
const GAME_VERSION = 'Multiplayer v2024.12.28.7 - Name Fix MK2';
console.log('📋 Game Version:', GAME_VERSION);

// Update version display in UI
setTimeout(() => {
    if (document.getElementById('gameVersion')) {
        document.getElementById('gameVersion').textContent = GAME_VERSION;
    }
}, 1000);

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = {};
        this.items = {};
        this.myPlayer = null;
        this.cursors = null;
        this.joystickData = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.score = 0;
        this.gameStartTime = Date.now();
        this.playerInfo = {};
        this.playerNames = {};
        
        // Health system
        this.lives = 3;
        this.hitCount = 0;
        this.coinsToLife = 100;
        this.isKnockedBack = false;
        this.knockbackVelocity = { x: 0, y: 0 };
        this.lastHeartbeat = 0;
        
        // Track movement state for collision determination
        this.isMoving = false;
        this.lastMovementTime = 0;
        
        // CLEANUP TRACKING - Add these to track what needs cleanup
        this.itemOverlaps = {}; // Track overlap detectors for coins
        this.playerColliders = {}; // Track collision detectors for players
        this.activeTweens = []; // Track active tweens for cleanup
        this.activeEffects = []; // Track active effect objects
    }

    preload() {
        // Create simple colored rectangles for sprites using Phaser graphics
        // This avoids data URI issues in deployed environments
        
        // Create player sprite
        const playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0x4CAF50); // Green color
        playerGraphics.fillRect(0, 0, 32, 32);
        playerGraphics.generateTexture('player', 32, 32);
        playerGraphics.destroy();
        
        // Create coin sprite  
        const coinGraphics = this.add.graphics();
        coinGraphics.fillStyle(0xFFD700); // Gold color
        coinGraphics.fillCircle(16, 16, 14);
        coinGraphics.generateTexture('coin', 32, 32);
        coinGraphics.destroy();
        
        console.log('✅ Sprites created using Phaser graphics generation');
    }

    create() {
        // Set world bounds to be larger than screen (same as single-player)
        this.physics.world.setBounds(0, 0, 1200, 900);

        // Initialize socket connection
        this.socket = io();

        // Handle socket events
        this.setupSocketEvents();

        // Setup input
        this.setupInput();

        // Setup mobile controls
        this.setupMobileControls();

        // Update score display
        this.updateUI();
        
        // Initialize health UI
        this.updateHealthUI();
        
        // Add background pattern (same as single-player)
        this.createBackground();
        
        // Listen for local name change requests from LeaderboardManager
        this.nameChangeEventListener = (event) => {
            if (event.detail && typeof event.detail.newName === 'string') {
                this.handleLocalPlayerNameUpdate(event.detail.newName);
            }
        };
        window.addEventListener('localPlayerNameChangeRequest', this.nameChangeEventListener);
        console.log('🎧 GameScene: Listening for localPlayerNameChangeRequest events.');
        
        // Signal that game has loaded successfully
        console.log('🎮 Game scene created successfully');
        if (window.gameLoadedCallback) {
            window.gameLoadedCallback();
        }
        
        // Play game start sound
        if (window.soundManager) {
            window.soundManager.playGameStart();
            // Start ambient background hum
            setTimeout(() => {
                window.soundManager.startAmbientHum();
            }, 2000);
        }
    }

    setupSocketEvents() {
        // Add connection debugging
        this.socket.on('connect', () => {
            console.log('🔗 Connected to server with ID:', this.socket.id);
            
            // Join game with player name
            const playerName = window.leaderboardManager?.playerName || 'Anonymous';
            this.socket.emit('joinGame', { playerName: playerName });
            console.log('🎮 Joining game as:', playerName);
            
            // Initialize leaderboard when connected
            if (window.leaderboardManager) {
                window.leaderboardManager.refreshLeaderboard();
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            // Submit final score when disconnecting
            this.submitFinalScore();
        });

        // Receive current players when joining
        this.socket.on('currentPlayers', (players) => {
            console.log('👥 Received current players:', Object.keys(players).length);
            
            // IMPORTANT: Clean up any existing player data first to prevent ghosts
            this.performGlobalCleanup();
            
            Object.keys(players).forEach((id) => {
                if (id === this.socket.id) {
                    this.createPlayer(players[id], true);
                    console.log('✅ Created my player:', id);
                } else {
                    this.createPlayer(players[id], false);
                    console.log('➕ Added existing player:', id);
                }
            });
        });

        // Receive game state
        this.socket.on('gameState', (gameState) => {
            console.log('🎮 Received game state with', gameState.items.length, 'items');
            gameState.items.forEach((item) => {
                this.createItem(item);
            });
        });

        // Handle new player joining - FIXED
        this.socket.on('newPlayer', (playerInfo) => {
            console.log('🆕 New player joined:', playerInfo.id);
            // Only create if we don't already have this player
            if (!this.players[playerInfo.id]) {
                this.createPlayer(playerInfo, false);
                console.log('✅ Created new player:', playerInfo.id);
                
                // Play player join sound
                if (window.soundManager) {
                    window.soundManager.playPlayerJoin();
                }
            } else {
                console.log('⚠️ Player already exists:', playerInfo.id);
            }
        });

        // Handle player movement
        this.socket.on('playerMoved', (playerInfo) => {
            if (this.players[playerInfo.id] && playerInfo.id !== this.socket.id) {
                this.players[playerInfo.id].setPosition(playerInfo.x, playerInfo.y);
                // Apply rotation if received
                if (playerInfo.rotation !== undefined) {
                    this.players[playerInfo.id].setRotation(playerInfo.rotation);
                }
                
                // Update player name position
                if (this.playerNames[playerInfo.id]) {
                    this.playerNames[playerInfo.id].setPosition(playerInfo.x, playerInfo.y - 35);
                }
            }
        });

        // Handle player name changes
        this.socket.on('playerNameChanged', (data) => {
            console.log('📝 Player name changed:', data.playerId, data.oldName, '→', data.newName);
            
            // Update player info
            if (this.playerInfo[data.playerId]) {
                this.playerInfo[data.playerId].name = data.newName;
            }
            
            // Update name display above player
            if (this.playerNames[data.playerId]) {
                this.playerNames[data.playerId].setText(data.newName);
                console.log('✅ Updated name display for player:', data.playerId);
            }
        });

        // Handle player disconnection
        this.socket.on('playerDisconnected', (playerId) => {
            console.log('👋 Player disconnected:', playerId);
            if (this.players[playerId]) {
                // Play player leave sound
                if (window.soundManager) {
                    window.soundManager.playPlayerLeave();
                }
                
                // ENHANCED CLEANUP - Remove all traces of this player
                this.cleanupPlayer(playerId);
                
                this.updateUI();
                console.log('🗑️ Completely cleaned up player:', playerId);
            }
        });

        // Handle item collection - IMPROVED
        this.socket.on('itemCollected', (data) => {
            console.log('🪙 Item collected:', data.itemId, 'by player:', data.playerId);
            
            const isMyCollection = (data.playerId === this.socket.id);
            
            // Remove the collected item if it exists
            if (this.items[data.itemId]) {
                console.log('🗑️ Removing item from client:', data.itemId);
                
                // Only show effects for MY collections, not opponents'
                if (isMyCollection) {
                    // Add particle effect and screen shake for my collection
                    this.createCoinEffect(this.items[data.itemId].x, this.items[data.itemId].y);
                    
                    // Play coin collection sound
                    if (window.soundManager) {
                        window.soundManager.playCoinCollect();
                    }
                } else {
                    // For opponent collections, just show a subtle visual indicator
                    this.createOpponentCollectionEffect(this.items[data.itemId].x, this.items[data.itemId].y);
                    
                    // Play subtle opponent collection sound
                    if (window.soundManager) {
                        window.soundManager.playOpponentCollect();
                    }
                }
                
                // ENHANCED CLEANUP - Remove collision detector before destroying item
                this.cleanupItem(data.itemId);
            } else {
                console.log('⚠️ Item already removed or not found:', data.itemId);
                
                // Clean up any lingering collision detectors for this item
                if (this.itemOverlaps[data.itemId]) {
                    this.physics.world.removeCollider(this.itemOverlaps[data.itemId]);
                    delete this.itemOverlaps[data.itemId];
                    console.log('🧹 Cleaned up lingering overlap detector for:', data.itemId);
                }
                
                // Show effect at the collection location if provided
                if (data.collectedAt) {
                    if (isMyCollection) {
                        this.createCoinEffect(data.collectedAt.x, data.collectedAt.y);
                        if (window.soundManager) {
                            window.soundManager.playCoinCollect();
                        }
                    } else {
                        this.createOpponentCollectionEffect(data.collectedAt.x, data.collectedAt.y);
                        if (window.soundManager) {
                            window.soundManager.playOpponentCollect();
                        }
                    }
                }
            }
            
            // Create new item
            if (data.newItem) {
                console.log('🆕 Creating new item:', data.newItem.id, 'at', data.newItem.x.toFixed(1), data.newItem.y.toFixed(1));
                this.createItem(data.newItem);
            }
        });

        // Handle score updates - ENHANCED
        this.socket.on('scoreUpdate', (data) => {
            if (data.playerId === this.socket.id) {
                const oldScore = this.score;
                this.score = data.score;
                document.getElementById('score').textContent = data.score;
                console.log('📊 Score updated:', data.score);
                
                // Play score milestone sound for significant achievements
                if (data.score > 0 && data.score % 50 === 0 && data.score > oldScore) {
                    if (window.soundManager) {
                        window.soundManager.playScoreMilestone(data.score);
                    }
                }
                
                // Show rank achievement for significant scores
                if (data.score > 0 && data.score % 100 === 0 && window.leaderboardManager) {
                    window.leaderboardManager.showRankAchievement(data.score);
                }
            }
        });

        // Handle health updates
        this.socket.on('healthUpdate', (data) => {
            if (data.playerId === this.socket.id) {
                this.lives = data.lives;
                this.hitCount = data.hitCount;
                this.coinsToLife = data.coinsToLife;
                this.updateHealthUI();
                console.log(`💖 Health updated - Lives: ${this.lives}, Hits: ${this.hitCount}/3, Coins to life: ${this.coinsToLife}`);
            }
        });

        // Handle extra life gained
        this.socket.on('extraLife', (data) => {
            if (data.playerId === this.socket.id) {
                console.log('💚 Extra life gained!');
                this.showExtraLifeEffect();
                if (window.soundManager) {
                    window.soundManager.playExtraLife();
                }
            }
        });

        // Handle player respawn after losing a life
        this.socket.on('playerRespawned', (data) => {
            const { playerId, newX, newY } = data;
            const player = this.players[playerId];
            if (player) {
                console.log(`💥 Player ${playerId} lost a life and is respawning.`);
                this.handlePlayerRespawn(player, newX, newY);
                if (window.soundManager) window.soundManager.playLifeLost();
                
                // If it's me respawning, ensure camera is still following properly
                if (playerId === this.socket.id && this.myPlayer === player) {
                    console.log('🎯 I am respawning - ensuring camera follows');
                    this.cameras.main.startFollow(this.myPlayer, true, 0.05, 0.05);
                }
            }
        });

        // Handle elimination
        this.socket.on('eliminated', (data) => {
            const player = this.players[data.playerId];
            if (player) {
                console.log(`☠️ Player ${data.playerId} has been eliminated!`);
                
                // Unified handling for all players. The effect now manages its own cleanup.
                this.createFinalEliminationEffect(player, () => {
                    // This callback runs after the animation and cleanup are complete.
                    if (data.playerId === this.socket.id) {
                        // If it was me, show the elimination screen.
                        this.showEliminationScreen(data.finalScore);
                    }
                });
                
                // Play sound
                if (window.soundManager) {
                    window.soundManager.playEliminated();
                }
            } else {
                console.error(`❌ Player ${data.playerId} not found for elimination!`);
            }
        });

        // Handle color changes from hits
        this.socket.on('colorsUpdated', (updates) => {
            updates.forEach(update => {
                const { playerId, newColor } = update;
                const player = this.players[playerId];

                if (player) {
                    // Convert hex string "#RRGGBB" to a number 0xRRGGBB for Phaser
                    const colorNumber = parseInt(newColor.replace(/^#/, ''), 16);
                    console.log(`🎨 Player ${playerId} color changing to ${newColor} (0x${colorNumber.toString(16)})`);
                    player.setTint(colorNumber);
                    
                    // Also update the stored color info, so it persists if player leaves/rejoins view
                    if (this.playerInfo[playerId]) {
                        this.playerInfo[playerId].color = newColor;
                    }
                }
            });
        });

        // Handle knockback effects
        this.socket.on('knockback', (data) => {
            if (this.myPlayer) {
                this.applyKnockback(data.direction);
                console.log('💫 Knockback applied:', data.direction);
            }
        });
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // WASD controls
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    }

    setupMobileControls() {
        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystick-knob');
        
        let isDragging = false;
        const joystickCenter = { x: 50, y: 50 }; // Center of 100px joystick
        const joystickRadius = 34;

        const handleStart = (e) => {
            e.preventDefault();
            isDragging = true;
            // Visual feedback like single-player
            joystick.style.opacity = '0.8';
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const rect = joystick.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const x = clientX - rect.left - joystickCenter.x;
            const y = clientY - rect.top - joystickCenter.y;
            
            const distance = Math.sqrt(x * x + y * y);
            
            if (distance <= joystickRadius) {
                joystickKnob.style.transform = `translate(${x - 16}px, ${y - 16}px)`;
                this.joystickData.x = x / joystickRadius;
                this.joystickData.y = y / joystickRadius;
            } else {
                const angle = Math.atan2(y, x);
                const limitedX = Math.cos(angle) * joystickRadius;
                const limitedY = Math.sin(angle) * joystickRadius;
                
                joystickKnob.style.transform = `translate(${limitedX - 16}px, ${limitedY - 16}px)`;
                this.joystickData.x = limitedX / joystickRadius;
                this.joystickData.y = limitedY / joystickRadius;
            }
        };

        const handleEnd = (e) => {
            e.preventDefault();
            isDragging = false;
            // Reset visual feedback like single-player
            joystick.style.opacity = '0.5';
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            this.joystickData.x = 0;
            this.joystickData.y = 0;
        };

        // Touch events
        joystick.addEventListener('touchstart', handleStart);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);

        // Mouse events for desktop testing
        joystick.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }

    createPlayer(playerInfo, isMyPlayer) {
        const player = this.physics.add.sprite(playerInfo.x, playerInfo.y, 'player');
        player.setDisplaySize(30, 30);
        player.setTint(playerInfo.color);
        player.setCollideWorldBounds(true);
        
        // Enable physics body for collision detection
        player.body.setSize(28, 28); // Slightly smaller hitbox for better feel
        player.body.setOffset(1, 1); // Center the hitbox

        this.players[playerInfo.id] = player;
        
        // Store player info with proper name handling
        const playerName = playerInfo.name || window.leaderboardManager?.playerName || 'Anonymous';
        this.playerInfo[playerInfo.id] = {
            name: playerName,
            score: 0
        };
        
        // Add name text above player with better positioning
        this.playerNames[playerInfo.id] = this.add.text(playerInfo.x, playerInfo.y - 35, 
            playerName, {
            fontSize: '12px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        if (isMyPlayer) {
            this.myPlayer = player;
            // Smooth camera following like single-player
            this.cameras.main.startFollow(player, true, 0.05, 0.05);
            this.cameras.main.setZoom(1.2);
            console.log('✅ Created my player with name:', playerName);
            console.log('🆔 My socket ID:', this.socket.id);
            console.log('📝 Player name object created:', this.playerNames[playerInfo.id] ? 'SUCCESS' : 'FAILED');
            
            // Set up collisions with other players AFTER creating my player
            this.setupPlayerCollisions();
        } else {
            console.log('👤 Other player joined:', playerName);
            
            // If we already have our player, add collision with this new player
            if (this.myPlayer) {
                const collider = this.physics.add.collider(this.myPlayer, player, (playerA, playerB) => {
                    // Add collision effects with throttling
                    const now = Date.now();
                    if (now - this.lastCollisionSound > 500) { // Max once per 500ms
                        console.log('💥 Player collision with:', this.playerInfo[playerInfo.id]?.name || 'Unknown');
                        
                        // Play collision sound
                        if (window.soundManager) {
                            window.soundManager.playPlayerCollision();
                        }
                        
                        this.lastCollisionSound = now;
                    }
                    
                    // Determine who should send the hit to prevent double damage
                    // Use recent movement activity to determine aggressor (much more reliable than velocity)
                    const myRecentlyMoved = now - this.lastMovementTime < 200; // Moved in last 200ms
                    const cooldownOk = now - this.lastHitTime > 1000;
                    
                    // Simple rule: if I'm actively moving and they're not, I'm the aggressor
                    // If both or neither are moving, use socket ID as tiebreaker
                    let iAmAggressor = false;
                    if (myRecentlyMoved && cooldownOk) {
                        iAmAggressor = true; // I'm moving, so I'm probably the aggressor
                    } else if (!myRecentlyMoved && cooldownOk) {
                        iAmAggressor = this.socket.id > playerInfo.id; // Neither moving, use tiebreaker
                    }
                    
                    if (iAmAggressor) {
                        this.socket.emit('playerHit', { targetPlayerId: playerInfo.id });
                        this.lastHitTime = now;
                        console.log(`⚔️ Hit sent - I'm the aggressor (recently moved: ${myRecentlyMoved})`);
                    } else if (cooldownOk) {
                        console.log(`🛡️ I'm the victim (recently moved: ${myRecentlyMoved}) - not sending hit`);
                    }
                });
                
                // STORE COLLIDER FOR CLEANUP
                this.playerColliders[playerInfo.id] = collider;
            }
        }

        this.updateUI();
    }

    // Setup collision detection between our player and all other players
    setupPlayerCollisions() {
        if (!this.myPlayer) return;
        
        // Throttle collision sounds and hits to prevent spam
        this.lastCollisionSound = 0;
        this.lastHitTime = 0;
        
        Object.keys(this.players).forEach(playerId => {
            if (playerId !== this.socket.id && this.players[playerId]) {
                const collider = this.physics.add.collider(this.myPlayer, this.players[playerId], (playerA, playerB) => {
                    // Add collision effects with throttling
                    const now = Date.now();
                    if (now - this.lastCollisionSound > 500) { // Max once per 500ms
                        console.log('💥 Player collision with:', this.playerInfo[playerId]?.name || 'Unknown');
                        
                        // Play collision sound
                        if (window.soundManager) {
                            window.soundManager.playPlayerCollision();
                        }
                        
                        this.lastCollisionSound = now;
                    }
                    
                    // Determine who should send the hit to prevent double damage
                    // Use recent movement activity to determine aggressor (much more reliable than velocity)
                    const myRecentlyMoved = now - this.lastMovementTime < 200; // Moved in last 200ms
                    const cooldownOk = now - this.lastHitTime > 1000;
                    
                    // Simple rule: if I'm actively moving and they're not, I'm the aggressor
                    // If both or neither are moving, use socket ID as tiebreaker
                    let iAmAggressor = false;
                    if (myRecentlyMoved && cooldownOk) {
                        iAmAggressor = true; // I'm moving, so I'm probably the aggressor
                    } else if (!myRecentlyMoved && cooldownOk) {
                        iAmAggressor = this.socket.id > playerId; // Neither moving, use tiebreaker
                    }
                    
                    if (iAmAggressor) {
                        this.socket.emit('playerHit', { targetPlayerId: playerId });
                        this.lastHitTime = now;
                        console.log(`⚔️ Hit sent - I'm the aggressor (recently moved: ${myRecentlyMoved})`);
                    } else if (cooldownOk) {
                        console.log(`🛡️ I'm the victim (recently moved: ${myRecentlyMoved}) - not sending hit`);
                    }
                });
                
                // STORE COLLIDER FOR CLEANUP
                this.playerColliders[playerId] = collider;
            }
        });
        
        console.log('🛡️ Player collision detection enabled');
    }

    createItem(itemData) {
        // Remove any existing item with same ID first (with proper cleanup)
        if (this.items[itemData.id]) {
            console.log('🔄 Replacing existing item:', itemData.id);
            this.cleanupItem(itemData.id);
        }
        
        const item = this.physics.add.sprite(itemData.x, itemData.y, 'coin');
        item.setDisplaySize(20, 20);
        item.setTint(0xFFD700); // Gold color
        item.itemId = itemData.id;
        
        // Make hitbox slightly larger for mobile
        item.body.setSize(24, 24);
        
        // Add fade-in animation like single-player
        item.setAlpha(0);
        const fadeInTween = this.tweens.add({
            targets: item,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        // TRACK TWEEN FOR CLEANUP
        this.activeTweens.push(fadeInTween);

        this.items[itemData.id] = item;

        // Improved collision detection - works better cross-platform
        if (this.myPlayer) {
            // Add new overlap detection
            const overlap = this.physics.add.overlap(this.myPlayer, item, (player, collectedItem) => {
                console.log('🎯 Collision detected! Item:', collectedItem.itemId);
                console.log('📍 Player pos:', player.x.toFixed(1), player.y.toFixed(1));
                console.log('📍 Item pos:', collectedItem.x.toFixed(1), collectedItem.y.toFixed(1));
                
                // Prevent double collection by checking if item still exists
                if (this.items[collectedItem.itemId]) {
                    console.log('📤 Sending collect request for:', collectedItem.itemId);
                    this.socket.emit('collectItem', collectedItem.itemId);
                    
                    // Immediately disable the item body to prevent multiple collections
                    collectedItem.body.enable = false;
                } else {
                    console.log('⚠️ Item already collected, ignoring collision');
                }
            });
            
            // STORE OVERLAP DETECTOR FOR CLEANUP
            this.itemOverlaps[itemData.id] = overlap;
        }
    }

    // Enhanced visual feedback for MY coin collection
    createCoinEffect(x, y) {
        try {
            // Camera shake effect (only for my collections)
            this.cameras.main.shake(100, 0.01);
            
            // Create particle effect with graphics
            for (let i = 0; i < 5; i++) {
                const particle = this.add.graphics();
                particle.fillStyle(0xFFD700);
                particle.fillCircle(0, 0, 3);
                particle.x = x;
                particle.y = y;

                // TRACK PARTICLE FOR CLEANUP
                this.activeEffects.push(particle);

                const particleTween = this.tweens.add({
                    targets: particle,
                    x: x + Phaser.Math.Between(-50, 50),
                    y: y + Phaser.Math.Between(-50, 50),
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => {
                        particle.destroy();
                        // Remove from tracking
                        const index = this.activeEffects.indexOf(particle);
                        if (index > -1) this.activeEffects.splice(index, 1);
                    }
                });
                
                // TRACK TWEEN FOR CLEANUP
                this.activeTweens.push(particleTween);
            }

            // Show score popup
            const scoreText = this.add.text(x, y - 30, '+10', {
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#FFD700'
            }).setOrigin(0.5);

            // TRACK SCORE TEXT FOR CLEANUP
            this.activeEffects.push(scoreText);

            const textTween = this.tweens.add({
                targets: scoreText,
                y: y - 60,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => {
                    scoreText.destroy();
                    // Remove from tracking
                    const index = this.activeEffects.indexOf(scoreText);
                    if (index > -1) this.activeEffects.splice(index, 1);
                }
            });
            
            // TRACK TWEEN FOR CLEANUP
            this.activeTweens.push(textTween);
        } catch (error) {
            console.error('❌ Error creating collection effect:', error);
        }
    }

    // Subtle effect for opponent collections (no screen shake, smaller particles)
    createOpponentCollectionEffect(x, y) {
        try {
            // Create smaller, subtler particle effect
            for (let i = 0; i < 3; i++) {
                const particle = this.add.graphics();
                particle.fillStyle(0xFFD700);
                particle.fillCircle(0, 0, 2); // Smaller particles
                particle.x = x;
                particle.y = y;
                particle.setAlpha(0.6); // Less opacity

                this.tweens.add({
                    targets: particle,
                    x: x + Phaser.Math.Between(-30, 30), // Smaller spread
                    y: y + Phaser.Math.Between(-30, 30),
                    alpha: 0,
                    duration: 200, // Faster duration
                    ease: 'Power1',
                    onComplete: () => particle.destroy()
                });
            }

            // Show opponent indicator (no score since it's not yours)
            const opponentText = this.add.text(x, y - 20, '✨', {
                fontSize: '16px',
                color: '#FFF'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: opponentText,
                y: y - 40,
                alpha: 0,
                duration: 500,
                ease: 'Power1',
                onComplete: () => opponentText.destroy()
            });
        } catch (error) {
            console.error('❌ Error creating opponent collection effect:', error);
        }
    }

    // NEW: Final elimination effect (shrink + spin to nothing)
    createFinalEliminationEffect(player, onCompleteCallback) {
        if (!player) {
            console.error('❌ createFinalEliminationEffect: No player provided!');
            if(onCompleteCallback) onCompleteCallback();
            return;
        }
        
        // Store original position and color
        const originalX = player.x;
        const originalY = player.y;
        const playerColor = player.tintTopLeft || 0xffffff;
        
        // Hide player name immediately
        const playerId = Object.keys(this.players).find(id => this.players[id] === player);
        if (this.playerNames[playerId]) {
            this.playerNames[playerId].setVisible(false);
        }
        
        // Create dramatic camera shake if it's my elimination
        if (playerId === this.socket.id) {
            this.cameras.main.shake(500, 0.02);
        }
        
        // PHASE 1: Dramatic spin and shrink
        const eliminationTween = this.tweens.add({
            targets: player,
            scaleX: 0,
            scaleY: 0,
            rotation: Math.PI * 4,
            alpha: 0.8,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                // PHASE 2: Create final implosion effect
                this.createImplosionEffect(originalX, originalY, playerColor);
                
                // PHASE 3: Clean up the player object after a short delay, then call the callback.
                this.time.delayedCall(500, () => {
                    if (playerId) {
                        this.cleanupPlayer(playerId);
                    }
                    if (onCompleteCallback) {
                        onCompleteCallback();
                    }
                });
            }
        });
        
        this.activeTweens.push(eliminationTween);
        this.createShrinkingParticles(originalX, originalY, playerColor);
    }
    
    // Create implosion effect after shrinking
    createImplosionEffect(x, y, color) {
        // Create inward particle burst
        for (let i = 0; i < 8; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(color);
            particle.fillCircle(0, 0, 4);
            
            // Start particles at outer ring and implode inward
            const angle = (i / 8) * Math.PI * 2;
            const startRadius = 50;
            particle.x = x + Math.cos(angle) * startRadius;
            particle.y = y + Math.sin(angle) * startRadius;

            const implosionTween = this.tweens.add({
                targets: particle,
                x: x,
                y: y,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 500,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
            
            // TRACK TWEEN FOR CLEANUP
            this.activeTweens.push(implosionTween);
        }
        
        // Create final flash effect
        const flash = this.add.graphics();
        flash.fillStyle(0xFFFFFF);
        flash.fillCircle(x, y, 30);
        flash.setAlpha(0.8);
        
        const flashTween = this.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
        
        // TRACK TWEEN FOR CLEANUP
        this.activeTweens.push(flashTween);
    }
    
    // Create particles that follow the shrinking player
    createShrinkingParticles(x, y, color) {
        for (let i = 0; i < 6; i++) {
            const particle = this.add.graphics();
            particle.fillStyle(color);
            particle.fillCircle(0, 0, 2);
            particle.x = x + Phaser.Math.Between(-20, 20);
            particle.y = y + Phaser.Math.Between(-20, 20);

            const shrinkTween = this.tweens.add({
                targets: particle,
                x: x,
                y: y,
                alpha: 0,
                duration: 1500,
                ease: 'Power1',
                onComplete: () => particle.destroy()
            });
            
            // TRACK TWEEN FOR CLEANUP
            this.activeTweens.push(shrinkTween);
        }
    }

    update() {
        if (!this.myPlayer) return;

        // Update player name positions
        Object.keys(this.players).forEach(playerId => {
            if (this.players[playerId] && this.playerNames[playerId]) {
                this.playerNames[playerId].setPosition(
                    this.players[playerId].x, 
                    this.players[playerId].y - 35
                );
            }
        });

        const speed = 250; // Increased speed like single-player
        let velocityX = 0;
        let velocityY = 0;

        // Keyboard controls
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            velocityX = -speed;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            velocityX = speed;
        }

        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            velocityY = -speed;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            velocityY = speed;
        }

        // Mobile joystick controls
        if (Math.abs(this.joystickData.x) > 0.1 || Math.abs(this.joystickData.y) > 0.1) {
            velocityX += this.joystickData.x * speed;
            velocityY += this.joystickData.y * speed;
        }

        // Apply velocity
        this.myPlayer.setVelocity(velocityX, velocityY);
        
        // Track movement state for collision detection
        if (velocityX !== 0 || velocityY !== 0) {
            this.isMoving = true;
            this.lastMovementTime = Date.now();
        } else {
            this.isMoving = false;
        }
        
        // Apply knockback if active
        if (this.isKnockedBack) {
            this.myPlayer.setVelocity(
                this.knockbackVelocity.x, 
                this.knockbackVelocity.y
            );
        }
        
        // Rotation based on movement direction (enhanced like single-player)
        if (velocityX !== 0 || velocityY !== 0) {
            const angle = Math.atan2(velocityY, velocityX);
            this.myPlayer.setRotation(angle);
        }

        // Send position to server (with throttling)
        const now = Date.now();
        if (now - this.lastMoveTime > 16) { // ~60fps throttling
            const playerData = {
                x: this.myPlayer.x,
                y: this.myPlayer.y,
                rotation: this.myPlayer.rotation
            };
            this.socket.emit('playerMovement', playerData);
            this.lastMoveTime = now;
        }
        
        // Send periodic heartbeat to prevent cleanup (every 5 seconds)
        if (!this.lastHeartbeat || now - this.lastHeartbeat > 5000) {
            this.socket.emit('heartbeat');
            this.lastHeartbeat = now;
        }
    }

    updateUI() {
        // Update leaderboard UI if available, otherwise fallback to basic player count
        if (window.leaderboardManager) {
            window.leaderboardManager.updateLeaderboardUI(window.leaderboardManager.lastScores || []);
        } else {
            // Fallback for when leaderboard is not available
            document.getElementById('playerCount').textContent = Object.keys(this.players).length;
        }
    }

    // Add background pattern like single-player
    createBackground() {
        try {
            // Create a subtle grid pattern
            const graphics = this.add.graphics();
            graphics.lineStyle(1, 0x333333, 0.3);
            
            for (let x = 0; x < 1200; x += 50) {
                graphics.moveTo(x, 0);
                graphics.lineTo(x, 900);
            }
            
            for (let y = 0; y < 900; y += 50) {
                graphics.moveTo(0, y);
                graphics.lineTo(1200, y);
            }
            
            graphics.strokePath();
            console.log('✅ Background grid created');
        } catch (error) {
            console.error('❌ Error creating background:', error);
        }
    }

    // Submit score to leaderboard
    async submitFinalScore() {
        if (this.score <= 0) return;
        
        const sessionDuration = (Date.now() - this.gameStartTime) / 1000; // seconds
        
        console.log(`🏆 Game session ended - Score: ${this.score}, Duration: ${sessionDuration.toFixed(1)}s`);
        
        if (window.leaderboardManager) {
            await window.leaderboardManager.submitScore(this.score);
            window.leaderboardManager.saveLocalScore(this.score); // Also save locally as backup
        }
    }

    // Update health UI
    updateHealthUI() {
        const livesElement = document.getElementById('lives');
        const hitCountElement = document.getElementById('hitCount');
        const coinsToLifeElement = document.getElementById('coinsToLife');
        
        if (livesElement) livesElement.textContent = this.lives;
        if (hitCountElement) hitCountElement.textContent = this.hitCount;
        if (coinsToLifeElement) coinsToLifeElement.textContent = this.coinsToLife;
    }

    // Apply knockback effect
    applyKnockback(direction) {
        if (!this.myPlayer || this.isKnockedBack) return;
        
        this.isKnockedBack = true;
        const knockbackForce = 200;
        
        if (direction === 'victim') {
            // Push away from collision
            const angle = Math.random() * Math.PI * 2; // Random direction
            this.knockbackVelocity.x = Math.cos(angle) * knockbackForce;
            this.knockbackVelocity.y = Math.sin(angle) * knockbackForce;
        } else {
            // Slight recoil for attacker
            const angle = Math.random() * Math.PI * 2;
            this.knockbackVelocity.x = Math.cos(angle) * knockbackForce * 0.3;
            this.knockbackVelocity.y = Math.sin(angle) * knockbackForce * 0.3;
        }
        
        // Reset knockback after short duration
        setTimeout(() => {
            this.isKnockedBack = false;
            this.knockbackVelocity.x = 0;
            this.knockbackVelocity.y = 0;
        }, 300);
    }

    // Show extra life visual effect
    showExtraLifeEffect() {
        if (!this.cameras?.main) return;
        
        const camera = this.cameras.main;
        camera.flash(500, 0, 255, 0); // Green flash
        
        const centerX = camera.centerX;
        const centerY = camera.centerY;
        
        const lifeText = this.add.text(centerX, centerY - 100, '💚 EXTRA LIFE! 💚', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#00FF00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: lifeText,
            scaleX: 1.2,
            scaleY: 1.2,
            yoyo: true,
            repeat: 2,
            duration: 300,
            onComplete: () => {
                this.tweens.add({
                    targets: lifeText,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => lifeText.destroy()
                });
            }
        });
    }

    // Show elimination screen
    showEliminationScreen(finalScore) {
        console.log('🏁 showEliminationScreen called with score:', finalScore);
        
        // Submit final score
        this.submitFinalScore();
        
        // Wait a moment to ensure score is submitted, then show leaderboard
        console.log('⏰ Waiting 1000ms for score submission, then showing leaderboard...');
        setTimeout(async () => {
            console.log('📊 Preparing leaderboard display...');
            // Get updated leaderboard data
            let scores = [];
            let isOnline = false;
            
            if (window.leaderboardManager) {
                scores = await window.leaderboardManager.getTopScores(10);
                isOnline = window.leaderboardManager.isOnline;
            }
            
            // Create elimination overlay with integrated leaderboard
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.95); display: flex; align-items: center;
                justify-content: center; z-index: 5000; padding: 20px; box-sizing: border-box;
            `;
            
            // Generate leaderboard HTML
            let leaderboardHTML = '';
            if (scores.length > 0) {
                leaderboardHTML = `
                    <div style="background: #1a1a1a; padding: 20px; border-radius: 15px; margin: 20px 0; max-height: 300px; overflow-y: auto;">
                        <h3 style="color: #FFD700; margin-bottom: 15px; text-align: center;">
                            🏆 ${isOnline ? 'Global' : 'Local'} Leaderboard
                        </h3>
                        <div style="font-size: 14px;">
                            ${scores.map((score, index) => {
                                const isMyScore = score.player_name === (window.leaderboardManager?.playerName || 'Anonymous');
                                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                                const highlight = isMyScore ? 'background: rgba(255, 215, 0, 0.2); border: 1px solid #FFD700;' : '';
                                
                                return `
                                    <div style="display: flex; justify-content: space-between; padding: 8px 12px; margin: 5px 0; 
                                                border-radius: 8px; ${highlight}
                                                color: ${index < 3 ? '#FFD700' : '#ccc'};">
                                        <span>${medal} ${score.player_name}</span>
                                        <span style="font-weight: bold;">${score.score}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            } else {
                leaderboardHTML = `
                    <div style="background: #1a1a1a; padding: 20px; border-radius: 15px; margin: 20px 0;">
                        <p style="color: #888; text-align: center;">No scores yet - be the first!</p>
                    </div>
                `;
            }
            
            modal.innerHTML = `
                <div style="background: #2a2a2a; padding: 40px; border-radius: 20px; text-align: center; max-width: 600px; width: 100%; 
                            border: 3px solid #ff4444; max-height: 90vh; overflow-y: auto;">
                    <h1 style="color: #ff4444; margin-bottom: 20px; font-size: 36px;">☠️ ELIMINATED! ☠️</h1>
                    <div style="color: white; font-size: 24px; margin-bottom: 15px;">
                        <strong>Final Score: ${finalScore}</strong>
                    </div>
                    <div style="color: #ccc; font-size: 16px; margin-bottom: 20px;">
                        All lives exhausted! Here's how you ranked:
                    </div>
                    
                    ${leaderboardHTML}
                    
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
                        <button onclick="location.reload()" 
                                ontouchend="event.preventDefault(); location.reload();"
                                style="padding: 15px 30px; background: #4CAF50; color: white; border: none; 
                                       border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; min-height: 50px;">
                            🔄 Play Again
                        </button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                ontouchend="event.preventDefault(); this.parentElement.parentElement.parentElement.remove();"
                                style="padding: 15px 30px; background: #666; color: white; border: none; 
                                       border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; min-height: 50px;">
                            ❌ Close
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }, 1000); // Give score submission time to complete
    }

    createExplosionEffect(x, y, color) {
        // Use the player's actual color for the particles
        const particleColor = color || 0xffffff;

        for (let i = 0; i < 30; i++) { // More particles for a bigger boom
            const particle = this.add.graphics();
            particle.fillStyle(particleColor, 1);
            // Create small squares for a "bits" feel
            particle.fillRect(-4, -4, 8, 8);
            particle.x = x;
            particle.y = y;
            particle.setAlpha(1);

            const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
            const distance = Phaser.Math.Between(50, 150);
            const duration = Phaser.Math.Between(500, 1000);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: 0,
                duration: duration,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    handlePlayerRespawn(player, newX, newY) {
        if (!player) return;

        // 1. Create explosion at the old position
        // The tint is stored in `tintTopLeft`
        this.createExplosionEffect(player.x, player.y, player.tintTopLeft);

        // 2. Hide the player immediately
        player.setVisible(false);

        // 3. After a delay, move and reveal the player
        const respawnTimer = this.time.delayedCall(1000, () => {
            if (player.active) { // Check if player hasn't been destroyed (e.g., by disconnection)
                player.setPosition(newX, newY);
                player.setAlpha(0);
                player.setVisible(true);

                // Fade them back in
                const fadeInTween = this.tweens.add({
                    targets: player,
                    alpha: 1,
                    duration: 500
                });
                
                // TRACK TWEEN FOR CLEANUP
                this.activeTweens.push(fadeInTween);
            }
        });
    }

    // Handle local player name update from the custom event
    handleLocalPlayerNameUpdate(newName) {
        if (!this.socket || !this.playerInfo[this.socket.id]) {
            console.warn('⚠️ GameScene: Cannot update local name, socket or player not ready.');
            return;
        }
        
        const playerId = this.socket.id;
        console.log(`🎨 GameScene: Handling local name update for player ${playerId} to '${newName}'.`);

        // 1. Update playerInfo (internal data store)
        if (this.playerInfo[playerId]) {
            this.playerInfo[playerId].name = newName;
            console.log(`🧠 GameScene: Updated playerInfo[${playerId}].name to '${newName}'.`);
        } else {
            console.warn(`⚠️ GameScene: playerInfo for ${playerId} not found.`);
        }

        // 2. Update the Phaser Text object (the floating name tag)
        if (this.playerNames[playerId]) {
            this.playerNames[playerId].setText(newName);
            console.log(`🏷️ GameScene: Updated floating name tag for ${playerId} to '${newName}'.`);

            // Optional: A slight visual nudge to ensure Phaser re-renders if needed
            this.playerNames[playerId].setAlpha(0.99); // Temporarily change alpha
            this.time.delayedCall(50, () => { // Phaser's scene timer
                if (this.playerNames && this.playerNames[playerId]) { // Check if still exists
                    this.playerNames[playerId].setAlpha(1.0); // Restore alpha
                }
            });
        } else {
            console.error(`❌ GameScene: playerNames Text object for ${playerId} not found! Cannot update floating name.`);
            console.log('🔍 Available playerNames keys:', Object.keys(this.playerNames || {}));
        }
        
        // 3. Also update the HUD player name text (if it's managed by LeaderboardManager, it might already be updated)
        // For safety, ensure the main HUD name also reflects this immediately.
        const playerNameTextElement = document.getElementById('playerNameText');
        if (playerNameTextElement) {
            playerNameTextElement.textContent = newName;
        }
    }

    // ENHANCED CLEANUP FUNCTIONS
    
    // Clean up a specific player completely
    cleanupPlayer(playerId) {
        console.log('🧹 Starting comprehensive cleanup for player:', playerId);
        
        // Special handling for my own player
        if (playerId === this.socket.id) {
            console.log('💀 Cleaning up my own player due to elimination');
            
            // If this is my active player, clear the reference
            if (this.myPlayer === this.players[playerId]) {
                this.myPlayer = null;
                console.log('🗑️ Cleared myPlayer reference');
            }
        }
        
        // Remove collision detectors for this player
        if (this.playerColliders[playerId]) {
            this.physics.world.removeCollider(this.playerColliders[playerId]);
            delete this.playerColliders[playerId];
            console.log('🗑️ Removed collider for player:', playerId);
        }
        
        // Destroy player sprite
        if (this.players[playerId]) {
            this.players[playerId].destroy();
            delete this.players[playerId];
            console.log('🗑️ Destroyed player sprite:', playerId);
        }
        
        // Clean up player name
        if (this.playerNames[playerId]) {
            this.playerNames[playerId].destroy();
            delete this.playerNames[playerId];
            console.log('🗑️ Destroyed player name:', playerId);
        }
        
        // Clean up player info
        if (this.playerInfo[playerId]) {
            delete this.playerInfo[playerId];
            console.log('🗑️ Removed player info:', playerId);
        }
        
        console.log('✅ Player cleanup complete:', playerId);
    }
    
    // Clean up a specific item completely
    cleanupItem(itemId) {
        console.log('🧹 Starting comprehensive cleanup for item:', itemId);
        
        // Remove overlap detector for this item
        if (this.itemOverlaps[itemId]) {
            this.physics.world.removeCollider(this.itemOverlaps[itemId]);
            delete this.itemOverlaps[itemId];
            console.log('🗑️ Removed overlap detector for item:', itemId);
        }
        
        // Destroy item sprite
        if (this.items[itemId]) {
            this.items[itemId].destroy();
            delete this.items[itemId];
            console.log('🗑️ Destroyed item sprite:', itemId);
        }
        
        console.log('✅ Item cleanup complete:', itemId);
    }
    
    // Clean up all active tweens and effects (useful for preventing memory leaks)
    cleanupTweensAndEffects() {
        console.log('🧹 Cleaning up active tweens and effects...');
        
        // Clean up tracked tweens
        this.activeTweens.forEach(tween => {
            if (tween && tween.remove) {
                tween.remove();
            }
        });
        this.activeTweens = [];
        
        // Clean up tracked effects
        this.activeEffects.forEach(effect => {
            if (effect && effect.destroy) {
                effect.destroy();
            }
        });
        this.activeEffects = [];
        
        console.log('✅ Tweens and effects cleanup complete');
    }
    
    // Global cleanup for when leaving the game or resetting
    performGlobalCleanup() {
        console.log('🧹 Performing global cleanup...');
        
        // Clean up all players except my current active player
        Object.keys(this.players).forEach(playerId => {
            if (playerId !== this.socket.id || this.myPlayer === null) {
                // Clean up other players, or my own dead player if I have no active player
                this.cleanupPlayer(playerId);
            } else {
                console.log('🛡️ Preserving my active player:', playerId);
            }
        });
        
        // Clean up all items
        Object.keys(this.items).forEach(itemId => {
            this.cleanupItem(itemId);
        });
        
        // Clean up tweens and effects
        this.cleanupTweensAndEffects();
        
        console.log('✅ Global cleanup complete');
    }

    // Cleanup event listener when scene shuts down (good practice)
    shutdown() {
        if (this.nameChangeEventListener) {
            window.removeEventListener('localPlayerNameChangeRequest', this.nameChangeEventListener);
            console.log('🔌 GameScene: Removed localPlayerNameChangeRequest event listener.');
        }
        
        // Perform comprehensive cleanup
        this.performGlobalCleanup();
        
        console.log('🔌 GameScene shutdown complete');
    }

    // Phaser 3 uses destroy for full cleanup when scene is stopped & removed
    destroy() {
        this.shutdown(); // Call shutdown for consistency if planning to reuse
        super.destroy();
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'gameCanvas',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: GameScene,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#1a1a2e' // Same background as single-player
};

// Initialize the game
const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});

// Handle page unload/close to submit final score
window.addEventListener('beforeunload', () => {
    const gameScene = game.scene.scenes[0];
    if (gameScene && gameScene.submitFinalScore) {
        gameScene.submitFinalScore();
    }
});

// Handle page visibility change (mobile app switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        const gameScene = game.scene.scenes[0];
        if (gameScene && gameScene.submitFinalScore) {
            gameScene.submitFinalScore();
        }
    }
}); 