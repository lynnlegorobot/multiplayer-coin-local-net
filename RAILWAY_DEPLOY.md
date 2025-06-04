# 🚂 Deploy to Railway

Deploy your **real multiplayer** Phaser.io game to Railway! Perfect for WebSockets and real-time gaming.

## 🎯 What You'll Get

- **Real-time multiplayer** with Socket.io WebSockets
- **Global deployment** with automatic scaling
- **Custom domain support** 
- **Environment variables** for configuration
- **Persistent connections** (unlike Vercel's serverless)

## 🚀 Quick Deploy (3 minutes)

### Method 1: GitHub Integration (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click **"Start a New Project"**
   - Select **"Deploy from GitHub repo"**
   - Choose your repository
   - Railway will auto-detect Node.js and deploy! 🎉

3. **Configure (Optional):**
   - Set custom domain if desired
   - Configure environment variables if needed

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy your project
railway link
railway up
```

## 🎮 Multiplayer Features

✅ **Real-time player movement**  
✅ **Shared coin collection**  
✅ **Live player count**  
✅ **Instant synchronization**  
✅ **Mobile optimized**  

## 🌐 After Deployment

1. **Get your game URL** (Railway provides a custom URL like `https://your-project.up.railway.app`)
2. **Share with friends** using the QR code feature
3. **Play together** in real-time from any device!

## 📱 Mobile Access

- **QR Code sharing** works perfectly
- **Touch controls** optimized for phones
- **Responsive design** adapts to all screen sizes
- **PWA ready** - can be "installed" on phones

## ⚙️ Configuration

Railway automatically detects your Node.js app using:
- `package.json` with start script
- `Procfile` for process definition
- `railway.json` for deployment config

## 🔧 Environment Variables

You can set these in Railway dashboard:
- `PORT` (automatically set by Railway)
- `NODE_ENV=production` (for optimization)

## 🎯 Scaling

Railway automatically:
- **Scales** based on traffic
- **Handles** multiple concurrent players
- **Manages** WebSocket connections
- **Provides** SSL/HTTPS automatically

## 🏆 Advantages over Vercel

| Feature | Railway | Vercel |
|---------|---------|--------|
| WebSockets | ✅ Full support | ❌ Limited |
| Persistent connections | ✅ Yes | ❌ Serverless only |
| Real-time multiplayer | ✅ Perfect | ❌ Not suitable |
| Node.js backends | ✅ Native | ⚠️ Functions only |
| Socket.io | ✅ Works great | ❌ Won't work |

## 🐛 Troubleshooting

**Build failing?**
- Check `package.json` has correct `start` script
- Ensure Node.js version is specified in engines

**Can't connect?**
- Check Railway logs in dashboard
- Verify WebSocket connections aren't blocked

**Players not syncing?**
- Check browser console for Socket.io errors
- Ensure HTTPS is working (Railway provides this automatically)

## 🎮 Game Features

Once deployed, your game will have:
- **Multiple players** can join simultaneously
- **Real-time movement** synchronization
- **Shared coin collection** system
- **Live scoring** and player count
- **Mobile-first** design with touch controls

## 📊 Monitoring

Railway dashboard shows:
- **Live metrics** (CPU, memory, network)
- **Deployment logs** for debugging
- **Player connections** and activity
- **Error tracking** and alerts

---

🎉 **Your multiplayer game will be live in minutes!** Perfect for playing with friends anywhere in the world. 