# Solana Trading Setup Guide

Complete guide for setting up live trading on pump.fun and bonk.fun with Fenrir Trading Bot.

## Quick Start

### 1. Generate a Solana Wallet

```bash
> wallet new
```

This will generate a new Solana wallet and display:
- **Public Key** (your wallet address)
- **Private Key** (⚠️ KEEP SECRET - needed for trading)

**IMPORTANT:** Save both keys securely! The private key controls your funds.

### 2. Fund Your Wallet

You need SOL in your wallet to trade. Options:

**A. Buy SOL on an Exchange**
1. Buy SOL on Coinbase, Binance, or Kraken
2. Withdraw to your wallet public key
3. Wait for confirmation (~30 seconds)
4. Check balance: `wallet balance <your_public_key>`

**B. Use Devnet for Testing (Free)**
```bash
> wallet airdrop <your_public_key> 2
```
This gives you 2 SOL on devnet for testing (no real money).

### 3. Configure Fenrir Bot

The bot needs your private key to execute trades. Add it to the Python backend:

**Method A: Environment Variable (Recommended)**
```bash
cd "c:\Users\pmorr\OneDrive\Desktop\PF-SOL trade code"

# Create .env file
echo WALLET_PRIVATE_KEY=<your_private_key_here> > .env
echo SOLANA_RPC_URL=https://api.mainnet-beta.solana.com >> .env
```

**Method B: Direct Configuration (via API)**
```bash
> fenrir config --wallet <your_private_key>
```

### 4. Start Trading!

**Test First (Simulation Mode)**
```bash
> fenrir start simulation
```
This runs paper trading with fake money to test the system.

**Go Live (Real Money)**
```bash
> fenrir start conservative
```

Trading modes:
- `simulation` - Paper trading (no real funds)
- `conservative` - Low risk (0.05 SOL/trade)
- `aggressive` - Medium risk (0.2 SOL/trade)
- `degen` - High risk (0.5 SOL/trade) ⚠️

## How pump.fun Trading Works

### What is pump.fun?

pump.fun is a Solana platform for launching new memecoins with bonding curve mechanics:

1. **Token Launch**: Anyone can create a token for ~0.02 SOL
2. **Bonding Curve**: Price increases as more people buy
3. **Liquidity Migration**: At a market cap threshold, liquidity moves to Raydium DEX
4. **Early Advantage**: Early buyers get lower prices

### How Fenrir Monitors pump.fun

The bot continuously monitors the pump.fun program address for new token launches:

```
pump.fun Program: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
```

When a new token is detected:
1. **Analyze Liquidity**: Check if enough SOL in the pool
2. **Check Market Cap**: Ensure it's not too large already
3. **Execute Buy**: Purchase tokens using Jupiter aggregator
4. **Monitor Position**: Track price and P&L
5. **Auto-Sell**: Exit based on stop loss, take profit, or time limits

### pump.fun Integration

Fenrir connects to pump.fun through:

**Solana RPC**: Monitors blockchain for new tokens
```
WebSocket: wss://api.mainnet-beta.solana.com
```

**Jupiter Aggregator**: Executes swaps with best prices
```
API: https://quote-api.jup.ag/v6
```

**Transaction Flow**:
```
1. Fenrir detects new token on pump.fun
2. Fetches price quote from Jupiter
3. Creates swap transaction (SOL → Token)
4. Signs with your wallet private key
5. Submits to Solana blockchain
6. Monitors position until exit condition
```

## bonk.fun Trading (Coming Soon)

bonk.fun is similar to pump.fun but with different mechanics. The integration will work the same way:

### Planned bonk.fun Features

- Monitor bonk.fun program for new launches
- Same risk management (stop loss, take profit)
- Cross-platform portfolio tracking
- Unified command interface

### Enable bonk.fun

```bash
> fenrir config --enable-bonkfun
> fenrir start conservative
```

## Trading Commands Reference

### Wallet Management

```bash
wallet new                          # Generate new wallet
wallet import <privateKey>          # Import existing wallet
wallet list                         # List all wallets
wallet balance <publicKey>          # Check balance
wallet export <name>                # View wallet details
wallet delete <name>                # Delete wallet
```

### Bot Control

```bash
fenrir health                       # Check backend status
fenrir start <mode>                 # Start trading
fenrir stop                         # Stop trading
fenrir status                       # Portfolio summary
fenrir positions                    # Open positions
fenrir config                       # View configuration
```

### Monitoring

```bash
# Check status every 30 seconds
while true; do
  clear
  fenrir status
  fenrir positions
  sleep 30
done
```

## Risk Management

### Built-in Protections

1. **Stop Loss (25% default)**
   - Automatically sells if price drops 25%
   - Protects against large losses

2. **Take Profit (100% default)**
   - Automatically sells when profit hits 100%
   - Locks in gains

3. **Trailing Stop (15% default)**
   - Stop loss follows price up
   - Maximizes profits on winning trades

4. **Time-Based Exit (60 min default)**
   - Closes positions after max hold time
   - Prevents getting stuck in dead coins

5. **Liquidity Filters**
   - Minimum 5 SOL liquidity required
   - Prevents buying illiquid tokens

6. **Market Cap Limits**
   - Maximum 100 SOL market cap
   - Focuses on early-stage launches

### Recommended Settings

**Conservative (Low Risk)**
```
Buy Amount: 0.05 SOL
Stop Loss: 25%
Take Profit: 50%
Max Hold Time: 30 min
```

**Aggressive (Medium Risk)**
```
Buy Amount: 0.2 SOL
Stop Loss: 30%
Take Profit: 100%
Max Hold Time: 60 min
```

**Degen (High Risk)**
```
Buy Amount: 0.5 SOL
Stop Loss: 50%
Take Profit: 300%
Max Hold Time: 120 min
```

## Troubleshooting

### "Insufficient funds" Error

Check wallet balance:
```bash
wallet balance <your_public_key>
```

You need:
- Trading amount (e.g., 0.1 SOL)
- Gas fees (~0.001 SOL per transaction)
- Buffer for price slippage

**Solution:** Transfer more SOL to your wallet.

### "Backend not available" Error

Start the Python backend:
```bash
cd "c:\Users\pmorr\OneDrive\Desktop\PF-SOL trade code"
python fenrir_api.py
```

Should see:
```
🚀 Fenrir API server starting...
📡 Available at http://localhost:8000
```

### Trades Not Executing

**Check RPC Connection**
```bash
# Test RPC
curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

**Use Premium RPC (Recommended)**

Free RPCs have rate limits. Get a premium RPC from:
- Helius (https://helius.xyz)
- QuickNode (https://quicknode.com)
- Alchemy (https://alchemy.com)

Add to `.env`:
```
SOLANA_RPC_URL=https://your-premium-rpc-url.com
```

### Positions Not Showing

**Refresh Data**
```bash
fenrir stop
fenrir start <mode>
```

**Check Logs**

In Python backend terminal, look for errors.

## Advanced Configuration

### Custom Trading Parameters

```python
# Edit fenrir_pumpfun_bot.py

config = BotConfig(
    mode=TradingMode.CONSERVATIVE,
    buy_amount_sol=0.1,              # Amount per trade
    stop_loss_pct=25.0,              # Stop loss %
    take_profit_pct=100.0,           # Take profit %
    trailing_stop_pct=15.0,          # Trailing stop %
    max_position_age_minutes=60,     # Max hold time
    min_initial_liquidity_sol=5.0,   # Min liquidity
    max_initial_market_cap_sol=100.0 # Max market cap
)
```

### Multiple Wallets

Run multiple bots with different wallets:

**Bot 1 (Conservative)**
```bash
export WALLET_PRIVATE_KEY=<wallet1_key>
python fenrir_api.py --port 8000 --mode conservative
```

**Bot 2 (Aggressive)**
```bash
export WALLET_PRIVATE_KEY=<wallet2_key>
python fenrir_api.py --port 8001 --mode aggressive
```

### Webhook Notifications

Get notified on trades:

```python
# Add to fenrir_pumpfun_bot.py

import requests

def notify_trade(message):
    requests.post('https://your-webhook-url.com', json={'text': message})

# Call on buy/sell
notify_trade(f"Bought {token_address} for {amount} SOL")
```

## Safety Checklist

Before going live:

- [ ] Test in simulation mode first
- [ ] Start with minimum amounts (0.01-0.05 SOL)
- [ ] Never invest more than you can afford to lose
- [ ] Keep private keys secure (never share)
- [ ] Use premium RPC for reliability
- [ ] Monitor actively (don't leave unattended)
- [ ] Understand pump.fun mechanics
- [ ] Set realistic profit expectations
- [ ] Have a daily loss limit
- [ ] Take breaks if emotional

## Legal Disclaimer

⚠️ **HIGH RISK WARNING**

Trading memecoins is EXTREMELY risky:
- Most tokens go to zero
- Rug pulls are common
- Impermanent loss is real
- You can lose all invested funds

This bot is:
- Experimental software (may have bugs)
- Not financial advice
- Your responsibility to use safely
- No guarantees of profit

Only trade with funds you can afford to lose completely.

## Support

For issues or questions:

1. Check logs in Python backend terminal
2. Review this guide
3. Test in simulation mode
4. Check Solana RPC status
5. Open GitHub issue: https://github.com/D3G3N-4LPH4/ai-terminal-agent/issues

## pump.fun Resources

- Website: https://pump.fun
- Program: 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
- Docs: https://docs.pump.fun
- Explorer: https://solscan.io

## Jupiter Aggregator

- Website: https://jup.ag
- API Docs: https://station.jup.ag/docs/apis/swap-api
- GitHub: https://github.com/jup-ag

---

**Happy Trading! 🚀**

Remember: Start small, test thoroughly, and never risk more than you can afford to lose.
