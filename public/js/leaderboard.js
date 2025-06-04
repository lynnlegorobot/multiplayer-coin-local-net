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
            // Check if Supabase is available
            if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                console.log('🔗 Connecting to Supabase...');
                console.log('📍 URL:', window.SUPABASE_URL);
                console.log('🔑 Has key:', !!window.SUPABASE_ANON_KEY);
                
                this.supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
                await this.testConnection();
                console.log('✅ Supabase leaderboard connected');
            } else {
                console.log('⚠️ Supabase not configured - using offline mode');
                console.log('🔍 Debug info:', {
                    supabaseLibrary: typeof supabase !== 'undefined',
                    hasUrl: !!window.SUPABASE_URL,
                    hasKey: !!window.SUPABASE_ANON_KEY
                });
                this.isOnline = false;
            }
        } catch (error) {
            console.error('❌ Supabase connection failed:', error);
            this.isOnline = false;
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
                throw error;
            }
            
            console.log('✅ Supabase connection test successful');
            this.isOnline = true;
        } catch (error) {
            console.error('❌ Leaderboard table access failed:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                code: error.code,
                hint: error.hint
            });
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
            
            // Show name to user and allow customization immediately
            setTimeout(() => {
                this.showNameCustomization(name);
            }, 1000); // Reduced delay for better UX
        }
        return name;
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
                       style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; 
                              font-size: 16px; text-align: center; margin-bottom: 20px; font-weight: bold;">
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="window.leaderboardManager.saveName()" 
                            style="padding: 12px 20px; background: #4CAF50; color: white; border: none; 
                                   border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 48px;">
                        ✅ Save Name
                    </button>
                    <button onclick="window.leaderboardManager.generateNewName()" 
                            style="padding: 12px 20px; background: #2196F3; color: white; border: none; 
                                   border-radius: 8px; cursor: pointer; font-size: 16px; min-height: 48px;">
                        🎲 Random
                    </button>
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 15px;">
                    This name will appear on the global leaderboard.<br>
                    Click your name in the top-left to change it anytime.
                </p>
                <button onclick="window.leaderboardManager.hideNameModal()" 
                        style="position: absolute; top: 10px; right: 10px; background: #ff4444; color: white; 
                               border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">
                    ✕
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus the input for easy typing
        setTimeout(() => {
            const input = document.getElementById('playerNameInput');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    saveName() {
        const input = document.getElementById('playerNameInput');
        if (input) {
            const newName = input.value.trim();
            if (newName && newName.length >= 2) {
                this.playerName = newName;
                localStorage.setItem('playerName', newName);
                this.updatePlayerNameDisplay(); // Update UI immediately
                console.log('✅ Player name saved:', newName);
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
            return false;
        }

        try {
            const { data, error } = await this.supabase
                .from('leaderboard')
                .insert([
                    {
                        player_name: this.playerName,
                        score: score
                    }
                ]);

            if (error) throw error;
            
            console.log('✅ Score submitted to global leaderboard');
            this.refreshLeaderboard();
            return true;
        } catch (error) {
            console.error('❌ Failed to submit score:', error);
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

        const isOnlineText = this.isOnline ? '🌐 Global' : '📱 Local';
        const topScore = scores.length > 0 ? scores[0].score : 0;
        
        const leaderboardHTML = `
            <div style="font-size: 12px; text-align: left;">
                <div style="margin-bottom: 5px;">
                    Players Online: ${Object.keys(window.game?.scene?.scenes[0]?.players || {}).length || 1}
                </div>
                <div style="color: #FFD700; margin-bottom: 3px;">
                    ${isOnlineText} Leaderboard:
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
}

// Initialize global leaderboard manager
window.leaderboardManager = new LeaderboardManager();

console.log('✅ Leaderboard system loaded'); 