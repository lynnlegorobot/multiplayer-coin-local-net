console.log('🎮 Game script loading...');

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.items = {};
        this.cursors = null;
        this.joystickData = { x: 0, y: 0 };
        this.score = 0;
        this.itemCount = 0;
        this.maxItems = 15;
        console.log('🎯 GameScene constructor called');
    }

    preload() {
        console.log('📦 Preloading assets...');
        
        // Create simple pixel data for sprites instead of base64
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
        this.load.image('coin', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
        
        // Add loading progress
        this.load.on('progress', (value) => {
            console.log('📊 Loading progress:', Math.round(value * 100) + '%');
        });
        
        this.load.on('complete', () => {
            console.log('✅ Asset loading complete');
        });
    }

    create() {
        console.log('🚀 Creating game scene...');
        
        try {
            // Set world bounds to be larger than screen
            this.physics.world.setBounds(0, 0, 1200, 900);

            // Create player
            this.createPlayer();

            // Generate initial items
            this.generateItems();

            // Setup input
            this.setupInput();

            // Setup mobile controls
            this.setupMobileControls();

            // Update UI
            this.updateUI();

            // Add background pattern
            this.createBackground();
            
            console.log('✅ Game scene created successfully!');
            console.log(`📊 Created ${Object.keys(this.items).length} items`);
            
            // Notify that game is loaded
            if (window.gameLoadedCallback) {
                window.gameLoadedCallback();
            }
            
        } catch (error) {
            console.error('❌ Error creating game scene:', error);
            throw error;
        }
    }

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

    createPlayer() {
        console.log('👤 Creating player...');
        try {
            this.player = this.physics.add.sprite(600, 450, 'player');
            this.player.setDisplaySize(30, 30);
            this.player.setTint(0x00FF88); // Nice green color
            this.player.setCollideWorldBounds(true);

            // Camera follows player
            this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
            this.cameras.main.setZoom(1.2);
            
            console.log('✅ Player created at position:', this.player.x, this.player.y);
        } catch (error) {
            console.error('❌ Error creating player:', error);
            throw error;
        }
    }

    generateItems() {
        console.log(`🪙 Generating ${this.maxItems} items...`);
        try {
            for (let i = 0; i < this.maxItems; i++) {
                this.createItem();
            }
            console.log(`✅ Generated ${Object.keys(this.items).length} items successfully`);
        } catch (error) {
            console.error('❌ Error generating items:', error);
        }
    }

    createItem() {
        try {
            const x = Phaser.Math.Between(50, 1150);
            const y = Phaser.Math.Between(50, 850);
            const id = 'item_' + Date.now() + '_' + Math.random();
            
            const item = this.physics.add.sprite(x, y, 'coin');
            item.setDisplaySize(20, 20);
            item.setTint(0xFFD700); // Gold color
            item.itemId = id;
            
            // Add some sparkle effect
            item.setAlpha(0);
            this.tweens.add({
                targets: item,
                alpha: 1,
                duration: 500,
                ease: 'Power2'
            });

            this.items[id] = item;

            // Add collision detection
            if (this.player) {
                this.physics.add.overlap(this.player, item, () => {
                    this.collectItem(id);
                });
            }
        } catch (error) {
            console.error('❌ Error creating item:', error);
        }
    }

    collectItem(itemId) {
        const item = this.items[itemId];
        if (!item) return;

        console.log('🪙 Collected item! Score:', this.score + 10);

        try {
            // Create collection effect
            this.createCollectionEffect(item.x, item.y);

            // Remove item
            item.destroy();
            delete this.items[itemId];

            // Update score
            this.score += 10;
            this.updateUI();

            // Generate new item after a short delay
            this.time.delayedCall(500, () => {
                this.createItem();
            });

            // Play collection sound effect (visual feedback)
            this.cameras.main.shake(100, 0.01);
        } catch (error) {
            console.error('❌ Error in collectItem:', error);
        }
    }

    createCollectionEffect(x, y) {
        try {
            // Create particle effect
            const particles = this.add.particles(x, y, 'coin', {
                speed: { min: 50, max: 100 },
                scale: { start: 0.3, end: 0 },
                lifespan: 300,
                quantity: 5,
                tint: 0xFFD700
            });

            // Remove particles after animation
            this.time.delayedCall(500, () => {
                particles.destroy();
            });

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

    setupInput() {
        try {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = this.input.keyboard.addKeys('W,S,A,D');
            console.log('⌨️ Keyboard input setup complete');
        } catch (error) {
            console.error('❌ Error setting up input:', error);
        }
    }

    setupMobileControls() {
        console.log('📱 Setting up mobile controls...');
        try {
            const joystick = document.getElementById('joystick');
            const joystickKnob = document.getElementById('joystick-knob');
            
            if (!joystick || !joystickKnob) {
                console.warn('⚠️ Joystick elements not found!');
                return;
            }
            
            let isDragging = false;
            const joystickCenter = { x: 60, y: 60 };
            const joystickRadius = 40;

            const handleStart = (e) => {
                e.preventDefault();
                isDragging = true;
                joystick.style.opacity = '0.8';
                console.log('🎮 Joystick touch started');
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
            
            console.log('✅ Mobile controls setup complete');
        } catch (error) {
            console.error('❌ Error setting up mobile controls:', error);
        }
    }

    update() {
        if (!this.player) return;

        try {
            const speed = 250;
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

            // Apply velocity with smooth movement
            this.player.setVelocity(velocityX, velocityY);

            // Rotate player slightly based on movement direction
            if (velocityX !== 0 || velocityY !== 0) {
                const angle = Math.atan2(velocityY, velocityX);
                this.player.setRotation(angle);
            }
        } catch (error) {
            console.error('❌ Error in update loop:', error);
        }
    }

    updateUI() {
        try {
            const scoreElement = document.getElementById('score');
            const playerCountElement = document.getElementById('playerCount');
            
            if (scoreElement) scoreElement.textContent = this.score;
            if (playerCountElement) playerCountElement.textContent = '1 (Offline Mode)';
        } catch (error) {
            console.error('❌ Error updating UI:', error);
        }
    }
}

// Game configuration
console.log('⚙️ Setting up game configuration...');
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
    backgroundColor: '#1a1a2e'
};

// Initialize the game
console.log('🎮 Initializing Phaser game...');
let game;

try {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGame);
    } else {
        initializeGame();
    }
    
    function initializeGame() {
        try {
            game = new Phaser.Game(config);
            console.log('✅ Game initialized successfully!');
            
            // Handle window resize
            window.addEventListener('resize', () => {
                if (game) {
                    game.scale.resize(window.innerWidth, window.innerHeight);
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            if (window.gameLoadedCallback) {
                // Show error instead of loading screen
                document.getElementById('loadingScreen').innerHTML = `
                    <div style="text-align: center; color: #ff4444;">
                        <h2>❌ Game Initialization Failed</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            🔄 Refresh
                        </button>
                    </div>
                `;
            }
        }
    }
    
} catch (error) {
    console.error('❌ Critical error:', error);
}

// Debug info
console.log('🎯 Game setup complete! Check console for any errors.');
console.log('📱 To test: Use WASD keys or touch the joystick to move around and collect coins!'); 