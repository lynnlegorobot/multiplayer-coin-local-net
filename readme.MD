# Multiplayer Mobile Phaser.io Game

A real-time multiplayer web-based game built with Phaser.js that runs perfectly on mobile devices. Players can join from any web browser and compete to collect coins in a shared world.

## Features

🎮 **Mobile-Optimized**
- Touch-friendly virtual joystick controls
- Responsive design that works on all screen sizes
- Optimized for phone browsers

🌐 **Real-time Multiplayer**
- Real-time synchronization using Socket.io
- See other players moving in real-time
- Shared game world with collectible items

🏆 **Game Mechanics**
- Collect gold coins to increase your score
- Each player has a unique color
- Live player count and score display

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open on Your Phone
1. Make sure your phone and computer are on the same WiFi network
2. Find your computer's IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. Open your phone's browser and go to `http://YOUR_IP_ADDRESS:3000`

## Development

For development with auto-restart:
```bash
npm run dev
```

## Game Controls

### Mobile Devices
- **Movement**: Use the virtual joystick in the bottom-right corner
- **Collection**: Walk into gold coins to collect them automatically

### Desktop (for testing)
- **Movement**: Arrow keys or WASD
- **Collection**: Walk into gold coins to collect them automatically

## Technical Stack

- **Frontend**: Phaser.js 3.70.0 (game engine)
- **Backend**: Node.js + Express + Socket.io
- **Real-time Communication**: WebSockets
- **Mobile Optimization**: Touch events, responsive design

## Deployment Options

### Option 1: Heroku
1. Create a Heroku app: `heroku create your-game-name`
2. Push to Heroku: `git push heroku main`
3. Share the Heroku URL with friends

### Option 2: Railway
1. Connect your GitHub repository to Railway
2. Deploy automatically
3. Share the Railway URL

### Option 3: Local Network
- Perfect for playing with friends in the same location
- No internet required, just WiFi
- Use your computer's IP address as shown in Quick Start

## File Structure

```
multiplayer-phone-game/
├── server.js              # Node.js server with Socket.io
├── package.json           # Dependencies and scripts
├── public/
│   ├── index.html        # Main HTML file
│   └── js/
│       └── game.js       # Phaser.js game logic
└── README.md             # This file
```

## Customization Ideas

🎨 **Visual Enhancements**
- Add sprite images for players and items
- Create animated characters
- Add particle effects for collecting items

🎮 **Game Features**
- Power-ups and special abilities
- Different types of collectibles
- Player names and chat system
- Game rooms/lobbies

🏆 **Competitive Features**
- Leaderboards
- Match timers
- Team-based gameplay

## Troubleshooting

**Can't connect on mobile?**
- Ensure both devices are on the same WiFi network
- Check your firewall settings
- Try using your computer's actual IP address instead of localhost

**Game feels laggy?**
- Check your WiFi connection
- Reduce the number of players
- Consider deploying to a cloud service for better performance

**Controls not working on mobile?**
- Make sure you're touching the joystick area
- Try refreshing the page
- Check if your browser supports touch events

## Contributing

Feel free to fork this project and add your own features! Some ideas:
- Better graphics and animations
- Sound effects and music
- More game modes
- Player customization

## License

MIT License - feel free to use this code for your own projects!

