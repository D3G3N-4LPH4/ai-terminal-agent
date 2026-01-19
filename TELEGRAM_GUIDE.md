# Telegram Token Scanner Integration

## Overview

The Telegram Token Scanner automatically monitors Telegram channels for new token launches and analyzes them using Claude AI. When promising tokens are detected, alerts are sent directly to your AI Terminal Agent in real-time.

## Features

✅ **Multi-Source Detection**
- Automatically extracts contract addresses from Telegram messages
- Supports multiple DEX aggregator URLs (DexScreener, Birdeye, pump.fun, Raydium, Jupiter)
- Keyword-based detection for token announcements

✅ **Multi-Chain Support**
- Solana (SOL)
- Ethereum (ETH)
- Binance Smart Chain (BSC)

✅ **Comprehensive Analysis**
- **Price & Market Data**: Price, market cap, liquidity, volume from DexScreener API
- **Security Checks**: Honeypot detection, buy/sell taxes, proxy contracts via GoPlus Labs API
- **Holder Analysis**: Holder count, concentration risk
- **AI Decision Making**: Claude AI analyzes all metrics and makes buy/no-buy decisions

✅ **Real-Time Integration**
- WebSocket connection sends alerts to Terminal UI instantly
- HTTP API for status monitoring and control
- SQLite database tracks all analyzed tokens

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd telegram-scanner
pip install -r requirements.txt
```

### 2. Get Telegram API Credentials

1. Go to https://my.telegram.org
2. Log in with your phone number
3. Click "API Development Tools"
4. Create a new application:
   - App title: "AI Terminal Agent"
   - Short name: "ai-terminal"
   - Platform: Other
5. Copy your **API ID** and **API Hash**

### 3. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy your key

### 4. Configure Environment Variables

```bash
cd telegram-scanner
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Telegram API (from https://my.telegram.org)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+1234567890

# Telegram channels to monitor (comma-separated)
TELEGRAM_CHATS=@cryptoalphacalls,@pumpfunsignals,@solanatokens

# Claude AI API Key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Keep simulation mode enabled for safety
SIMULATION_MODE=true
```

### 5. Find Telegram Channels to Monitor

**Popular Solana Token Channels:**
- `@pumpfunsignals`
- `@solanatokens`
- `@solanagemhunters`

**How to get channel usernames:**
1. Open Telegram
2. Navigate to the channel
3. Check the channel description or URL
4. Username format: `@channelname`

**How to get numeric IDs (alternative):**
1. Forward a message from the channel to [@userinfobot](https://t.me/userinfobot)
2. It will reply with the chat ID
3. Use the ID in TELEGRAM_CHATS (e.g., `-1001234567890`)

### 6. First Run - Telegram Login

When you first start the scanner, you'll need to authenticate:

```bash
python telegram_bot.py
```

It will prompt you:
1. Enter your phone number (with country code)
2. Enter the code sent to your Telegram app
3. If you have 2FA enabled, enter your password

A session file `token_analyzer_session.session` will be created to save your login.

## Usage

### Starting from Terminal UI

1. Open the AI Terminal Agent
2. Run: `telegram start`
3. Wait for "Telegram scanner started successfully"
4. Monitor alerts in real-time

### Terminal Commands

```bash
# Start the scanner
telegram start

# Check status and statistics
telegram status

# View recent token alerts (last 10 by default)
telegram alerts
telegram alerts 20

# View analyzed tokens from database
telegram recent
telegram recent 50

# Stop the scanner
telegram stop
```

### Running Standalone (Optional)

You can also run the Python bot independently:

```bash
cd telegram-scanner
python telegram_bot.py
```

The bot will:
- Connect to Telegram
- Start monitoring channels
- Run HTTP API on port 8765
- Run WebSocket server on port 8766
- Send alerts to any connected terminals

## How It Works

### 1. Message Detection

When a message is posted in a monitored channel:

```
New token just launched! 🚀
CA: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
https://pump.fun/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

The scanner:
1. Detects the contract address using regex patterns
2. Identifies the blockchain (Solana in this case)
3. Checks if already analyzed (avoids duplicates)

### 2. Metrics Fetching

Concurrently fetches data from multiple sources:

**DexScreener API (Free)**
- Current price
- Market cap & FDV
- Liquidity in USD
- 24h volume

**GoPlus Labs API (Free)**
- Honeypot detection
- Buy/sell tax percentages
- Proxy contract detection
- Mintable token check
- Holder count and distribution

### 3. AI Analysis

Sends all metrics to Claude AI with a structured prompt:

```
You are an expert cryptocurrency token analyst.
Analyze this token and decide whether to buy.

TOKEN: 7xKXtg... (solana)
METRICS:
- Price: $0.00000123
- Liquidity: $15,000
- Honeypot: false
- Buy Tax: 0%
- Sell Tax: 0%
...

Provide decision in JSON format...
```

Claude responds with:
- **Decision**: BUY or NOT_BUY
- **Confidence**: 0.0 to 1.0
- **Reasoning**: Detailed explanation
- **Suggested Amount**: Position size recommendation
- **Warnings**: Risk factors

### 4. Alert Delivery

If decision confidence is high:
1. Alert sent via WebSocket to Terminal
2. Displayed in Terminal UI with full metrics
3. Saved to SQLite database
4. High-confidence BUY signals trigger toast notification

## Configuration Options

### Analysis Thresholds

Edit `.env` to adjust risk parameters:

```env
# Only analyze tokens with at least $10k liquidity
MIN_LIQUIDITY_USD=10000

# Only early-stage tokens (under $1M market cap)
MAX_MARKET_CAP_USD=1000000

# Reject tokens with high taxes
MAX_BUY_TAX_PERCENT=10
MAX_SELL_TAX_PERCENT=10

# Minimum holders to reduce rug risk
MIN_HOLDERS=50

# Maximum single-wallet ownership
MAX_HOLDER_PERCENT=20

# Only tokens launched in last hour
MAX_TOKEN_AGE_HOURS=1.0
```

### Server Ports

If ports conflict with other services:

```env
WS_PORT=8766
HTTP_PORT=8765
```

## Database

All analyzed tokens are saved to SQLite:

```bash
telegram-scanner/token_cache.db
```

**Schema:**
```sql
CREATE TABLE analyzed_tokens (
    address TEXT PRIMARY KEY,
    chain TEXT NOT NULL,
    detected_at TIMESTAMP,
    analyzed_at TIMESTAMP,
    decision TEXT,
    confidence REAL,
    risk_score INTEGER,
    metrics_json TEXT,
    chat_name TEXT
);
```

**Query examples:**

```bash
# View database
sqlite3 telegram-scanner/token_cache.db

# Get all BUY decisions
SELECT address, chain, confidence, risk_score
FROM analyzed_tokens
WHERE decision='BUY'
ORDER BY confidence DESC;

# Get today's tokens
SELECT * FROM analyzed_tokens
WHERE DATE(analyzed_at) = DATE('now');
```

## HTTP API Endpoints

The scanner exposes a REST API:

### GET /status

Returns bot status:

```json
{
  "running": true,
  "monitored_chats": ["@channel1", "@channel2"],
  "simulation_mode": true,
  "connected_clients": 1
}
```

### GET /recent?limit=10

Returns recent analyzed tokens:

```json
{
  "tokens": [
    {
      "address": "7xKXtg...",
      "chain": "solana",
      "decision": "BUY",
      "confidence": 0.85,
      "risk_score": 25,
      "analyzed_at": "2024-01-18T10:30:00"
    }
  ]
}
```

### POST /config

Update configuration dynamically:

```json
{
  "telegram_chats": ["@newchannel1", "@newchannel2"]
}
```

## Troubleshooting

### "Telegram API credentials missing"

Make sure `.env` file exists in `telegram-scanner/` and contains:
```env
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_hash_here
```

### "Anthropic API key missing"

Add to `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### "No Telegram chats configured"

Add channels to monitor:
```env
TELEGRAM_CHATS=@channel1,@channel2
```

### "Module not found" errors

Install dependencies:
```bash
pip install -r telegram-scanner/requirements.txt
```

### Connection issues

Check if ports are available:
```bash
# Windows
netstat -ano | findstr "8765"
netstat -ano | findstr "8766"

# Linux/Mac
lsof -i :8765
lsof -i :8766
```

### Bot gets rate limited

Telegram has rate limits. If you monitor too many channels:
1. Reduce number of channels
2. Increase `analysis_cooldown` in code (default: 60 seconds)

### Database locked errors

Only one bot instance can run at a time. Stop any running instances:
```bash
# Windows
taskkill /F /IM python.exe

# Linux/Mac
pkill -f telegram_bot.py
```

## Security Considerations

⚠️ **IMPORTANT SECURITY WARNINGS**

1. **Never commit .env file to git**
   - Contains sensitive API keys
   - Already in .gitignore

2. **Simulation mode is enabled by default**
   - No real trades are executed
   - Only logs what it would trade

3. **Private keys never exposed**
   - Bot only analyzes tokens
   - Trading execution happens via your Terminal's Web3 wallet

4. **API key protection**
   - Keep Anthropic API key secret
   - Monitor usage at console.anthropic.com
   - Set spending limits

5. **Telegram session security**
   - `.session` file contains login credentials
   - Don't share or commit this file
   - Regenerate if compromised (delete file and restart)

## Cost Estimates

### Anthropic API (Claude)

- **Model**: Claude Sonnet 4
- **Cost**: ~$0.003 per analysis
- **Average**: 1000 tokens per analysis

**Example:**
- 100 tokens/day = $0.30/day = $9/month
- 500 tokens/day = $1.50/day = $45/month
- 1000 tokens/day = $3/day = $90/month

**Tips to reduce costs:**
1. Monitor fewer channels
2. Use stricter filtering (higher MIN_LIQUIDITY_USD)
3. Implement caching for repeated tokens

### Free APIs Used

- ✅ DexScreener (completely free)
- ✅ GoPlus Labs (free tier, 100 requests/minute)
- ✅ Telegram API (free for personal use)

## Advanced Usage

### Multiple Terminal Instances

Multiple terminals can connect to one scanner:

**Terminal 1:**
```bash
telegram start    # Starts the bot
```

**Terminal 2 (different browser/window):**
```bash
telegram alerts   # Views same alerts
```

All connected terminals receive alerts simultaneously.

### Custom Filtering

Edit `telegram_bot.py` to add custom logic:

```python
# Example: Only Solana tokens
if token.chain != 'solana':
    return  # Skip non-Solana tokens

# Example: Only pump.fun launches
if 'pump.fun' not in token.source_message:
    return
```

### Integration with Trading

When a high-confidence alert appears:

1. Note the contract address
2. Use your Terminal's trading commands:
   ```bash
   # Connect Web3 wallet if not already
   web3 connect phantom

   # Use Fenrir to trade (if configured)
   fenrir start simulation
   ```

3. Or manually trade on DEX:
   - Visit pump.fun, Raydium, or Jupiter
   - Paste contract address
   - Execute trade with Web3 wallet

## Roadmap

Future enhancements:

- [ ] **Auto-trading integration**: Automatically execute trades for high-confidence signals
- [ ] **Multi-AI ensemble**: Combine Claude + GPT-4 + local models for better accuracy
- [ ] **Historical backtesting**: Test strategies on past token launches
- [ ] **Discord integration**: Monitor Discord channels in addition to Telegram
- [ ] **Twitter alerts**: Track crypto Twitter for alpha calls
- [ ] **Chart analysis**: OCR + AI to analyze chart screenshots
- [ ] **Smart contract scanning**: Decompile and analyze contract code
- [ ] **Whale wallet tracking**: Monitor large holder movements

## Support

For issues or questions:

1. Check this guide first
2. Review error messages in terminal
3. Check Python bot logs: `telegram-scanner/bot.log`
4. Open an issue on GitHub

## Disclaimer

⚠️ **CRITICAL DISCLAIMER**

This bot is for **EDUCATIONAL and RESEARCH purposes ONLY**.

**Risks:**
- Cryptocurrency trading is EXTREMELY RISKY
- New tokens are HIGHLY SPECULATIVE
- Most new tokens are scams or rugpulls
- AI analysis is NOT a guarantee of profit
- You can lose ALL your investment

**The authors take NO RESPONSIBILITY for:**
- Financial losses from using this bot
- Decisions made based on bot output
- Security issues with API keys or wallets
- Regulatory compliance in your jurisdiction

**By using this code, you acknowledge these risks and use it at YOUR OWN RISK.**

NEVER invest more than you can afford to lose completely.
