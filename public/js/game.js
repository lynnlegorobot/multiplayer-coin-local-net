class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.players = {};
        this.items = {};
        this.myPlayer = null;
        this.cursors = null;
        this.joystickData = { x: 0, y: 0 };
        this.lastMoveTime = 0;
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
        // Set world bounds
        this.physics.world.setBounds(0, 0, 800, 600);

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
        
        // Signal that game has loaded successfully
        console.log('🎮 Game scene created successfully');
        if (window.gameLoadedCallback) {
            window.gameLoadedCallback();
        }
    }

    setupSocketEvents() {
        // Add connection debugging
        this.socket.on('connect', () => {
            console.log('🔗 Connected to server with ID:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
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
            } else {
                console.log('⚠️ Player already exists:', playerInfo.id);
            }
        });

        // Handle player movement
        this.socket.on('playerMoved', (playerInfo) => {
            if (this.players[playerInfo.id] && playerInfo.id !== this.socket.id) {
                this.players[playerInfo.id].setPosition(playerInfo.x, playerInfo.y);
            }
        });

        // Handle player disconnection
        this.socket.on('playerDisconnected', (playerId) => {
            console.log('👋 Player disconnected:', playerId);
            if (this.players[playerId]) {
                this.players[playerId].destroy();
                delete this.players[playerId];
                this.updateUI();
                console.log('🗑️ Removed player:', playerId);
            }
        });

        // Handle item collection - IMPROVED
        this.socket.on('itemCollected', (data) => {
            console.log('🪙 Item collected:', data.itemId, 'by player:', data.playerId);
            if (this.items[data.itemId]) {
                // Add particle effect before destroying
                this.createCoinEffect(this.items[data.itemId].x, this.items[data.itemId].y);
                this.items[data.itemId].destroy();
                delete this.items[data.itemId];
            }
            // Create new item
            if (data.newItem) {
                this.createItem(data.newItem);
            }
        });

        // Handle score updates
        this.socket.on('scoreUpdate', (data) => {
            if (data.playerId === this.socket.id) {
                document.getElementById('score').textContent = data.score;
                console.log('📊 Score updated:', data.score);
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

        if (isMyPlayer) {
            this.myPlayer = player;
            this.cameras.main.startFollow(player);
            this.cameras.main.setZoom(1);
        }

        this.updateUI();
    }

    createItem(itemData) {
        const item = this.physics.add.sprite(itemData.x, itemData.y, 'coin');
        item.setDisplaySize(20, 20);
        item.setTint(0xFFD700); // Gold color
        item.itemId = itemData.id;
        
        // Make hitbox slightly larger for mobile
        item.body.setSize(24, 24);

        this.items[itemData.id] = item;

        // Improved collision detection - works better cross-platform
        if (this.myPlayer) {
            // Remove any existing overlap for this item
            this.physics.world.removeCollider(item);
            
            // Add new overlap detection
            const overlap = this.physics.add.overlap(this.myPlayer, item, (player, collectedItem) => {
                console.log('🎯 Collision detected! Item:', collectedItem.itemId);
                
                // Prevent double collection
                if (this.items[collectedItem.itemId]) {
                    this.socket.emit('collectItem', collectedItem.itemId);
                    
                    // Remove overlap to prevent duplicate triggers
                    this.physics.world.removeCollider(overlap);
                }
            });
        }
    }

    // Add visual feedback for coin collection
    createCoinEffect(x, y) {
        // Create sparkle effect
        const particles = this.add.particles(x, y, 'coin', {
            scale: { start: 0.3, end: 0 },
            speed: { min: 50, max: 100 },
            lifespan: 300,
            quantity: 5,
            tint: [0xFFD700, 0xFFF700, 0xFFFF00]
        });
        
        // Clean up after animation
        setTimeout(() => {
            if (particles) {
                particles.destroy();
            }
        }, 500);
    }

    update() {
        if (!this.myPlayer) return;

        const speed = 200;
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
            velocityX = this.joystickData.x * speed;
            velocityY = this.joystickData.y * speed;
        }

        // Apply velocity
        this.myPlayer.setVelocity(velocityX, velocityY);

        // Send position updates (throttled for better mobile performance)
        const now = Date.now();
        if (now - this.lastMoveTime > 33) { // ~30fps for mobile efficiency
            // Only send if player actually moved
            if (Math.abs(velocityX) > 0 || Math.abs(velocityY) > 0) {
                this.socket.emit('playerMovement', {
                    x: this.myPlayer.x,
                    y: this.myPlayer.y
                });
                this.lastMoveTime = now;
            }
        }

        // Remove the redundant collision detection - now handled in createItem
        // This was causing double collection attempts and mobile issues
    }

    updateUI() {
        document.getElementById('playerCount').textContent = Object.keys(this.players).length;
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
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
}); 