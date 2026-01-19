#!/usr/bin/env python3
"""
TELEGRAM TOKEN SCANNER - AI TERMINAL AGENT INTEGRATION
======================================================

Monitors Telegram channels for new token drops and sends alerts to AI Terminal Agent.

⚠️  DISCLAIMER - READ CAREFULLY ⚠️

This bot is for EDUCATIONAL and RESEARCH purposes ONLY.
See full disclaimer in original file.
"""

import asyncio
import logging
import re
import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
import sqlite3

# Required installations:
# pip install telethon python-dotenv requests anthropic web3 base58 aiohttp websockets

try:
    from telethon import TelegramClient, events
    from telethon.tl.types import Message
except ImportError:
    print("ERROR: Install telethon: pip install telethon")
    exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("ERROR: Install python-dotenv: pip install python-dotenv")
    exit(1)

try:
    import requests
except ImportError:
    print("ERROR: Install requests: pip install requests")
    exit(1)

try:
    from anthropic import Anthropic
except ImportError:
    print("WARNING: Anthropic not installed. Install with: pip install anthropic")
    Anthropic = None

try:
    from web3 import Web3
except ImportError:
    print("WARNING: Web3 not installed. Install with: pip install web3")
    Web3 = None

try:
    import base58
except ImportError:
    print("WARNING: base58 not installed. Install with: pip install base58")
    base58 = None

try:
    from aiohttp import web
    import websockets
except ImportError:
    print("ERROR: Install aiohttp and websockets: pip install aiohttp websockets")
    exit(1)


# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class Config:
    """Bot configuration loaded from environment variables"""

    # Telegram API (get from https://my.telegram.org)
    telegram_api_id: int
    telegram_api_hash: str
    telegram_phone: str  # Your phone number

    # Monitored chats (comma-separated chat IDs or usernames)
    telegram_chats: List[str]

    # AI API (Anthropic Claude recommended)
    ai_provider: str = "anthropic"  # or "openai"
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # Trading settings
    simulation_mode: bool = True
    default_buy_amount_eth: float = 0.1
    default_buy_amount_sol: float = 1.0

    # Analysis thresholds
    min_liquidity_usd: float = 10000
    max_market_cap_usd: float = 1000000
    max_buy_tax_percent: float = 10
    max_sell_tax_percent: float = 10
    min_holders: int = 50
    max_holder_percent: float = 20
    max_token_age_hours: float = 1.0

    # Database
    db_path: str = "token_cache.db"

    # HTTP/WebSocket Server
    http_port: int = 8765
    ws_port: int = 8766

    # Logging
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> 'Config':
        """Load configuration from environment variables"""
        load_dotenv()

        return cls(
            telegram_api_id=int(os.getenv("TELEGRAM_API_ID", "0")),
            telegram_api_hash=os.getenv("TELEGRAM_API_HASH", ""),
            telegram_phone=os.getenv("TELEGRAM_PHONE", ""),
            telegram_chats=os.getenv("TELEGRAM_CHATS", "").split(","),
            ai_provider=os.getenv("AI_PROVIDER", "anthropic"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            simulation_mode=os.getenv("SIMULATION_MODE", "true").lower() == "true",
            default_buy_amount_eth=float(os.getenv("DEFAULT_BUY_AMOUNT_ETH", "0.1")),
            default_buy_amount_sol=float(os.getenv("DEFAULT_BUY_AMOUNT_SOL", "1.0")),
            min_liquidity_usd=float(os.getenv("MIN_LIQUIDITY_USD", "10000")),
            max_market_cap_usd=float(os.getenv("MAX_MARKET_CAP_USD", "1000000")),
            max_buy_tax_percent=float(os.getenv("MAX_BUY_TAX_PERCENT", "10")),
            max_sell_tax_percent=float(os.getenv("MAX_SELL_TAX_PERCENT", "10")),
            min_holders=int(os.getenv("MIN_HOLDERS", "50")),
            max_holder_percent=float(os.getenv("MAX_HOLDER_PERCENT", "20")),
            max_token_age_hours=float(os.getenv("MAX_TOKEN_AGE_HOURS", "1.0")),
            db_path=os.getenv("DB_PATH", "telegram-scanner/token_cache.db"),
            http_port=int(os.getenv("HTTP_PORT", "8765")),
            ws_port=int(os.getenv("WS_PORT", "8766")),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class TokenInfo:
    """Detected token information"""
    address: str
    chain: str  # 'ethereum', 'solana', 'bsc'
    detected_at: datetime
    source_message: str
    chat_id: int
    chat_name: Optional[str] = None


@dataclass
class TokenMetrics:
    """Comprehensive token metrics from various sources"""
    address: str
    chain: str

    # Price and market data
    price_usd: Optional[float] = None
    market_cap_usd: Optional[float] = None
    fdv_usd: Optional[float] = None
    liquidity_usd: Optional[float] = None
    volume_24h_usd: Optional[float] = None

    # Security checks
    is_honeypot: Optional[bool] = None
    buy_tax_percent: Optional[float] = None
    sell_tax_percent: Optional[float] = None
    is_proxy: Optional[bool] = None
    is_mintable: Optional[bool] = None

    # Holder data
    holder_count: Optional[int] = None
    top_holder_percent: Optional[float] = None

    # Age
    creation_time: Optional[datetime] = None
    age_hours: Optional[float] = None

    # Social
    telegram_members: Optional[int] = None
    twitter_followers: Optional[int] = None

    # Liquidity lock
    liquidity_locked: Optional[bool] = None

    # Raw data for AI
    raw_data: Dict = None

    def __post_init__(self):
        if self.raw_data is None:
            self.raw_data = {}


@dataclass
class AIDecision:
    """AI analysis decision"""
    decision: str  # 'BUY', 'NOT_BUY'
    confidence: float  # 0.0 to 1.0
    reasoning: str
    risk_score: int  # 0-100
    suggested_amount: float
    warnings: List[str]


# ============================================================================
# DATABASE MANAGER
# ============================================================================

class TokenDatabase:
    """SQLite database for tracking analyzed tokens"""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None
        self.initialize_db()

    def initialize_db(self):
        """Create database tables"""
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path) if os.path.dirname(self.db_path) else '.', exist_ok=True)

        self.conn = sqlite3.connect(self.db_path)
        cursor = self.conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analyzed_tokens (
                address TEXT PRIMARY KEY,
                chain TEXT NOT NULL,
                detected_at TIMESTAMP,
                analyzed_at TIMESTAMP,
                decision TEXT,
                confidence REAL,
                risk_score INTEGER,
                metrics_json TEXT,
                chat_name TEXT
            )
        """)

        # Add indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_analyzed_at
            ON analyzed_tokens(analyzed_at DESC)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_decision
            ON analyzed_tokens(decision, confidence)
        """)

        self.conn.commit()

    def is_analyzed(self, address: str) -> bool:
        """Check if token already analyzed"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT 1 FROM analyzed_tokens WHERE address = ?", (address.lower(),))
        return cursor.fetchone() is not None

    def save_analysis(self, token: TokenInfo, metrics: TokenMetrics, decision: AIDecision):
        """Save token analysis"""
        cursor = self.conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO analyzed_tokens
            (address, chain, detected_at, analyzed_at, decision, confidence, risk_score, metrics_json, chat_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            token.address.lower(),
            token.chain,
            token.detected_at,
            datetime.now(),
            decision.decision,
            decision.confidence,
            decision.risk_score,
            json.dumps(asdict(metrics), default=str),
            token.chat_name
        ))

        self.conn.commit()

    def get_recent_analyses(self, limit: int = 10) -> List[Dict]:
        """Get recent token analyses"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT address, chain, analyzed_at, decision, confidence, risk_score, chat_name
            FROM analyzed_tokens
            ORDER BY analyzed_at DESC
            LIMIT ?
        """, (limit,))

        results = []
        for row in cursor.fetchall():
            results.append({
                'address': row[0],
                'chain': row[1],
                'analyzed_at': row[2],
                'decision': row[3],
                'confidence': row[4],
                'risk_score': row[5],
                'chat_name': row[6]
            })

        return results

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()


# ============================================================================
# TOKEN DETECTOR
# ============================================================================

class TokenDetector:
    """Detect cryptocurrency tokens from Telegram messages"""

    # Regex patterns for different chains
    ETH_ADDRESS_PATTERN = re.compile(r'\b(0x[a-fA-F0-9]{40})\b')
    SOLANA_ADDRESS_PATTERN = re.compile(r'\b([1-9A-HJ-NP-Za-km-z]{32,44})\b')

    # URL patterns for DEX aggregators
    DEXSCREENER_PATTERN = re.compile(r'dexscreener\.com/(\w+)/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})')
    BIRDEYE_PATTERN = re.compile(r'birdeye\.so/token/([1-9A-HJ-NP-Za-km-z]{32,44})')
    PUMPFUN_PATTERN = re.compile(r'pump\.fun/([1-9A-HJ-NP-Za-km-z]{32,44})')
    RAYDIUM_PATTERN = re.compile(r'raydium\.io/.*?([1-9A-HJ-NP-Za-km-z]{32,44})')
    JUPITER_PATTERN = re.compile(r'jup\.ag/swap/.*?-([1-9A-HJ-NP-Za-km-z]{32,44})')

    # Keywords that indicate token drops
    TOKEN_KEYWORDS = [
        'new token', 'launch', 'launched', 'ca:', 'contract:',
        'address:', 'new coin', 'just launched', 'presale', 'stealth launch'
    ]

    @staticmethod
    def detect_tokens(message_text: str) -> List[Tuple[str, str]]:
        """
        Detect tokens from message text
        Returns: List of (address, chain) tuples
        """
        tokens = []
        message_lower = message_text.lower()

        # Check for token-related keywords
        has_keywords = any(keyword in message_lower for keyword in TokenDetector.TOKEN_KEYWORDS)

        # Extract from DEX URLs first (most reliable)
        for match in TokenDetector.DEXSCREENER_PATTERN.finditer(message_text):
            chain = match.group(1).lower()
            address = match.group(2)

            if chain in ['ethereum', 'eth', 'ether']:
                tokens.append((address, 'ethereum'))
            elif chain in ['bsc', 'bnb']:
                tokens.append((address, 'bsc'))
            elif chain in ['solana', 'sol']:
                tokens.append((address, 'solana'))

        for match in TokenDetector.BIRDEYE_PATTERN.finditer(message_text):
            tokens.append((match.group(1), 'solana'))

        for match in TokenDetector.PUMPFUN_PATTERN.finditer(message_text):
            tokens.append((match.group(1), 'solana'))

        for match in TokenDetector.RAYDIUM_PATTERN.finditer(message_text):
            tokens.append((match.group(1), 'solana'))

        for match in TokenDetector.JUPITER_PATTERN.finditer(message_text):
            tokens.append((match.group(1), 'solana'))

        # If keywords present, look for raw addresses
        if has_keywords:
            # Ethereum/BSC addresses
            for match in TokenDetector.ETH_ADDRESS_PATTERN.finditer(message_text):
                address = match.group(1)
                # Try to determine if BSC or ETH from context
                if 'bsc' in message_lower or 'bnb' in message_lower or 'pancake' in message_lower:
                    tokens.append((address, 'bsc'))
                else:
                    tokens.append((address, 'ethereum'))

            # Solana addresses (basic validation)
            for match in TokenDetector.SOLANA_ADDRESS_PATTERN.finditer(message_text):
                address = match.group(1)
                if TokenDetector.is_valid_solana_address(address):
                    tokens.append((address, 'solana'))

        return list(set(tokens))  # Remove duplicates

    @staticmethod
    def is_valid_solana_address(address: str) -> bool:
        """Validate Solana address format"""
        if not base58:
            return len(address) >= 32 and len(address) <= 44

        try:
            decoded = base58.b58decode(address)
            return len(decoded) == 32
        except:
            return False


# ============================================================================
# METRICS FETCHER
# ============================================================================

class MetricsFetcher:
    """Fetch token metrics from various APIs"""

    def __init__(self, config: Config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    async def fetch_metrics(self, token: TokenInfo) -> TokenMetrics:
        """Fetch comprehensive metrics for a token"""
        metrics = TokenMetrics(address=token.address, chain=token.chain)

        # Fetch from multiple sources concurrently with timeout
        tasks = [
            self._fetch_dexscreener(token, metrics),
            self._fetch_rugcheck(token, metrics),
            self._fetch_holder_data(token, metrics),
        ]

        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logging.warning("Metrics fetch timed out after 30s")

        # Calculate age if creation time found
        if metrics.creation_time:
            metrics.age_hours = (datetime.now() - metrics.creation_time).total_seconds() / 3600

        return metrics

    async def _fetch_dexscreener(self, token: TokenInfo, metrics: TokenMetrics):
        """Fetch data from DexScreener API"""
        try:
            # DexScreener free API
            url = f"https://api.dexscreener.com/latest/dex/tokens/{token.address}"

            response = await asyncio.to_thread(self.session.get, url, timeout=10)

            if response.status_code == 200:
                data = response.json()

                if data.get('pairs'):
                    # Get the pair with highest liquidity
                    pair = max(data['pairs'], key=lambda p: float(p.get('liquidity', {}).get('usd', 0) or 0))

                    metrics.price_usd = float(pair.get('priceUsd', 0) or 0)
                    metrics.liquidity_usd = float(pair.get('liquidity', {}).get('usd', 0) or 0)
                    metrics.volume_24h_usd = float(pair.get('volume', {}).get('h24', 0) or 0)
                    metrics.market_cap_usd = float(pair.get('marketCap', 0) or 0)
                    metrics.fdv_usd = float(pair.get('fdv', 0) or 0)

                    # Store raw data
                    metrics.raw_data['dexscreener'] = pair

                    logging.info(f"DexScreener: ${metrics.price_usd:.8f}, Liq: ${metrics.liquidity_usd:,.0f}")

        except Exception as e:
            logging.error(f"DexScreener fetch error: {e}")

    async def _fetch_rugcheck(self, token: TokenInfo, metrics: TokenMetrics):
        """Fetch rug check data from GoPlus Labs or Honeypot.is"""
        try:
            if token.chain in ['ethereum', 'bsc']:
                # GoPlus Labs free API
                chain_id = '1' if token.chain == 'ethereum' else '56'
                url = f"https://api.gopluslabs.io/api/v1/token_security/{chain_id}"

                response = await asyncio.to_thread(
                    self.session.get,
                    url,
                    params={'contract_addresses': token.address},
                    timeout=10
                )

                if response.status_code == 200:
                    data = response.json()

                    if data.get('result'):
                        token_data = data['result'].get(token.address.lower(), {})

                        metrics.is_honeypot = token_data.get('is_honeypot') == '1'
                        metrics.buy_tax_percent = float(token_data.get('buy_tax', '0')) * 100
                        metrics.sell_tax_percent = float(token_data.get('sell_tax', '0')) * 100
                        metrics.is_proxy = token_data.get('is_proxy') == '1'
                        metrics.is_mintable = token_data.get('is_mintable') == '1'
                        metrics.holder_count = int(token_data.get('holder_count', '0'))

                        # Top 10 holders percentage
                        if token_data.get('holders'):
                            top_holder = max(
                                token_data['holders'],
                                key=lambda h: float(h.get('percent', 0))
                            )
                            metrics.top_holder_percent = float(top_holder.get('percent', 0)) * 100

                        metrics.raw_data['goplus'] = token_data

                        logging.info(f"GoPlus: Honeypot={metrics.is_honeypot}, Tax={metrics.buy_tax_percent:.1f}%/{metrics.sell_tax_percent:.1f}%")

            elif token.chain == 'solana':
                # For Solana, use RugCheck.xyz API (if available)
                logging.info("Solana rugcheck not implemented - manual review recommended")

        except Exception as e:
            logging.error(f"Rugcheck fetch error: {e}")

    async def _fetch_holder_data(self, token: TokenInfo, metrics: TokenMetrics):
        """Fetch holder distribution data from blockchain explorers"""
        try:
            # Placeholder - would use Etherscan/BscScan/Solscan APIs
            logging.debug(f"Holder data fetch not implemented for {token.chain}")

        except Exception as e:
            logging.error(f"Holder data fetch error: {e}")


# ============================================================================
# AI DECISION MAKER
# ============================================================================

class AIDecisionMaker:
    """Use AI to analyze token metrics and make buy/no-buy decisions"""

    def __init__(self, config: Config):
        self.config = config

        if config.ai_provider == "anthropic":
            if not Anthropic or not config.anthropic_api_key:
                raise ValueError("Anthropic API key required for AI provider 'anthropic'")
            self.client = Anthropic(api_key=config.anthropic_api_key)
            self.model = "claude-sonnet-4-20250514"
        elif config.ai_provider == "openai":
            if not config.openai_api_key:
                raise ValueError("OpenAI API key required for AI provider 'openai'")
            raise NotImplementedError("OpenAI integration not yet implemented")
        else:
            raise ValueError(f"Unknown AI provider: {config.ai_provider}")

    async def analyze_token(self, token: TokenInfo, metrics: TokenMetrics) -> AIDecision:
        """Use AI to analyze token and make decision"""

        # First, calculate a basic risk score
        risk_score = self._calculate_risk_score(metrics)

        # Build comprehensive prompt for AI
        prompt = self._build_analysis_prompt(token, metrics, risk_score)

        # Get AI decision
        try:
            response = await asyncio.to_thread(
                self._call_ai,
                prompt
            )

            decision = self._parse_ai_response(response, metrics)
            decision.risk_score = risk_score

            return decision

        except Exception as e:
            logging.error(f"AI analysis error: {e}")
            # Fallback decision
            return AIDecision(
                decision="NOT_BUY",
                confidence=0.0,
                reasoning=f"AI analysis failed: {str(e)}",
                risk_score=100,
                suggested_amount=0.0,
                warnings=["AI analysis unavailable"]
            )

    def _calculate_risk_score(self, metrics: TokenMetrics) -> int:
        """Calculate risk score (0-100, lower is better)"""
        score = 0

        # Liquidity risk (30 points)
        if metrics.liquidity_usd is None:
            score += 30
        elif metrics.liquidity_usd < 5000:
            score += 30
        elif metrics.liquidity_usd < 10000:
            score += 20
        elif metrics.liquidity_usd < 50000:
            score += 10

        # Honeypot/scam risk (40 points)
        if metrics.is_honeypot is True:
            score += 40
        elif metrics.is_honeypot is None:
            score += 15

        # Tax risk (15 points)
        if metrics.buy_tax_percent is not None and metrics.buy_tax_percent > 10:
            score += 10
        if metrics.sell_tax_percent is not None and metrics.sell_tax_percent > 10:
            score += 10

        # Holder concentration risk (10 points)
        if metrics.top_holder_percent is not None and metrics.top_holder_percent > 20:
            score += 10
        elif metrics.top_holder_percent is None:
            score += 5

        # Low holder count risk (5 points)
        if metrics.holder_count is not None and metrics.holder_count < 50:
            score += 5

        return min(100, score)

    def _build_analysis_prompt(self, token: TokenInfo, metrics: TokenMetrics, risk_score: int) -> str:
        """Build comprehensive analysis prompt for AI"""

        prompt = f"""You are an expert cryptocurrency token analyst. Analyze this token and decide whether to buy.

TOKEN INFORMATION:
- Address: {token.address}
- Chain: {token.chain}
- Detected at: {token.detected_at}
- Source: Telegram ({token.chat_name or 'Unknown channel'})

METRICS:
- Price: ${metrics.price_usd or 'Unknown'}
- Market Cap: ${metrics.market_cap_usd:,.0f if metrics.market_cap_usd else 'Unknown'}
- FDV: ${metrics.fdv_usd:,.0f if metrics.fdv_usd else 'Unknown'}
- Liquidity: ${metrics.liquidity_usd:,.0f if metrics.liquidity_usd else 'Unknown'}
- 24h Volume: ${metrics.volume_24h_usd:,.0f if metrics.volume_24h_usd else 'Unknown'}
- Honeypot: {metrics.is_honeypot if metrics.is_honeypot is not None else 'Unknown'}
- Buy Tax: {metrics.buy_tax_percent:.1f}% if metrics.buy_tax_percent is not None else 'Unknown'}
- Sell Tax: {metrics.sell_tax_percent:.1f}% if metrics.sell_tax_percent is not None else 'Unknown'}
- Holders: {metrics.holder_count or 'Unknown'}
- Top Holder %: {metrics.top_holder_percent:.1f}% if metrics.top_holder_percent is not None else 'Unknown'}
- Age: {metrics.age_hours:.2f}h if metrics.age_hours else 'Unknown'}
- Is Proxy: {metrics.is_proxy if metrics.is_proxy is not None else 'Unknown'}
- Is Mintable: {metrics.is_mintable if metrics.is_mintable is not None else 'Unknown'}

RISK SCORE (calculated): {risk_score}/100 (lower is better)

ANALYSIS CRITERIA:
- Minimum liquidity: ${self.config.min_liquidity_usd:,.0f}
- Maximum market cap: ${self.config.max_market_cap_usd:,.0f}
- Maximum buy/sell tax: {self.config.max_buy_tax_percent}%
- Minimum holders: {self.config.min_holders}
- Maximum top holder: {self.config.max_holder_percent}%
- Maximum age: {self.config.max_token_age_hours}h

YOUR TASK:
Analyze this token and provide a decision in the following JSON format:
{{
    "decision": "BUY" or "NOT_BUY",
    "confidence": 0.0 to 1.0,
    "reasoning": "Detailed explanation of your decision",
    "suggested_amount_multiplier": 0.0 to 2.0 (multiply default buy amount),
    "warnings": ["warning1", "warning2", ...]
}}

Be conservative. When in doubt, choose NOT_BUY."""

        return prompt

    def _call_ai(self, prompt: str) -> str:
        """Call AI API"""
        if self.config.ai_provider == "anthropic":
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text
        else:
            raise NotImplementedError(f"AI provider {self.config.ai_provider} not implemented")

    def _parse_ai_response(self, response: str, metrics: TokenMetrics) -> AIDecision:
        """Parse AI response into AIDecision"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
            else:
                data = json.loads(response)

            # Determine buy amount
            chain_default = (
                self.config.default_buy_amount_eth
                if metrics.chain in ['ethereum', 'bsc']
                else self.config.default_buy_amount_sol
            )
            suggested_amount = chain_default * data.get('suggested_amount_multiplier', 1.0)

            return AIDecision(
                decision=data.get('decision', 'NOT_BUY'),
                confidence=float(data.get('confidence', 0.0)),
                reasoning=data.get('reasoning', 'No reasoning provided'),
                risk_score=0,  # Will be set by caller
                suggested_amount=suggested_amount,
                warnings=data.get('warnings', [])
            )

        except Exception as e:
            logging.error(f"Error parsing AI response: {e}")
            logging.debug(f"Response was: {response}")

            return AIDecision(
                decision="NOT_BUY",
                confidence=0.0,
                reasoning=f"Failed to parse AI response: {str(e)}",
                risk_score=100,
                suggested_amount=0.0,
                warnings=["AI response parsing failed"]
            )


# ============================================================================
# WEBSOCKET BRIDGE
# ============================================================================

class WebSocketBridge:
    """WebSocket server to send alerts to AI Terminal Agent"""

    def __init__(self, port: int):
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.server = None

    async def start(self):
        """Start WebSocket server"""
        self.server = await websockets.serve(
            self.handler,
            "localhost",
            self.port
        )
        logging.info(f"✅ WebSocket server started on ws://localhost:{self.port}")

    async def handler(self, websocket, path):
        """Handle WebSocket connections"""
        self.clients.add(websocket)
        logging.info(f"📡 Terminal connected (total: {len(self.clients)})")

        try:
            # Keep connection alive
            async for message in websocket:
                # Echo back for health check
                await websocket.send(json.dumps({"type": "pong"}))
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            logging.info(f"📡 Terminal disconnected (remaining: {len(self.clients)})")

    async def send_alert(self, token: TokenInfo, metrics: TokenMetrics, decision: AIDecision):
        """Send token alert to all connected clients"""
        if not self.clients:
            logging.debug("No clients connected, skipping alert")
            return

        alert = {
            'type': 'telegram_token_alert',
            'timestamp': datetime.now().isoformat(),
            'token': {
                'address': token.address,
                'chain': token.chain,
                'detected_at': token.detected_at.isoformat(),
                'source': 'telegram',
                'chat_name': token.chat_name,
                'source_message': token.source_message[:200]
            },
            'metrics': {
                'price_usd': metrics.price_usd,
                'market_cap_usd': metrics.market_cap_usd,
                'liquidity_usd': metrics.liquidity_usd,
                'volume_24h_usd': metrics.volume_24h_usd,
                'is_honeypot': metrics.is_honeypot,
                'buy_tax_percent': metrics.buy_tax_percent,
                'sell_tax_percent': metrics.sell_tax_percent,
                'holder_count': metrics.holder_count,
                'top_holder_percent': metrics.top_holder_percent,
                'age_hours': metrics.age_hours
            },
            'ai_decision': {
                'decision': decision.decision,
                'confidence': decision.confidence,
                'reasoning': decision.reasoning,
                'risk_score': decision.risk_score,
                'suggested_amount': decision.suggested_amount,
                'warnings': decision.warnings
            }
        }

        # Send to all connected clients
        disconnected = set()
        for client in self.clients:
            try:
                await client.send(json.dumps(alert))
                logging.info(f"📤 Alert sent to terminal: {token.address[:8]}...")
            except Exception as e:
                logging.error(f"Failed to send alert: {e}")
                disconnected.add(client)

        # Remove disconnected clients
        self.clients -= disconnected

    async def stop(self):
        """Stop WebSocket server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()


# ============================================================================
# HTTP API
# ============================================================================

class HTTPServer:
    """HTTP API for controlling the bot"""

    def __init__(self, bot: 'TelegramTokenBot', port: int):
        self.bot = bot
        self.port = port
        self.app = web.Application()
        self.runner = None

        # Setup routes
        self.app.router.add_get('/status', self.handle_status)
        self.app.router.add_get('/recent', self.handle_recent)
        self.app.router.add_post('/config', self.handle_config)

    async def handle_status(self, request):
        """Get bot status"""
        status = {
            'running': self.bot.is_running,
            'monitored_chats': self.bot.config.telegram_chats,
            'simulation_mode': self.bot.config.simulation_mode,
            'connected_clients': len(self.bot.ws_bridge.clients) if hasattr(self.bot, 'ws_bridge') else 0
        }
        return web.json_response(status)

    async def handle_recent(self, request):
        """Get recent token analyses"""
        limit = int(request.query.get('limit', 10))
        recent = self.bot.db.get_recent_analyses(limit)
        return web.json_response({'tokens': recent})

    async def handle_config(self, request):
        """Update bot configuration"""
        data = await request.json()

        # Update config dynamically
        if 'telegram_chats' in data:
            self.bot.config.telegram_chats = data['telegram_chats']

        return web.json_response({'status': 'updated'})

    async def start(self):
        """Start HTTP server"""
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        site = web.TCPSite(self.runner, 'localhost', self.port)
        await site.start()
        logging.info(f"✅ HTTP API started on http://localhost:{self.port}")

    async def stop(self):
        """Stop HTTP server"""
        if self.runner:
            await self.runner.cleanup()


# ============================================================================
# MAIN BOT
# ============================================================================

class TelegramTokenBot:
    """Main bot orchestrator with WebSocket integration"""

    def __init__(self, config: Config):
        self.config = config
        self.db = TokenDatabase(config.db_path)
        self.detector = TokenDetector()
        self.fetcher = MetricsFetcher(config)
        self.ai = AIDecisionMaker(config)

        # WebSocket bridge
        self.ws_bridge = WebSocketBridge(config.ws_port)

        # HTTP API
        self.http_server = HTTPServer(self, config.http_port)

        # Telegram client
        self.client = TelegramClient(
            'telegram-scanner/token_analyzer_session',
            config.telegram_api_id,
            config.telegram_api_hash
        )

        # Rate limiting
        self.last_analysis = {}
        self.analysis_cooldown = 60  # seconds

        # Status
        self.is_running = False
        self.stats = {
            'tokens_detected': 0,
            'tokens_analyzed': 0,
            'buy_signals': 0,
            'alerts_sent': 0
        }

    async def start(self):
        """Start the bot"""
        logging.info("=" * 80)
        logging.info("🤖 TELEGRAM TOKEN SCANNER - AI TERMINAL AGENT INTEGRATION")
        logging.info("=" * 80)
        logging.info(f"Mode: {'SIMULATION' if self.config.simulation_mode else '⚠️  REAL TRADING'}")
        logging.info(f"AI Provider: {self.config.ai_provider}")
        logging.info(f"Monitoring chats: {', '.join(self.config.telegram_chats)}")
        logging.info(f"WebSocket Port: {self.config.ws_port}")
        logging.info(f"HTTP Port: {self.config.http_port}")
        logging.info("=" * 80)

        # Start WebSocket and HTTP servers
        await self.ws_bridge.start()
        await self.http_server.start()

        # Start Telegram client
        await self.client.start(phone=self.config.telegram_phone)

        # Register event handler
        @self.client.on(events.NewMessage(chats=self.config.telegram_chats))
        async def handler(event):
            await self.handle_message(event)

        self.is_running = True
        logging.info("✅ Bot started successfully!")
        logging.info("📡 Waiting for terminal connection...")
        logging.info("Listening for token drops...")

        # Keep running
        await self.client.run_until_disconnected()

    async def handle_message(self, event: events.NewMessage.Event):
        """Handle incoming Telegram message"""
        try:
            message_text = event.message.message
            chat_id = event.chat_id

            # Get chat name
            try:
                chat = await event.get_chat()
                chat_name = getattr(chat, 'title', getattr(chat, 'username', str(chat_id)))
            except:
                chat_name = str(chat_id)

            # Detect tokens
            detected_tokens = self.detector.detect_tokens(message_text)

            if not detected_tokens:
                return

            self.stats['tokens_detected'] += len(detected_tokens)

            logging.info(f"\n📨 New message from {chat_name}")
            logging.info(f"Detected {len(detected_tokens)} token(s)")

            # Analyze each detected token
            for address, chain in detected_tokens:
                await self.analyze_token(
                    address,
                    chain,
                    message_text,
                    chat_id,
                    chat_name,
                    event.message.id
                )

        except Exception as e:
            logging.error(f"Error handling message: {e}", exc_info=True)

    async def analyze_token(self, address: str, chain: str, message: str, chat_id: int, chat_name: str, message_id: int):
        """Analyze a detected token and send alert"""

        # Check if already analyzed
        if self.db.is_analyzed(address):
            logging.info(f"⏭️  Token {address[:8]}... already analyzed, skipping")
            return

        # Rate limiting
        token_key = f"{chain}:{address}"
        if token_key in self.last_analysis:
            elapsed = time.time() - self.last_analysis[token_key]
            if elapsed < self.analysis_cooldown:
                logging.debug(f"Rate limited, waiting {self.analysis_cooldown - elapsed:.0f}s")
                return

        self.last_analysis[token_key] = time.time()

        # Create token info
        token = TokenInfo(
            address=address,
            chain=chain,
            detected_at=datetime.now(),
            source_message=message[:200],
            chat_id=chat_id,
            chat_name=chat_name
        )

        logging.info(f"\n🔍 Analyzing token: {address}")
        logging.info(f"Chain: {chain}")
        logging.info(f"Source: {chat_name}")

        # Fetch metrics
        logging.info("📊 Fetching metrics...")
        metrics = await self.fetcher.fetch_metrics(token)

        # AI analysis
        logging.info("🤖 Running AI analysis...")
        decision = await self.ai.analyze_token(token, metrics)

        self.stats['tokens_analyzed'] += 1

        # Save to database
        self.db.save_analysis(token, metrics, decision)

        # Log decision
        logging.info(f"\n{'='*80}")
        logging.info(f"💡 DECISION: {decision.decision}")
        logging.info(f"Confidence: {decision.confidence:.1%}")
        logging.info(f"Risk Score: {decision.risk_score}/100")
        logging.info(f"Reasoning: {decision.reasoning}")
        logging.info(f"{'='*80}\n")

        # Send alert to terminal (for all tokens, let terminal decide what to show)
        await self.ws_bridge.send_alert(token, metrics, decision)
        self.stats['alerts_sent'] += 1

        if decision.decision == "BUY":
            self.stats['buy_signals'] += 1

    async def shutdown(self):
        """Graceful shutdown"""
        logging.info("\n" + "="*80)
        logging.info("SHUTDOWN STATISTICS")
        logging.info("="*80)
        logging.info(f"Tokens Detected: {self.stats['tokens_detected']}")
        logging.info(f"Tokens Analyzed: {self.stats['tokens_analyzed']}")
        logging.info(f"Buy Signals: {self.stats['buy_signals']}")
        logging.info(f"Alerts Sent: {self.stats['alerts_sent']}")
        logging.info("="*80)

        self.is_running = False
        await self.ws_bridge.stop()
        await self.http_server.stop()
        self.db.close()
        await self.client.disconnect()


# ============================================================================
# ENTRY POINT
# ============================================================================

def setup_logging(level: str):
    """Setup logging configuration"""
    # Ensure log directory exists
    os.makedirs('telegram-scanner', exist_ok=True)

    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('telegram-scanner/bot.log'),
            logging.StreamHandler()
        ]
    )


async def main():
    """Main entry point"""

    # Load configuration
    try:
        config = Config.from_env()
    except Exception as e:
        print(f"\n❌ Configuration error: {e}")
        print("\nCreate a .env file with:")
        print("  TELEGRAM_API_ID=your_api_id")
        print("  TELEGRAM_API_HASH=your_api_hash")
        print("  TELEGRAM_PHONE=+1234567890")
        print("  TELEGRAM_CHATS=chat_id1,chat_id2")
        print("  ANTHROPIC_API_KEY=your_anthropic_key")
        print("\nGet Telegram credentials from: https://my.telegram.org")
        print("Get Anthropic API key from: https://console.anthropic.com/")
        return

    # Validate configuration
    if not config.telegram_api_id or not config.telegram_api_hash:
        print("❌ Telegram API credentials missing")
        return

    if not config.anthropic_api_key and config.ai_provider == "anthropic":
        print("❌ Anthropic API key missing")
        return

    if not config.telegram_chats or config.telegram_chats == ['']:
        print("❌ No Telegram chats configured to monitor")
        return

    # Setup logging
    setup_logging(config.log_level)

    # Create and start bot
    bot = TelegramTokenBot(config)

    try:
        await bot.start()
    except KeyboardInterrupt:
        logging.info("\n⚠️  Shutdown requested by user")
    except Exception as e:
        logging.error(f"Fatal error: {e}", exc_info=True)
    finally:
        await bot.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
