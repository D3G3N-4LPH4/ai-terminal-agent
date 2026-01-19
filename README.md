# AI Terminal Agent - Autonomous Memecoin Trading Platform

A powerful terminal-based interface for cryptocurrency analysis and **autonomous memecoin trading** on Solana, powered by machine learning, Web3 wallet integration, and real-time market scanning.

## 🚀 What's New

### Autonomous Trading Features

- **Live Trading Engine** - Real-time scanning of pump.fun and bonk.fun
- **Telegram Token Scanner** - AI-powered monitoring of Telegram channels for new launches
- **Self-Improving AI Trader** - Q-Learning reinforcement learning that improves over time
- **Web3 Wallet Integration** - Secure Phantom/Solflare wallet support (no private key storage!)
- **Risk Management** - Automated stop loss, take profit, and trailing stops
- **Position Monitoring** - Real-time P&L tracking and auto-exit conditions

### Security & Stability

- ✅ Web3 wallet support (Phantom, Solflare)
- ✅ No private key storage in application
- ✅ Input validation on all configuration
- ✅ Memory leak fixes
- ✅ Comprehensive error handling

## Features

### 🤖 Autonomous Trading

- **Live Trading Scanner** - Monitor pump.fun and bonk.fun for new token launches
- **Telegram Token Scanner** - AI-powered Telegram channel monitoring with Claude analysis
- **AI Trader (Q-Learning)** - Self-improving autonomous trader with reinforcement learning
- **Web3 Wallet Integration** - Secure wallet connection (Phantom, Solflare)
- **Risk Management** - Stop loss, take profit, trailing stops
- **Position Monitoring** - Real-time P&L tracking and auto-exit
- **Simulation Mode** - Test strategies without risking real money

### 📊 Market Analysis

- **LSTM Price Predictions** - Neural network-based crypto price forecasting
- **Multi-Timeframe Analysis** - Analyze trends across different time periods
- **Sentiment Analysis** - Aggregate sentiment from multiple sources
- **Pattern Recognition** - Detect chart patterns automatically
- **Anomaly Detection** - Identify unusual market behavior

### 🔍 Research & Data

- **Web Research** - AI-powered research with citations
- **Google Search Integration** - Search and scrape web content
- **CoinGecko MCP** - Real-time crypto data via Model Context Protocol
- **Multi-API Integration** - CoinMarketCap, Santiment, Parallel AI, and more

### 🎨 User Experience

- **AI Agent (Fenrir)** - Autonomous crypto analysis agent
- **5 Custom Themes** - Fenrir, Inferno, Matrix, Cyberpunk, Nord
- **Terminal Interface** - Full keyboard navigation and command history
- **Real-time Updates** - WebSocket support for live data

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express + Python (Fenrir Trading Bot)
- **ML/AI**: TensorFlow.js + Q-Learning (Reinforcement Learning)
- **Blockchain**: Solana Web3.js + Phantom/Solflare wallets
- **APIs**: CoinGecko, CoinMarketCap, OpenRouter, ScraperAPI, Parallel AI
- **Trading**: pump.fun, bonk.fun integration

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+ (for Fenrir trading bot)
- Solana wallet (Phantom or Solflare) for live trading

### Local Development

1. **Clone the repository**:

```bash
git clone https://github.com/YOUR_USERNAME/ai-terminal-agent.git
cd ai-terminal-agent
```

2. **Install dependencies**:

```bash
npm install
```

3. **Install Python dependencies** (for trading bot):

```bash
cd fenrir-trading-bot
pip install -r requirements.txt
cd ..
```

4. **Start all servers**:

```bash
# Terminal 1 - Frontend
npm run frontend

# Terminal 2 - Backend
npm start

# Terminal 3 - Python Trading Bot (optional, for live trading)
cd fenrir-trading-bot
python app.py
```

5. **Open browser**: http://localhost:5173

### Setting Up for Trading

1. **Install a Solana Wallet**:

   - [Phantom](https://phantom.app) (recommended)
   - [Solflare](https://solflare.com)

2. **Connect Your Wallet**:

```bash
> web3 connect phantom
```

3. **Start Trading in Simulation Mode**:

```bash
> scan start simulation
```

4. **Monitor Performance**:

```bash
> scan status
> scan stats
```

See [TRADING_GUIDE.md](TRADING_GUIDE.md) for complete trading setup instructions.

### Setting Up API Keys

Once the terminal is running, use the `apikeys` command to configure:

**PRIMARY (Required for core functionality):**

- **OpenRouter API** - Multi-model AI access (recommended primary)
- **Anthropic API** - Claude models for high-quality responses
- **ScraperAPI** - Web scraping and Google Search integration

**OPTIONAL (Free fallbacks & extras):**

- Groq API - Fast & free AI models
- Gemini API - Google's free AI models
- CoinGecko API - Cryptocurrency price data
- CoinMarketCap API - Advanced crypto metrics
- Parallel AI - Deep research capabilities
- Santiment API - On-chain analytics

## Available Commands

### 🌐 Web3 Wallet (Secure - Recommended)

- `web3 connect [phantom|solflare]` - Connect Web3 wallet (secure)
- `web3 disconnect` - Disconnect wallet
- `web3 status` - Show connection status
- `web3 balance` - Check wallet balance

### 🔍 Live Trading Scanner

- `scan start [simulation|live]` - Start scanner
- `scan stop` - Stop scanner
- `scan status` - View positions and P&L
- `scan tokens` - List discovered tokens
- `scan config [key]=[value]` - Update configuration
- `scan stats` - Trading statistics

### 🤖 Autonomous AI Trader

- `ai start [conservative|aggressive|degen]` - Start AI trader
- `ai stop` - Stop AI and save learning
- `ai performance` - View AI performance metrics
- `ai strategy` - View current strategy
- `ai decisions` - View recent AI decisions
- `ai reset` - Reset AI learning
- `ai explain` - Explain AI's current state

### ⚔️ Fenrir Trading Bot

- `fenrir start [mode]` - Start trading bot
- `fenrir stop` - Stop the trading bot
- `fenrir status` - Get bot status and portfolio summary
- `fenrir positions` - View all open positions
- `fenrir config` - Show current bot configuration
- `fenrir health` - Check if Python backend is running

### 📱 Telegram Scanner (AI-Powered)

- `telegram start` - Start monitoring Telegram channels
- `telegram stop` - Stop the scanner
- `telegram status` - Show scanner status and statistics
- `telegram alerts [limit]` - View recent token alerts
- `telegram recent [limit]` - View analyzed tokens from database

**Setup Guide**: See [TELEGRAM_GUIDE.md](TELEGRAM_GUIDE.md) for complete setup instructions.

### 🔬 Scout Module (100x Token Discovery)

A systematic 4-phase framework for discovering high-potential tokens:

- `scout discover` - Find candidates from CoinGecko, DexScreener, CoinMarketCap
- `scout screen` - Filter candidates with red flag detection
- `scout evaluate [symbol]` - Deep 50-point scoring analysis
- `scout report [symbol]` - Run 10-point DD checklist
- `scout rank` - View ranked list of evaluated tokens
- `scout watchlist [add|remove symbol]` - Manage watchlist
- `scout config [key=value]` - Configure parameters
- `scout export` - Export research data as JSON
- `scout reset` - Clear all Scout state

**Configuration Options:**

- `marketCap` - ultra (<$300K), emerging (<$1M), early (<$10M), mid (<$100M)
- `sector` - DeFi, AI, Gaming, Meme, Infra, RWA, Any
- `risk` - High, Medium, Low
- `timeline` - Days, Weeks, Months, Years
- `autoScoutTelegramAlerts` - Auto-analyze Telegram token alerts (true/false)

### 📊 Crypto Data & Analysis

- `price [symbol]` - Get current price
- `market [symbol]` - Market analysis
- `trending` - Top trending coins
- `global` - Global market overview

### 🧠 Machine Learning

- `predict [symbol] [days]` - LSTM price predictions
- `sentiment [symbol]` - Multi-source sentiment analysis
- `anomaly [symbol]` - Detect unusual patterns
- `patterns [symbol]` - Identify chart patterns
- `dashboard [symbol]` - Interactive ML dashboard

### 🔍 Research & Analysis

- `research [topic]` - Deep AI research with citations
- `websearch-ai [query]` - AI-powered web search
- `google [query]` - Search Google
- `scrape [url]` - Extract and analyze web content

### 🛠️ System

- `apikeys` - Configure API keys
- `help` - Show all commands
- `clear` - Clear terminal
- `theme` - Change theme
- `status` - Check system status

## Architecture

```
ai-terminal-agent/
├── src/
│   ├── AITerminalAgent.jsx     # Main terminal component
│   ├── ai/
│   │   ├── AutonomousTrader.js # Q-Learning AI trader
│   │   └── LiveTradingEngine.js # pump.fun/bonk.fun scanner
│   ├── api/                     # API integrations
│   │   ├── FenrirTradingAPI.js  # Trading bot API
│   │   └── index.js             # API exports
│   ├── scout/                   # 100x Token Discovery Framework
│   │   ├── ScoutEngine.js       # Main orchestrator
│   │   ├── DiscoveryService.js  # Multi-source discovery
│   │   ├── ScreeningService.js  # Red flag detection
│   │   ├── EvaluationService.js # 50-point scoring
│   │   └── DDService.js         # Due diligence checklist
│   ├── ml/                      # Machine learning modules
│   ├── components/              # React components
│   ├── config/                  # Configuration files
│   └── utils/
│       ├── solanaWallet.js      # Legacy wallet (deprecated)
│       └── web3Wallet.js        # Web3 wallet integration
├── fenrir-trading-bot/          # Python trading bot
│   ├── app.py                   # FastAPI server
│   ├── trading/                 # Trading logic
│   └── requirements.txt         # Python dependencies
├── proxy-server.js              # Express backend
├── TRADING_GUIDE.md             # Complete trading guide
├── render.yaml                  # Render deployment config
└── package.json                 # Dependencies
```

## Security

### Web3 Wallet Security

This application uses industry-standard Web3 wallet integration:

✅ **Secure:**

- Private keys NEVER stored in application
- User approves each transaction individually
- Keys stay in browser wallet extension
- Protection against XSS attacks

❌ **Legacy Wallet (Deprecated):**

- The old `wallet new` command stores keys in localStorage
- Vulnerable to XSS attacks
- Only for development/testing
- **DO NOT USE FOR REAL MONEY**

Always use `web3 connect` for real trading!

### Best Practices

1. **Always test in simulation mode first**
2. **Use Web3 wallets** (Phantom/Solflare) for live trading
3. **Start with small amounts** when going live
4. **Monitor positions** regularly
5. **Set appropriate stop losses** to limit risk
6. **Never share** your private keys or seed phrases

## Trading Guide

For complete trading setup and safety guidelines, see [TRADING_GUIDE.md](TRADING_GUIDE.md).

Key topics covered:

- Web3 wallet setup
- Funding your wallet
- Understanding pump.fun mechanics
- Risk management strategies
- Trading bot configuration
- Autonomous AI trader setup
- Troubleshooting

## Deployment

### Deploy to Render (Recommended)

1. **Push to GitHub** (already done!)

2. **Go to [Render](https://render.com)** and sign up with GitHub

3. **Create New Blueprint**:

   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will detect the `render.yaml` file
   - Click "Apply"

4. **Add Environment Variables** (in Render dashboard):

   ```
   FRONTEND_URL=<your-render-frontend-url>
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

5. **Your app will be live!** 🎉

### Deploy to Railway

1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js
5. Add environment variables in dashboard

### Deploy to Vercel (Frontend Only)

```bash
npm install -g vercel
vercel
```

Note: You'll need to deploy the backend separately (e.g., on Railway or Render).

## Environment Variables

Create a `.env` file (don't commit this!):

```env
# Solana RPC (optional, defaults to public RPC)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Redis for ML caching (optional)
REDIS_URL=redis://localhost:6379

# Production only
FRONTEND_URL=https://your-frontend-url.com
```

Users configure their API keys through the terminal interface using the `apikeys` command.

## Development

### Project Structure

- **Frontend (React)**: Terminal UI, wallet integration, command handling
- **Backend (Node.js)**: API proxy, wallet operations, data aggregation
- **Python Bot**: Live trading execution, blockchain interaction
- **Machine Learning**: TensorFlow.js for predictions, Q-Learning for trading

### Key Components

1. **AITerminalAgent.jsx**: Main terminal interface
2. **LiveTradingEngine.js**: Real-time token discovery and trading
3. **AutonomousTrader.js**: Self-improving AI trader with Q-Learning
4. **web3Wallet.js**: Secure Web3 wallet integration
5. **FenrirTradingAPI.js**: Trading bot API client

### Testing

```bash
# Run frontend tests
npm test

# Test trading in simulation mode
> scan start simulation
> ai start conservative
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (especially trading features in simulation mode)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

### Contribution Guidelines

- Test all trading features in **simulation mode** first
- Add appropriate error handling
- Update documentation (README, TRADING_GUIDE)
- Follow existing code style
- Add comments for complex logic

## Roadmap

- [ ] Additional DEX integrations (Raydium, Jupiter)
- [ ] Advanced AI trading strategies (Deep Q-Learning, Policy Gradients)
- [ ] Portfolio rebalancing features
- [ ] Social sentiment integration (Twitter, Discord)
- [ ] Mobile app version
- [x] Telegram bot integration
- [x] Scout Module (100x Token Discovery Framework)
- [ ] Advanced chart analysis tools
- [ ] Multi-AI ensemble analysis

## License

MIT License - feel free to use this project however you'd like!

## Disclaimer

⚠️ **IMPORTANT DISCLAIMER:**

This software is for educational and research purposes. Trading cryptocurrencies carries significant risk of financial loss. The autonomous trading features are experimental and should be thoroughly tested in simulation mode before using real funds.

**By using this software, you acknowledge that:**

- You understand the risks involved in cryptocurrency trading
- You are responsible for your own trading decisions
- The developers are not liable for any financial losses
- Past performance does not guarantee future results
- This is not financial advice

**Always:**

- Test in simulation mode first
- Start with small amounts
- Use proper risk management
- Never invest more than you can afford to lose

## Support

For issues or questions:

- [Open an issue](https://github.com/YOUR_USERNAME/ai-terminal-agent/issues)
- [Read the Trading Guide](TRADING_GUIDE.md)
- Check existing issues for solutions

## Acknowledgments

- Powered by [TensorFlow.js](https://www.tensorflow.org/js)
- Built with [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Solana integration via [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/)
- AI models via [OpenRouter](https://openrouter.ai/)
- Crypto data from [CoinGecko](https://www.coingecko.com/) and [CoinMarketCap](https://coinmarketcap.com/)

---

**Built with ⚡ by the AI Terminal Agent Team**

_An autonomous trading platform powered by Web3, AI, and real-time market analysis_

🔒 **Secure** • 🤖 **Autonomous** • 📊 **Data-Driven** • 🚀 **Fast**
