# 🚀 AI Terminal Agent - Complete Setup Guide

## 📋 Overview

Your AI Terminal Agent is a **full-stack application** with:
- **Frontend**: React/Vite terminal interface
- **Backend**: Express.js proxy server (solves CORS issues)

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Backend Dependencies

```bash
# Navigate to project directory
cd ai-terminal-agent

# Rename backend package.json
mv backend-package.json package.json

# Install dependencies
npm install
```

### Step 2: Start Backend Server

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 AI Terminal Agent Proxy Server                      ║
║   Server running on: http://localhost:3001                ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 3: Start Frontend (New Terminal)

```bash
# In a NEW terminal window
cd ai-terminal-agent
npm run dev
```

### Step 4: Open in Browser

Visit: **http://localhost:5173**

### Step 5: Configure API Keys

1. Click the **APIs** button in the terminal header
2. Enter your API keys:
   - **Helius**: Get from https://dashboard.helius.dev
   - **CoinMarketCap**: Get from https://pro.coinmarketcap.com/account
   - **Dune Analytics**: Get from https://dune.com/settings/api
   - **OpenRouter**: Get from https://openrouter.ai/keys
   - **ScraperAPI**: Get from https://scraperapi.com
3. Click **Save API Keys**

### Step 6: Test Commands

```bash
# Works without API key (CoinGecko)
price BTC
market ETH
global
news

# Requires API keys (via backend proxy)
cmc price BTC
sol balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
dune query 123456
```

---

## 📁 Project Structure

```
ai-terminal-agent/
├── src/
│   └── AITerminalAgent.jsx    # Frontend React component
├── proxy-server.js             # Backend Express server
├── package.json                # Backend dependencies
├── .env.example                # Backend env template
├── .env.frontend.example       # Frontend env template
├── SETUP-BACKEND.md           # This file
└── PROXY-SETUP.md             # Detailed proxy docs
```

---

## 🔧 Detailed Setup

### Backend Setup

1. **Install Node.js** (if not installed)
   - Download from https://nodejs.org (v14 or higher)

2. **Install Dependencies**
   ```bash
   npm install express cors node-fetch dotenv
   ```

3. **Optional: Development Mode**
   ```bash
   npm install -D nodemon
   npm run dev  # Auto-reload on changes
   ```

4. **Environment Variables (Optional)**
   ```bash
   cp .env.example .env
   # Edit .env if needed (default PORT=3001 works fine)
   ```

### Frontend Setup

1. **Create .env File**
   ```bash
   cp .env.frontend.example .env
   ```

2. **.env Contents:**
   ```
   VITE_BACKEND_URL=http://localhost:3001
   ```

3. **Restart Frontend** (if already running)
   ```bash
   # Press Ctrl+C to stop, then:
   npm run dev
   ```

---

## 🌐 How It Works

### Without Backend (CORS Errors)
```
Browser → CoinMarketCap API ❌ BLOCKED (CORS)
Browser → Helius API ❌ BLOCKED (CORS)
Browser → CoinGecko API ✅ WORKS (CORS enabled)
```

### With Backend (All Working)
```
Browser → Backend Proxy → CoinMarketCap API ✅ WORKS
Browser → Backend Proxy → Helius API ✅ WORKS
Browser → CoinGecko API ✅ WORKS (direct)
```

---

## 📊 API Status

| API | Backend Needed? | Status |
|-----|----------------|--------|
| CoinGecko | ❌ No | ✅ Works in browser |
| CoinMarketCap | ✅ Yes | 🔄 Via proxy |
| Helius (Solana) | ✅ Yes | 🔄 Via proxy |
| Dune Analytics | ✅ Yes | 🔄 Via proxy |
| ScraperAPI | ✅ Yes | 🔄 Via proxy |
| OpenRouter AI | ❌ No | ✅ Works in browser |

---

## 🚀 Running Both Servers

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Backend:**
```bash
npm start
# or for development:
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Option 2: Use Concurrently (Advanced)

```bash
# Install concurrently
npm install -D concurrently

# Add to package.json scripts:
"scripts": {
  "start": "node proxy-server.js",
  "dev": "nodemon proxy-server.js",
  "frontend": "vite",
  "start:all": "concurrently \"npm run dev\" \"npm run frontend\""
}

# Run both at once:
npm run start:all
```

---

## 🔍 Troubleshooting

### "Cannot find module 'express'"
```bash
npm install express cors node-fetch
```

### "Port 3001 already in use"
**Windows:**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:3001 | xargs kill
```

Or change the port in `.env`:
```
PORT=3002
```
And update `.env` frontend:
```
VITE_BACKEND_URL=http://localhost:3002
```

### "CORS error" or "Failed to fetch"
1. Make sure backend is running (`http://localhost:3001/health` should work)
2. Check frontend .env has correct `VITE_BACKEND_URL`
3. Restart both servers after changing .env

### API calls still failing
1. Check backend logs in Terminal 1
2. Verify API keys are configured (click **APIs** button)
3. Test backend health: http://localhost:3001/health

---

## 🌍 Production Deployment

### Deploy Backend

**Option 1: Heroku**
```bash
heroku create your-app-name
git push heroku main
```

**Option 2: Railway**
```bash
# Connect GitHub repo at railway.app
# Auto-deploys on push
```

**Option 3: Vercel/Netlify**
- Use serverless functions
- See PROXY-SETUP.md for details

### Deploy Frontend

1. **Update .env:**
   ```
   VITE_BACKEND_URL=https://your-backend-url.com
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Deploy to:**
   - Vercel: `vercel deploy`
   - Netlify: Drag `dist` folder
   - GitHub Pages: See Vite docs

---

## 🎯 Commands Reference

### Backend Commands
```bash
npm start          # Start production server
npm run dev        # Start with auto-reload (nodemon)
node proxy-server.js  # Start manually
```

### Frontend Commands
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Terminal Commands (In Browser)
```bash
help               # Show all commands
apikeys            # Configure API keys
status             # Check API configuration
price BTC          # CoinGecko - works always
cmc price BTC      # CoinMarketCap - needs backend
sol balance <addr> # Helius - needs backend
dune query 123456  # Dune - needs backend
theme fenrir       # Change theme
clear              # Clear terminal
```

---

## ✅ Checklist

- [ ] Node.js installed (v14+)
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] API keys configured in browser
- [ ] Test command works (try `price BTC`)

---

## 📚 Additional Resources

- [Proxy Setup Details](./PROXY-SETUP.md)
- [Helius Dashboard](https://dashboard.helius.dev)
- [CoinMarketCap API](https://pro.coinmarketcap.com/account)
- [Dune Analytics](https://dune.com/settings/api)

---

## 🆘 Need Help?

1. Check backend is running: http://localhost:3001/health
2. Check browser console for errors (F12)
3. Check backend terminal for error logs
4. Verify .env files are configured correctly

---

**🎉 You're all set! Enjoy your AI Terminal Agent!**
