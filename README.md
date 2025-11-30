# AI Terminal Agent

A powerful terminal-based interface for cryptocurrency analysis, powered by machine learning and multiple API integrations.

## Features

- **LSTM Price Predictions** - Neural network-based crypto price forecasting
- **Multi-Timeframe Analysis** - Analyze trends across different time periods
- **Sentiment Analysis** - Aggregate sentiment from multiple sources
- **Pattern Recognition** - Detect chart patterns automatically
- **Anomaly Detection** - Identify unusual market behavior
- **Web Research** - AI-powered research with citations
- **Google Search Integration** - Search and scrape web content
- **CoinGecko MCP** - Real-time crypto data via Model Context Protocol
- **AI Agent (Fenrir)** - Autonomous crypto analysis agent
- **5 Custom Themes** - Fenrir, Inferno, Matrix, Cyberpunk, Nord

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **ML**: TensorFlow.js
- **APIs**: CoinGecko, OpenRouter, ScraperAPI, Parallel AI, and more

## Quick Start

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

3. **Start both servers**:
```bash
# Terminal 1 - Frontend
npm run frontend

# Terminal 2 - Backend
npm start
```

4. **Open browser**: http://localhost:5173

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
   REDIS_URL=<optional-redis-url>
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

## Available Commands

### Crypto Data
- `price [symbol]` - Get current price
- `chart [symbol] [days]` - View price chart
- `compare [symbols]` - Compare multiple assets

### Machine Learning
- `predict [symbol] [days]` - LSTM price predictions
- `sentiment [symbol]` - Multi-source sentiment analysis
- `anomaly [symbol]` - Detect unusual patterns
- `patterns [symbol]` - Identify chart patterns

### Research & Analysis
- `research [topic]` - Deep AI research with citations
- `google [query]` - Search Google
- `scrape [url]` - Extract and analyze web content

### AI Agent
- `fenrir [task]` - Autonomous crypto analysis agent

### System
- `apikeys` - Configure API keys
- `help` - Show all commands
- `clear` - Clear terminal
- `Ctrl+T` - Cycle themes

## Architecture

```
ai-terminal-agent/
├── src/
│   ├── AITerminalAgent.jsx     # Main terminal component
│   ├── api/                     # API integrations
│   ├── ml/                      # Machine learning modules
│   ├── components/              # React components
│   ├── config/                  # Configuration files
│   └── utils/                   # Helper functions
├── proxy-server.js              # Express backend
├── render.yaml                  # Render deployment config
└── package.json                 # Dependencies
```

## Environment Variables

Create a `.env` file (don't commit this!):

```env
# Optional - Redis for ML caching
REDIS_URL=redis://localhost:6379

# Production only
FRONTEND_URL=https://your-frontend-url.com
```

Users configure their API keys through the terminal interface.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project however you'd like!

## Support

For issues or questions, please [open an issue](https://github.com/YOUR_USERNAME/ai-terminal-agent/issues).

---

**Built with ⚡ by [Your Name]**

*Powered by TensorFlow.js, React, and multiple crypto APIs*
