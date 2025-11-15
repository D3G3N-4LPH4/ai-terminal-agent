# Proxy Server Setup Guide

## 🚨 Why Do I Need This?

Your AI Terminal Agent makes API calls to services like CoinMarketCap, Helius, Dune Analytics, and ScraperAPI. These APIs **block direct browser requests** due to CORS (Cross-Origin Resource Sharing) security policies.

**Current Status:**
- ✅ **Works in browser:** CoinGecko (price, market, global, news, fear, trending)
- ❌ **Blocked by CORS:** CoinMarketCap, Helius, Dune, ScraperAPI

## 🛠️ Solution: Proxy Server

The `proxy-server.js` file acts as a middleman between your browser and these APIs, solving CORS issues.

---

## 📦 Installation

### 1. Install Dependencies

```bash
cd ai-terminal-agent
npm install express cors node-fetch
```

Or create a `package.json` if you don't have one:

```json
{
  "name": "ai-terminal-proxy",
  "version": "1.0.0",
  "description": "Proxy server for AI Terminal Agent",
  "main": "proxy-server.js",
  "scripts": {
    "start": "node proxy-server.js",
    "dev": "nodemon proxy-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Then run:
```bash
npm install
```

---

## 🚀 Start the Proxy Server

```bash
node proxy-server.js
```

Or for development with auto-reload:
```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 AI Terminal Agent Proxy Server                      ║
║                                                           ║
║   Server running on: http://localhost:3001                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## ⚙️ Update Frontend Configuration

In `src/AITerminalAgent.jsx`, update the API_CONFIG to use the proxy server:

```javascript
const API_CONFIG = {
  dune: {
    baseUrl: "http://localhost:3001/api/dune",  // Changed from https://api.dune.com/api/v1
    apiKey: localStorage.getItem("dune_api_key") || "",
  },
  coinMarketCap: {
    baseUrl: "http://localhost:3001/api/cmc",  // Changed from https://pro-api.coinmarketcap.com/v1
    apiKey: localStorage.getItem("coinmarketcap_api_key") || "",
  },
  helius: {
    baseUrl: "http://localhost:3001/api/helius",  // Changed from https://api.helius.xyz/v0
    rpcUrl: "http://localhost:3001/api/helius/rpc",  // Changed from https://mainnet.helius-rpc.com
    apiKey: localStorage.getItem("helius_api_key") || "",
  },
  scraperAPI: {
    baseUrl: "http://localhost:3001/api/scraper",  // Changed from https://api.scraperapi.com
    apiKey: localStorage.getItem("scraper_api_key") || "",
  },
  // CoinGecko works fine without proxy (no CORS issues)
  coinGecko: {
    baseUrl: "https://api.coingecko.com/api/v3",
  },
};
```

---

## 🧪 Test the Setup

1. **Start the proxy server:**
   ```bash
   node proxy-server.js
   ```

2. **Start your frontend:**
   ```bash
   npm run dev
   ```

3. **Test commands:**
   ```bash
   cmc price BTC
   sol balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   dune query 123456
   ```

4. **Check health:**
   Visit http://localhost:3001/health in your browser

---

## 🔒 Security Notes

- **API Keys:** The proxy server forwards your API keys to the external services. Keep your keys secure.
- **Local Only:** This proxy is for local development. For production, use a proper backend with authentication.
- **HTTPS:** For production deployment, use HTTPS and add proper security headers.

---

## 🌐 Production Deployment

For production, deploy this proxy to:
- **Vercel/Netlify:** Serverless functions
- **Heroku/Railway:** Node.js hosting
- **AWS Lambda:** Serverless API Gateway
- **Your own server:** VPS with nginx/Apache

Update the `origin` in CORS config to your production domain.

---

## ❓ Troubleshooting

### "Cannot find module 'express'"
Run `npm install express cors node-fetch`

### "Port 3001 already in use"
Change the PORT in `proxy-server.js` or stop the other process:
```bash
# On Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# On Mac/Linux
lsof -ti:3001 | xargs kill
```

### API calls still failing
1. Check proxy server is running (http://localhost:3001/health)
2. Verify frontend is using proxy URLs (check API_CONFIG)
3. Ensure API keys are configured in the terminal

---

## 📝 Summary

- ✅ Install dependencies: `npm install express cors node-fetch`
- ✅ Start proxy: `node proxy-server.js`
- ✅ Update frontend API_CONFIG to use `http://localhost:3001/api/[service]`
- ✅ Test commands in terminal

Now all your APIs will work! 🎉
