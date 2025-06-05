// 🏆 Supabase Leaderboard Client
console.log('📊 Loading leaderboard system...');

class LeaderboardManager {
    constructor() {
        this.supabase = null;
        this.isOnline = false;
        this.lastScores = [];
        this.playerName = this.getPlayerName();
        this.init();
        
        // Display username in UI immediately
        this.updatePlayerNameDisplay();
    }

    async init() {
        try {
            console.log('🚀 Initializing leaderboard system...');
            
            // Check if Supabase is available
            if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                console.log('🔗 Supabase libraries and config found, attempting connection...');
                console.log('📍 URL:', window.SUPABASE_URL);
                console.log('🔑 Has key:', window.SUPABASE_ANON_KEY ? 'YES' : 'NO');
                
                this.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
                await this.testConnection();
                
                if (this.isOnline) {
                    console.log('✅ SUPABASE LEADERBOARD ACTIVE - You are using the global leaderboard!');
                    this.showConnectionStatus('🌐 Connected to Global Leaderboard!', '#4CAF50');
                }
            } else {
                console.log('⚠️ Supabase not available - missing requirements:');
                console.log('   - Supabase library loaded:', typeof supabase !== 'undefined');
                console.log('   - Has SUPABASE_URL:', !!window.SUPABASE_URL, window.SUPABASE_URL || '(empty)');
                console.log('   - Has SUPABASE_ANON_KEY:', !!window.SUPABASE_ANON_KEY, window.SUPABASE_ANON_KEY ? '(set)' : '(empty)');
                console.log('📱 USING LOCAL LEADERBOARD ONLY');
                this.isOnline = false;
                this.showConnectionStatus('📱 Using Local Leaderboard Only', '#FF9800');
            }
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            console.log('📱 FALLING BACK TO LOCAL LEADERBOARD');
            this.isOnline = false;
            this.showConnectionStatus('❌ Connection Failed - Using Local Mode', '#f44336');
        }
    }

    async testConnection() {
        try {
            console.log('🧪 Testing Supabase connection...');
            const { data, error } = await this.supabase
                .from('leaderboard')
                .select('id')
                .limit(1);
            
            if (error) {
                console.error('❌ Supabase query error:', error);
                console.error('🔍 Error details:', {
                    message: error.message,
                    code: error.code,
                    hint: error.hint
                });
                throw error;
            }
            
            console.log('✅ Supabase connection test successful!');
            console.log('🎯 Query returned:', data ? data.length + ' record(s)' : 'empty result');
            this.isOnline = true;
        } catch (error) {
            console.error('❌ Leaderboard table access failed:', error);
            this.isOnline = false;
        }
    }

    updatePlayerNameDisplay() {
        const playerNameElement = document.getElementById('playerNameText');
        if (playerNameElement) {
            playerNameElement.textContent = this.playerName;
            playerNameElement.style.cursor = 'pointer';
            playerNameElement.title = 'Click to change your name';
            
            // Add click handler to change name
            playerNameElement.onclick = () => {
                this.showNameCustomization(this.playerName);
            };
        }
    }

    getPlayerName() {
        let name = localStorage.getItem('playerName');
        if (!name) {
            // Generate a fun random name
            const adjectives = ['Swift', 'Mighty', 'Golden', 'Shadow', 'Cosmic', 'Thunder', 'Crystal', 'Neon'];
            const nouns = ['Hunter', 'Collector', 'Seeker', 'Champion', 'Explorer', 'Warrior', 'Legend', 'Hero'];
            name = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                   nouns[Math.floor(Math.random() * nouns.length)] + 
                   Math.floor(Math.random() * 100);
            localStorage.setItem('playerName', name);
            
            // Show name customization for new users immediately (with delay for better UX)
            setTimeout(() => {
                this.showWelcomeAndNameCustomization(name);
            }, 2000); // Give time for game to load first
        }
        return name;
    }

    showWelcomeAndNameCustomization(generatedName) {
        const modal = document.createElement('div');
        modal.id = 'welcomeModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: flex; align-items: center;
            justify-content: center; z-index: 2000; padding: 20px; box-sizing: border-box;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 380px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="color: #333; margin-bottom: 15px;">🎮 Welcome to Multiplayer Coin Collector!</h3>
                <p style="color: #666; margin-bottom: 20px;">We've given you a random name, but you can customize it:</p>
                <input type="text" id="welcomeNameInput" value="${generatedName}" 
                       style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; 
                              font-size: 18px; text-align: center; margin-bottom: 20px; font-weight: bold; box-sizing: border-box;">
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px;">
                    <button onclick="window.leaderboardManager.saveWelcomeName(); window.leaderboardManager.hideWelcomeModal();" 
                            ontouchend="event.preventDefault(); window.leaderboardManager.saveWelcomeName(); window.leaderboardManager.hideWelcomeModal();"
                            style="padding: 15px 25px; background: #4CAF50; color: white; border: none; 
                                   border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 50px; min-width: 120px; font-weight: bold;">
                        ✅ Use This Name
                    </button>
                    <button onclick="window.leaderboardManager.generateWelcomeName();" 
                            ontouchend="event.preventDefault(); window.leaderboardManager.generateWelcomeName();"
                            style="padding: 15px 25px; background: #2196F3; color: white; border: none; 
                                   border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 50px; min-width: 120px; font-weight: bold;">
                        🎲 Random
                    </button>
                </div>
                <p style="font-size: 12px; color: #999; margin-bottom: 15px;">
                    This name will appear to other players and on leaderboards.<br>
                    You can change it anytime using the "Name" button.
                </p>
                <button onclick="window.leaderboardManager.hideWelcomeModal()" 
                        ontouchend="event.preventDefault(); window.leaderboardManager.hideWelcomeModal();"
                        style="padding: 10px 20px; background: #666; color: white; border: none; 
                               border-radius: 8px; cursor: pointer; font-size: 14px; min-height: 44px;">
                    Skip & Use Generated Name
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Mobile-friendly input handling
        const input = document.getElementById('welcomeNameInput');
        if (input) {
            input.addEventListener('touchstart', function() {
                this.focus();
            });
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.leaderboardManager.saveWelcomeName();
                    window.leaderboardManager.hideWelcomeModal();
                }
            });
        }
    }
    
    saveWelcomeName() {
        const input = document.getElementById('welcomeNameInput');
        if (input) {
            const newName = input.value.trim();
            if (newName && newName.length >= 2) {
                const oldName = this.playerName;
                this.playerName = newName;
                localStorage.setItem('playerName', newName);
                this.updatePlayerNameDisplay();
                
                console.log('✅ Welcome name saved:', newName);
                console.log('🔄 Notifying game of welcome name change immediately...');
                
                // IMMEDIATE local update - don't wait for server
                this.notifyGameOfNameChange(newName);
                
                console.log('📤 Welcome name change processed locally');
            }
        }
    }
    
    generateWelcomeName() {
        const adjectives = ['Swift', 'Mighty', 'Golden', 'Shadow', 'Cosmic', 'Thunder', 'Crystal', 'Neon', 'Blazing', 'Electric'];
        const nouns = ['Hunter', 'Collector', 'Seeker', 'Champion', 'Explorer', 'Warrior', 'Legend', 'Hero', 'Master', 'Pro'];
        const newName = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                       nouns[Math.floor(Math.random() * nouns.length)] + 
                       Math.floor(Math.random() * 100);
        
        const input = document.getElementById('welcomeNameInput');
        if (input) {
            input.value = newName;
        }
    }
    
    hideWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.remove();
        }
    }

    showNameCustomization(currentName) {
        if (document.getElementById('nameModal')) return; // Already showing
        
        const modal = document.createElement('div');
        modal.id = 'nameModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: flex; align-items: center;
            justify-content: center; z-index: 2000; padding: 20px; box-sizing: border-box;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 350px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h3 style="color: #333; margin-bottom: 20px;">🎮 Player Identity</h3>
                <p style="color: #666; margin-bottom: 20px;">Your multiplayer name:</p>
                <input type="text" id="playerNameInput" value="${currentName}" 
                       style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; 
                              font-size: 18px; text-align: center; margin-bottom: 20px; font-weight: bold; box-sizing: border-box;">
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="window.leaderboardManager.saveName()" 
                            ontouchend="event.preventDefault(); window.leaderboardManager.saveName();"
                            style="padding: 15px 25px; background: #4CAF50; color: white; border: none; 
                                   border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 50px; min-width: 120px; font-weight: bold;">
                        ✅ Save Name
                    </button>
                    <button onclick="window.leaderboardManager.generateNewName()" 
                            ontouchend="event.preventDefault(); window.leaderboardManager.generateNewName();"
                            style="padding: 15px 25px; background: #2196F3; color: white; border: none; 
                                   border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 50px; min-width: 120px; font-weight: bold;">
                        🎲 Random
                    </button>
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 15px;">
                    This name will appear on the global leaderboard.<br>
                    Click your name in the top-left or the "Name" button to change it anytime.
                </p>
                <button onclick="window.leaderboardManager.hideNameModal()" 
                        ontouchend="event.preventDefault(); window.leaderboardManager.hideNameModal();"
                        style="position: absolute; top: 15px; right: 15px; background: #ff4444; color: white; 
                               border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; 
                               font-size: 18px; font-weight: bold; min-height: 40px;">
                    ✕
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus the input for easy typing (but be careful on mobile)
        setTimeout(() => {
            const input = document.getElementById('playerNameInput');
            if (input) {
                // Only focus if not on mobile to avoid keyboard issues
                const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
                if (!isMobile) {
                    input.focus();
                }
                input.select();
            }
        }, 100);
        
        // Add mobile-friendly input handling
        const input = document.getElementById('playerNameInput');
        if (input) {
            input.addEventListener('touchstart', function() {
                this.focus();
            });
            
            // Allow Enter key to save
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.leaderboardManager.saveName();
                }
            });
        }
    }

    saveName() {
        const input = document.getElementById('playerNameInput');
        if (input) {
            const newName = input.value.trim();
            if (newName && newName.length >= 2) {
                const oldName = this.playerName;
                this.playerName = newName;
                localStorage.setItem('playerName', newName);
                this.updatePlayerNameDisplay(); // Update UI immediately
                
                console.log('✅ Player name saved:', newName);
                console.log('🔄 Notifying game of name change immediately...');
                
                // IMMEDIATE local update - don't wait for server
                this.notifyGameOfNameChange(newName);
                
                console.log('📤 Name change processed locally, UI should update now');
            }
        }
        this.hideNameModal();
    }

    generateNewName() {
        const adjectives = ['Swift', 'Mighty', 'Golden', 'Shadow', 'Cosmic', 'Thunder', 'Crystal', 'Neon', 'Blazing', 'Electric'];
        const nouns = ['Hunter', 'Collector', 'Seeker', 'Champion', 'Explorer', 'Warrior', 'Legend', 'Hero', 'Master', 'Pro'];
        const newName = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                       nouns[Math.floor(Math.random() * nouns.length)] + 
                       Math.floor(Math.random() * 100);
        
        const input = document.getElementById('playerNameInput');
        if (input) {
            input.value = newName;
        }
    }

    hideNameModal() {
        const modal = document.getElementById('nameModal');
        if (modal) {
            modal.remove();
        }
    }

    async submitScore(score) {
        console.log(`🏆 Submitting score: ${score} for ${this.playerName}`);
        
        if (!this.isOnline || !this.supabase) {
            console.log('📱 Offline mode - score saved locally only');
            this.showConnectionStatus('📱 Score saved locally (offline mode)', '#FF9800');
            return false;
        }

        try {
            console.log('🌐 Submitting to global Supabase leaderboard...');
            const { data, error } = await this.supabase
                .from('leaderboard')
                .insert([
                    {
                        player_name: this.playerName,
                        score: score
                    }
                ]);

            if (error) throw error;
            
            console.log('✅ Score submitted to global leaderboard successfully!');
            this.showConnectionStatus('🌐 Score submitted to global leaderboard!', '#4CAF50');
            this.refreshLeaderboard();
            return true;
        } catch (error) {
            console.error('❌ Failed to submit score to Supabase:', error);
            this.showConnectionStatus('❌ Global submit failed - saved locally', '#f44336');
            return false;
        }
    }

    async getTopScores(limit = 10) {
        if (!this.isOnline || !this.supabase) {
            return this.getLocalTopScores(limit);
        }

        try {
            const { data, error } = await this.supabase
                .from('leaderboard')
                .select('player_name, score, created_at')
                .order('score', { ascending: false })
                .limit(limit);

            if (error) throw error;
            
            this.lastScores = data || [];
            return this.lastScores;
        } catch (error) {
            console.error('❌ Failed to fetch leaderboard:', error);
            return this.getLocalTopScores(limit);
        }
    }

    getLocalTopScores(limit = 10) {
        // Fallback to local storage for offline mode
        const localScores = JSON.parse(localStorage.getItem('localLeaderboard') || '[]');
        return localScores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    saveLocalScore(score) {
        const localScores = JSON.parse(localStorage.getItem('localLeaderboard') || '[]');
        localScores.push({
            player_name: this.playerName,
            score: score,
            created_at: new Date().toISOString()
        });
        
        // Keep only top 50 local scores
        localScores.sort((a, b) => b.score - a.score);
        const trimmed = localScores.slice(0, 50);
        localStorage.setItem('localLeaderboard', JSON.stringify(trimmed));
    }

    async refreshLeaderboard() {
        const scores = await this.getTopScores();
        this.updateLeaderboardUI(scores);
    }

    updateLeaderboardUI(scores) {
        const playerCountElement = document.getElementById('playerCount');
        if (!playerCountElement) return;

        const onlinePlayersCount = Object.keys(window.game?.scene?.scenes[0]?.players || {}).length || 1;
        
        // Clear status indicators with emojis and colors
        let statusIndicator, statusText, statusColor;
        
        if (this.isOnline) {
            statusIndicator = '🌐 GLOBAL';
            statusText = 'Connected to Supabase';
            statusColor = '#4CAF50'; // Green
        } else {
            statusIndicator = '📱 LOCAL';
            statusText = 'Offline Mode';
            statusColor = '#FF9800'; // Orange
        }
        
        const leaderboardHTML = `
            <div style="font-size: 12px; text-align: left;">
                <div style="margin-bottom: 5px;">
                    Players Online: ${onlinePlayersCount}
                </div>
                <div style="color: ${statusColor}; margin-bottom: 3px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                    ${statusIndicator}
                    <span style="font-size: 8px; background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 10px;">
                        ${statusText}
                    </span>
                </div>
                ${scores.slice(0, 3).map((score, index) => `
                    <div style="font-size: 10px; color: ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'};">
                        ${index + 1}. ${score.player_name}: ${score.score}
                    </div>
                `).join('')}
                ${scores.length === 0 ? '<div style="font-size: 10px; color: #888;">No scores yet</div>' : ''}
            </div>
        `;
        
        playerCountElement.innerHTML = leaderboardHTML;
    }

    // Get player's rank in leaderboard
    async getPlayerRank(playerScore) {
        if (!this.isOnline || !this.supabase) {
            const localScores = this.getLocalTopScores(100);
            const rank = localScores.findIndex(score => score.score <= playerScore) + 1;
            return rank || localScores.length + 1;
        }

        try {
            const { count, error } = await this.supabase
                .from('leaderboard')
                .select('*', { count: 'exact', head: true })
                .gt('score', playerScore);

            if (error) throw error;
            return (count || 0) + 1;
        } catch (error) {
            console.error('❌ Failed to get player rank:', error);
            return null;
        }
    }

    // Show rank achievement
    async showRankAchievement(score) {
        const rank = await this.getPlayerRank(score);
        if (!rank) return;

        const camera = window.game?.scene?.scenes[0]?.cameras?.main;
        if (!camera) return;

        const rankText = camera.scene.add.text(camera.centerX, camera.centerY + 50, 
            `Global Rank: #${rank}`, {
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#00FF88',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        camera.scene.tweens.add({
            targets: rankText,
            scaleX: 1.2,
            scaleY: 1.2,
            yoyo: true,
            duration: 500,
            onComplete: () => {
                camera.scene.tweens.add({
                    targets: rankText,
                    alpha: 0,
                    duration: 2000,
                    onComplete: () => rankText.destroy()
                });
            }
        });
    }

    showConnectionStatus(message, color) {
        // Create a temporary status notification
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed; top: 80px; left: 10px; z-index: 1000;
            background: ${color}; color: white; padding: 8px 15px;
            border-radius: 8px; font-size: 14px; font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(-100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    // Notify the game/server of name change
    notifyGameOfNameChange(newName) {
        console.log('🎮 LeaderboardManager: notifyGameOfNameChange called with:', newName);
        
        // Dispatch a global event for GameScene to pick up for local player name update
        window.dispatchEvent(new CustomEvent('localPlayerNameChangeRequest', {
            detail: { newName: newName }
        }));
        console.log('🔔 Dispatched localPlayerNameChangeRequest event with new name:', newName);

        // Still notify the server for other players
        if (window.game && window.game.scene && window.game.scene.scenes[0]) {
            const scene = window.game.scene.scenes[0];
            if (scene.socket) {
                scene.socket.emit('nameChange', { newName: newName });
                console.log('📤 Sent nameChange to server for other players');
            } else {
                console.warn('⚠️ LeaderboardManager: Socket not ready, cannot send nameChange to server.');
            }
        } else {
            console.warn('⚠️ LeaderboardManager: Game scene not ready for server notification.');
        }
        
        // Update single-player UI if that mode is active (no floating name to worry about)
        if (window.gameMode === 'single-player' && window.game && window.game.scene && window.game.scene.scenes[0]) {
            const scene = window.game.scene.scenes[0];
            if (scene.updateUI) {
                scene.updateUI();
                console.log('✅ LeaderboardManager: Updated single-player UI with new name:', newName);
            }
        }
    }
}

// Initialize global leaderboard manager
window.leaderboardManager = new LeaderboardManager();

console.log('✅ Leaderboard system loaded'); 