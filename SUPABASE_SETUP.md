# 🏆 Supabase Leaderboard Setup

This guide shows how to set up Supabase for the multiplayer leaderboard.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Wait for project to initialize (~2 minutes)

### 2. Create Leaderboard Table

In your Supabase dashboard, go to **SQL Editor** and run:

```sql
-- Create leaderboard table
CREATE TABLE leaderboard (
  id BIGSERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster score queries
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read leaderboard
CREATE POLICY "Anyone can view leaderboard" ON leaderboard
FOR SELECT USING (true);

-- Allow anyone to insert scores
CREATE POLICY "Anyone can insert scores" ON leaderboard
FOR INSERT WITH CHECK (true);

-- Allow users to update their own scores (optional)
CREATE POLICY "Users can update scores" ON leaderboard
FOR UPDATE USING (true);
```

### 3. Get Your Credentials

1. Go to **Settings** → **API**
2. Copy your **Project URL**
3. Copy your **anon/public** key

### 4. Add Environment Variables

Create a `.env` file in your project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Railway Deployment

In Railway dashboard, add environment variables:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_ANON_KEY`: Your anon key

## 🎮 Features

- **Global leaderboard** for all multiplayer games
- **Real-time updates** when new high scores are achieved
- **Persistent storage** across game sessions
- **Top 10 display** in game UI

## 🔒 Security

- **Row Level Security** enabled
- **Public read access** for leaderboard viewing
- **Anonymous score submission** (no authentication required)
- **Rate limiting** handled by Supabase

## 📊 Leaderboard Schema

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Unique score ID |
| player_name | TEXT | Player display name |
| score | INTEGER | Points achieved |
| created_at | TIMESTAMP | When score was first achieved |
| updated_at | TIMESTAMP | When score was last updated |

## 🔧 Testing

After setup, the multiplayer version will:
1. **Show top 10 scores** in the UI
2. **Submit scores** automatically when games end
3. **Update leaderboard** in real-time
4. **Handle offline gracefully** (fallback to local scores)

## 🌐 Alternative Setup

If you prefer not to use Supabase:
- Edit `server.js` to use a different database
- Or use local JSON file storage
- Or integrate with Firebase/MongoDB

---

🎉 Your multiplayer leaderboard will be live once configured! 