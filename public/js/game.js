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
        
        // Add background pattern (same as single-player)
        this.createBackground();
        
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

        // Handle player disconnection
        this.socket.on('playerDisconnected', (playerId) => {
            console.log('👋 Player disconnected:', playerId);
            if (this.players[playerId]) {
                // Play player leave sound
                if (window.soundManager) {
                    window.soundManager.playPlayerLeave();
                }
                
                this.players[playerId].destroy();
                delete this.players[playerId];
                
                // Clean up player name
                if (this.playerNames[playerId]) {
                    this.playerNames[playerId].destroy();
                    delete this.playerNames[playerId];
                }
                
                // Clean up player info
                if (this.playerInfo[playerId]) {
                    delete this.playerInfo[playerId];
                }
                
                this.updateUI();
                console.log('🗑️ Removed player and cleaned up:', playerId);
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
                
                this.items[data.itemId].destroy();
                delete this.items[data.itemId];
            } else {
                console.log('⚠️ Item already removed or not found:', data.itemId);
                
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
        const joystickCenter = { x: 60, y: 60 }; // Center of 120px joystick
        const joystickRadius = 40;

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
                joystickKnob.style.transform = `translate(${x - 20}px, ${y - 20}px)`;
                this.joystickData.x = x / joystickRadius;
                this.joystickData.y = y / joystickRadius;
            } else {
                const angle = Math.atan2(y, x);
                const limitedX = Math.cos(angle) * joystickRadius;
                const limitedY = Math.sin(angle) * joystickRadius;
                
                joystickKnob.style.transform = `translate(${limitedX - 20}px, ${limitedY - 20}px)`;
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

        this.players[playerInfo.id] = player;
        
        // Store player info
        this.playerInfo[playerInfo.id] = {
            name: playerInfo.name || window.leaderboardManager?.playerName || 'Anonymous',
            score: 0
        };
        
        // Add name text above player
        this.playerNames[playerInfo.id] = this.add.text(playerInfo.x, playerInfo.y - 30, 
            this.playerInfo[playerInfo.id].name, {
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
            console.log('✅ Created my player:', this.playerInfo[playerInfo.id].name);
        } else {
            console.log('👤 Other player joined:', this.playerInfo[playerInfo.id].name);
        }

        this.updateUI();
    }

    createItem(itemData) {
        // Remove any existing item with same ID first
        if (this.items[itemData.id]) {
            console.log('🔄 Replacing existing item:', itemData.id);
            this.items[itemData.id].destroy();
            delete this.items[itemData.id];
        }
        
        const item = this.physics.add.sprite(itemData.x, itemData.y, 'coin');
        item.setDisplaySize(20, 20);
        item.setTint(0xFFD700); // Gold color
        item.itemId = itemData.id;
        
        // Make hitbox slightly larger for mobile
        item.body.setSize(24, 24);
        
        // Add fade-in animation like single-player
        item.setAlpha(0);
        this.tweens.add({
            targets: item,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });

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
                    
                    // Immediately remove the overlap to prevent duplicate triggers
                    this.physics.world.removeCollider(overlap);
                    
                    // Temporarily disable the item body to prevent multiple collections
                    collectedItem.body.enable = false;
                } else {
                    console.log('⚠️ Item already collected, ignoring collision');
                }
            });
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

                this.tweens.add({
                    targets: particle,
                    x: x + Phaser.Math.Between(-50, 50),
                    y: y + Phaser.Math.Between(-50, 50),
                    alpha: 0,
                    duration: 300,
                    ease: 'Power2',
                    onComplete: () => particle.destroy()
                });
            }

            // Show score popup
            const scoreText = this.add.text(x, y - 30, '+10', {
                fontSize: '20px',
                fontStyle: 'bold',
                color: '#FFD700'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: scoreText,
                y: y - 60,
                alpha: 0,
                duration: 800,
                ease: 'Power2',
                onComplete: () => scoreText.destroy()
            });
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