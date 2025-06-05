console.log('🎮 Game script loading...');

// Version tracking for debugging
const GAME_VERSION = 'Single-Player v2024.12.28.5 - Mobile UX';
console.log('📋 Game Version:', GAME_VERSION);

// Update version display in UI
if (document.getElementById('gameVersion')) {
    document.getElementById('gameVersion').textContent = GAME_VERSION;
}

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
        this.highScore = this.getHighScore(); // Load high score
        this.gameStartTime = Date.now(); // Track game start time for leaderboard
        console.log('🎯 GameScene constructor called');
    }

    // Local high score and leaderboard management
    getHighScore() {
        const saved = localStorage.getItem('coinCollectorHighScore');
        return saved ? parseInt(saved) : 0;
    }

    saveHighScore() {
        localStorage.setItem('coinCollectorHighScore', this.score.toString());
        console.log('💾 High score saved:', this.score);
    }

    // Local leaderboard management (top 10 scores)
    getLocalLeaderboard() {
        const saved = localStorage.getItem('coinCollectorLocalLeaderboard');
        return saved ? JSON.parse(saved) : [];
    }

    saveScoreToLocalLeaderboard() {
        if (this.score <= 0) return;

        const playerName = this.getPlayerName();
        const leaderboard = this.getLocalLeaderboard();
        
        // Add new score
        leaderboard.push({
            player_name: playerName,
            score: this.score,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        });
        
        // Sort by score (highest first) and keep only top 10
        leaderboard.sort((a, b) => b.score - a.score);
        const topScores = leaderboard.slice(0, 10);
        
        localStorage.setItem('coinCollectorLocalLeaderboard', JSON.stringify(topScores));
        console.log('📊 Score saved to local leaderboard:', this.score);
        
        return topScores;
    }

    getPlayerName() {
        return localStorage.getItem('playerName') || 'Anonymous Player';
    }

    checkNewHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
            this.showNewHighScoreEffect();
            
            // Save to local leaderboard (no global submission for single player)
            this.saveScoreToLocalLeaderboard();
            this.updateUI(); // Refresh the UI to show new leaderboard
            return true;
        } else {
            // Still save to local leaderboard even if not a high score
            this.saveScoreToLocalLeaderboard();
            this.updateUI(); // Refresh the UI to show updated leaderboard
        }
        return false;
    }

    showNewHighScoreEffect() {
        // Flash the UI and show celebration
        const camera = this.cameras.main;
        camera.flash(1000, 255, 215, 0); // Gold flash
        
        // Show "NEW HIGH SCORE!" text
        const centerX = camera.centerX;
        const centerY = camera.centerY;
        
        const highScoreText = this.add.text(centerX, centerY - 50, 'NEW HIGH SCORE!', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: highScoreText,
            scaleX: 1.2,
            scaleY: 1.2,
            yoyo: true,
            repeat: 3,
            duration: 300,
            onComplete: () => {
                this.tweens.add({
                    targets: highScoreText,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => highScoreText.destroy()
                });
            }
        });
    }

    preload() {
        console.log('📦 Preloading assets...');
        
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
            
            // Play game start sound and setup
            if (window.soundManager) {
                window.soundManager.playGameStart();
                // Start ambient background hum
                setTimeout(() => {
                    window.soundManager.startAmbientHum();
                }, 2000);
            }
            
            // Handle window resize
            window.addEventListener('resize', () => {
                if (game) {
                    game.scale.resize(window.innerWidth, window.innerHeight);
                }
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
            this.player.setDisplaySize(30, 30); // Match multiplayer version size
            this.player.setCollideWorldBounds(true);
            
            // Enable physics body for consistency with multiplayer
            this.player.body.setSize(28, 28); // Slightly smaller hitbox for better feel
            this.player.body.setOffset(1, 1); // Center the hitbox

            // Camera follows player
            this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
            this.cameras.main.setZoom(1.2);
            
            console.log('✅ Player created at position:', this.player.x, this.player.y);
            console.log('🛡️ Player physics body configured for collision detection');
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
            item.setDisplaySize(20, 20); // Match multiplayer version
            item.setTint(0xFFD700); // Gold color
            item.itemId = id;
            
            // Make hitbox slightly larger for mobile (same as multiplayer)
            item.body.setSize(24, 24);
            
            // Add some sparkle effect
            item.setAlpha(0);
            this.tweens.add({
                targets: item,
                alpha: 1,
                duration: 500,
                ease: 'Power2'
            });

            this.items[id] = item;

            // Improved collision detection (same as multiplayer)
            if (this.player) {
                const overlap = this.physics.add.overlap(this.player, item, (player, collectedItem) => {
                    console.log('🎯 Collision detected! Item:', collectedItem.itemId);
                    
                    // Prevent double collection
                    if (this.items[collectedItem.itemId]) {
                        this.collectItem(collectedItem.itemId);
                        
                        // Remove overlap to prevent duplicate triggers
                        this.physics.world.removeCollider(overlap);
                    }
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
            
            // Play coin collection sound
            if (window.soundManager) {
                window.soundManager.playCoinCollect();
            }

            // Remove item
            item.destroy();
            delete this.items[itemId];

            // Update score
            this.score += 10;
            
            // Check for new high score
            this.checkNewHighScore();
            
            // Play score milestone sound for significant achievements
            if (this.score > 0 && this.score % 50 === 0) {
                if (window.soundManager) {
                    window.soundManager.playScoreMilestone(this.score);
                }
            }
            
            this.updateUI();

            // Generate new item after a short delay
            this.time.delayedCall(500, () => {
                this.createItem();
            });

            // Camera shake effect
            this.cameras.main.shake(100, 0.01);
        } catch (error) {
            console.error('❌ Error in collectItem:', error);
        }
    }

    createCollectionEffect(x, y) {
        try {
            // Create simple particle effect with graphics
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
            const joystickCenter = { x: 50, y: 50 };
            const joystickRadius = 34;

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
            if (scoreElement) {
                scoreElement.textContent = this.score;
            }
            
            // Update player name display
            const playerNameElement = document.getElementById('playerNameText');
            if (playerNameElement) {
                playerNameElement.textContent = this.getPlayerName();
            }
            
            // Show local leaderboard
            const playerCountElement = document.getElementById('playerCount');
            if (playerCountElement) {
                const localScores = this.getLocalLeaderboard();
                const highScore = this.highScore;
                
                let leaderboardHTML = `
                    <div style="font-size: 12px; text-align: left;">
                        <div style="margin-bottom: 5px; color: #4CAF50; font-weight: bold;">
                            📱 Single Player
                        </div>
                        <div style="color: #FFD700; margin-bottom: 8px; font-weight: bold;">
                            🏆 Best: ${highScore}
                        </div>
                `;
                
                if (localScores.length > 0) {
                    leaderboardHTML += `
                        <div style="color: #87CEEB; margin-bottom: 3px; font-size: 10px;">
                            📊 Recent Top Scores:
                        </div>
                    `;
                    
                    localScores.slice(0, 3).forEach((score, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                        leaderboardHTML += `
                            <div style="font-size: 9px; color: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}; margin-bottom: 1px;">
                                ${medal} ${score.player_name}: ${score.score}
                            </div>
                        `;
                    });
                } else {
                    leaderboardHTML += `
                        <div style="font-size: 9px; color: #666;">
                            Play to set your first score!
                        </div>
                    `;
                }
                
                leaderboardHTML += `</div>`;
                playerCountElement.innerHTML = leaderboardHTML;
            }
        } catch (error) {
            console.error('❌ Error updating UI:', error);
        }
    }

    // Submit score to leaderboard when game ends or player quits
    async submitFinalScore() {
        if (this.score <= 0) return;
        
        const sessionDuration = (Date.now() - this.gameStartTime) / 1000; // seconds
        
        console.log(`🎮 Single-player session ended - Score: ${this.score}, Duration: ${sessionDuration.toFixed(1)}s`);
        
        // Save to local leaderboard only (no global submission for single player)
        this.saveScoreToLocalLeaderboard();
        console.log('💾 Final score saved to local leaderboard');
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