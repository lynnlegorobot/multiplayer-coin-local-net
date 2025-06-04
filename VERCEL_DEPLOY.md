# 🚀 Deploy to Vercel

This guide will help you deploy your Phaser.io mobile game to Vercel in just a few minutes!

## 🎯 What You'll Get

- **Instant global deployment** - Your game will be available worldwide with fast loading
- **Free hosting** - Vercel's free tier is perfect for personal projects
- **Automatic HTTPS** - Secure connection for all players
- **Mobile optimized** - Works perfectly on phones and tablets

## 📱 Current Game Features

✅ **Single-player coin collection game**  
✅ **Mobile-optimized touch controls**  
✅ **Responsive design**  
✅ **Particle effects and animations**  
✅ **Score tracking**  
✅ **Works offline**  

## 🚀 Quick Deploy (2 minutes)

### Option 1: GitHub + Vercel (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add Phaser.io mobile game"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account
   - Click "New Project"
   - Import your repository
   - Click "Deploy" 

3. **Done!** 🎉 Your game is now live at `https://your-project-name.vercel.app`

### Option 2: Vercel CLI (Advanced)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project folder
vercel

# Follow the prompts - choose default settings
```

## 📂 Files That Will Be Deployed

```
public/
├── index.html              # Main game page
├── index-offline.html      # Backup offline version
└── js/
    ├── game.js            # Original multiplayer version
    └── game-offline.js    # Offline version (currently active)
```

## 🎮 Game Controls

- **Mobile**: Use the virtual joystick in bottom-right corner
- **Desktop**: WASD or Arrow keys
- **Goal**: Collect gold coins to increase your score!

## 🔧 Customization Options

Want to make it your own? Here are easy modifications:

### Change Colors
Edit `public/js/game-offline.js`:
```javascript
// Line 60: Change player color
this.player.setTint(0x00FF88); // Green player

// Line 90: Change coin color  
item.setTint(0xFFD700); // Gold coins
```

### Adjust Difficulty
```javascript
// Line 9: More coins on screen
this.maxItems = 20; // Default: 15

// Line 200: Faster movement
const speed = 300; // Default: 250
```

### Add Sound Effects
Add this to your HTML `<head>`:
```html
<script>
// Simple sound effects using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
function playSound(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}
</script>
```

## 🌐 For Real Multiplayer

If you want multiplayer functionality later, you'll need:

1. **Backend service** that supports WebSockets:
   - [Railway](https://railway.app) - Easy Node.js hosting
   - [Heroku](https://heroku.com) - Classic PaaS platform
   - [Render](https://render.com) - Modern alternative

2. **Deploy the server.js** to one of these platforms

3. **Update the game.js** to connect to your backend URL

## 🎯 Next Steps

1. **Deploy now** using the instructions above
2. **Share the URL** with friends to play on their phones
3. **Customize** the game with your own colors and features
4. **Add features** like power-ups, levels, or different game modes

## 📱 Mobile Testing

Test your deployed game on:
- iPhone Safari
- Android Chrome
- iPad
- Any mobile browser

The game is optimized for touch controls and will work great on all devices!

## 🛠️ Troubleshooting

**Game not loading?**
- Check browser console for errors
- Make sure all files are in the `public/` folder
- Verify Vercel deployment logs

**Touch controls not working?**
- Ensure you're using HTTPS (Vercel provides this automatically)
- Try refreshing the page
- Check if your browser supports touch events

**Want to go back to multiplayer?**
- Change `game-offline.js` back to `game.js` in `index.html`
- Deploy the `server.js` to a Node.js hosting service
- Update the Socket.io connection URL

---

🎉 **Enjoy your deployed mobile game!** Share the URL and let friends play from their phones anywhere in the world! 