#!/usr/bin/env python3
"""
FENRIR Trading Bot - FastAPI Server

Exposes the Phase 1-3 trading modules via HTTP API:
- Phase 1: Real Trading (pump.fun program, price feeds)
- Phase 2: Safety (trade database, Jito MEV protection)
- Phase 3: Intelligence (AI decision engine, performance analytics, backtesting)

Run with: uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Phase 1-3 modules
from pumpfun_program import (
    PumpFunProgram,
    BondingCurveState,
    TokenLaunchDetector,
    calculate_optimal_buy_amount,
    estimate_profit_at_migration
)
from price_feed import PriceFeedManager, PriceAlertManager, AggregatedPrice
from trade_database import TradeDatabase, Trade, Position
from jito_mev import JitoMEVProtection, JitoOptimizer
from ai_decision_engine import AITradingAnalyst, TokenMetadata, AIDecision
from performance_analytics import PerformanceAnalyzer, PerformanceMetrics


# ═══════════════════════════════════════════════════════════════════════════
#                           PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════════════

class TokenAnalysisRequest(BaseModel):
    """Request for AI token analysis."""
    token_mint: str
    name: str = "Unknown"
    symbol: str = "???"
    description: Optional[str] = None
    initial_liquidity_sol: float = 0.0
    current_market_cap_sol: float = 0.0
    holder_count: int = 0
    top_10_holder_pct: float = 0.0
    twitter: Optional[str] = None
    telegram: Optional[str] = None
    creator_address: Optional[str] = None


class PriceRequest(BaseModel):
    """Request for price data."""
    token_mint: str
    force_refresh: bool = False


class TradeRequest(BaseModel):
    """Request to record a trade."""
    trade_type: str  # "BUY" or "SELL"
    token_mint: str
    token_symbol: Optional[str] = None
    amount_sol: float
    amount_tokens: float
    price_per_token: float
    slippage_pct: Optional[float] = None
    gas_fee_sol: Optional[float] = None
    signature: Optional[str] = None
    position_id: Optional[int] = None
    notes: str = ""


class PositionRequest(BaseModel):
    """Request to open a position."""
    token_mint: str
    token_symbol: Optional[str] = None
    entry_price: float
    entry_amount_tokens: float
    entry_amount_sol: float
    entry_signature: Optional[str] = None
    strategy: str = "default"
    notes: str = ""


class ClosePositionRequest(BaseModel):
    """Request to close a position."""
    position_id: int
    exit_price: float
    exit_amount_tokens: float
    exit_amount_sol: float
    exit_signature: str
    exit_reason: str


class BondingCurveRequest(BaseModel):
    """Request to decode bonding curve."""
    account_data: str  # Base64 encoded


class BuyCalculationRequest(BaseModel):
    """Request to calculate buy amount."""
    virtual_token_reserves: int
    virtual_sol_reserves: int
    real_token_reserves: int
    real_sol_reserves: int
    token_total_supply: int
    buy_amount_sol: float


class JitoBundleRequest(BaseModel):
    """Request to send Jito bundle."""
    transactions: List[str]  # Base64 encoded transactions
    tip_lamports: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════════════
#                           GLOBAL STATE
# ═══════════════════════════════════════════════════════════════════════════

# Services (initialized on startup)
pumpfun_program: Optional[PumpFunProgram] = None
price_feed: Optional[PriceFeedManager] = None
trade_db: Optional[TradeDatabase] = None
jito: Optional[JitoMEVProtection] = None
ai_analyst: Optional[AITradingAnalyst] = None
performance_analyzer: Optional[PerformanceAnalyzer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup services."""
    global pumpfun_program, price_feed, trade_db, jito, ai_analyst, performance_analyzer

    print("🐺 FENRIR Trading Bot Starting...")

    # Initialize Phase 1: Real Trading
    pumpfun_program = PumpFunProgram()
    print("✓ PumpFunProgram initialized")

    price_feed = PriceFeedManager(
        birdeye_api_key=os.getenv("BIRDEYE_API_KEY"),
        cache_ttl_seconds=10
    )
    await price_feed.initialize()
    print("✓ PriceFeedManager initialized")

    # Initialize Phase 2: Safety
    db_path = os.getenv("DATABASE_PATH", "fenrir_trades.db")
    trade_db = TradeDatabase(db_path)
    print(f"✓ TradeDatabase initialized ({db_path})")

    if os.getenv("USE_JITO", "false").lower() == "true":
        jito = JitoMEVProtection(
            region=os.getenv("JITO_REGION", "mainnet"),
            tip_lamports=int(os.getenv("JITO_TIP_LAMPORTS", "50000"))
        )
        await jito.initialize()
        print("✓ JitoMEVProtection initialized")

    # Initialize Phase 3: Intelligence
    if os.getenv("AI_ANALYSIS_ENABLED", "false").lower() == "true":
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        if api_key:
            ai_analyst = AITradingAnalyst(
                api_key=api_key,
                model=os.getenv("AI_MODEL", "anthropic/claude-sonnet-4"),
                temperature=float(os.getenv("AI_TEMPERATURE", "0.3"))
            )
            await ai_analyst.initialize()
            print("✓ AITradingAnalyst initialized")

    performance_analyzer = PerformanceAnalyzer(trade_db)
    print("✓ PerformanceAnalyzer initialized")

    print("\n🚀 FENRIR Trading Bot Ready!")
    print("=" * 50)

    yield

    # Cleanup
    print("\n🛑 FENRIR Trading Bot Shutting Down...")

    if price_feed:
        await price_feed.close()
    if jito:
        await jito.close()
    if ai_analyst:
        await ai_analyst.close()
    if trade_db:
        trade_db.close()

    print("✓ All services closed")


# Create FastAPI app
app = FastAPI(
    title="FENRIR Trading Bot API",
    description="Phase 1-3 Trading Modules API",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                           HEALTH & STATUS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """API root - health check."""
    return {
        "name": "FENRIR Trading Bot",
        "version": "2.0.0",
        "status": "running",
        "phases": {
            "phase1_real_trading": True,
            "phase2_safety": trade_db is not None,
            "phase3_intelligence": ai_analyst is not None
        }
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "pumpfun_program": pumpfun_program is not None,
            "price_feed": price_feed is not None,
            "trade_db": trade_db is not None,
            "jito": jito is not None,
            "ai_analyst": ai_analyst is not None,
            "performance_analyzer": performance_analyzer is not None
        },
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════
#                      PHASE 1: REAL TRADING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/price/get")
async def get_price(request: PriceRequest):
    """Get aggregated price from multiple sources."""
    if not price_feed:
        raise HTTPException(status_code=503, detail="Price feed not initialized")

    price = await price_feed.get_price(request.token_mint, request.force_refresh)

    if not price:
        raise HTTPException(status_code=404, detail="Price not found")

    return {
        "token_mint": request.token_mint,
        "price": price.price,
        "spread": price.get_price_spread(),
        "sources": len(price.quotes),
        "quotes": [
            {
                "source": q.source.value,
                "price": q.price,
                "confidence": q.confidence,
                "age_seconds": q.age_seconds()
            }
            for q in price.quotes
        ],
        "timestamp": price.timestamp.isoformat()
    }


@app.get("/price/{token_mint}")
async def get_price_simple(token_mint: str):
    """Simple price endpoint."""
    if not price_feed:
        raise HTTPException(status_code=503, detail="Price feed not initialized")

    price = await price_feed.get_price(token_mint)

    if not price:
        raise HTTPException(status_code=404, detail="Price not found")

    return {
        "price": price.price,
        "sources": len(price.quotes),
        "timestamp": price.timestamp.isoformat()
    }


@app.post("/bonding-curve/decode")
async def decode_bonding_curve(request: BondingCurveRequest):
    """Decode pump.fun bonding curve account data."""
    import base64

    if not pumpfun_program:
        raise HTTPException(status_code=503, detail="PumpFun program not initialized")

    try:
        account_data = base64.b64decode(request.account_data)
        state = pumpfun_program.decode_bonding_curve(account_data)

        if not state:
            raise HTTPException(status_code=400, detail="Failed to decode bonding curve")

        return {
            "virtual_token_reserves": state.virtual_token_reserves,
            "virtual_sol_reserves": state.virtual_sol_reserves,
            "real_token_reserves": state.real_token_reserves,
            "real_sol_reserves": state.real_sol_reserves,
            "token_total_supply": state.token_total_supply,
            "complete": state.complete,
            "current_price": state.get_price(),
            "market_cap_sol": state.get_market_cap_sol(),
            "migration_progress": state.get_migration_progress()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/bonding-curve/calculate-buy")
async def calculate_buy(request: BuyCalculationRequest):
    """Calculate tokens out and price impact for a buy."""
    state = BondingCurveState(
        virtual_token_reserves=request.virtual_token_reserves,
        virtual_sol_reserves=request.virtual_sol_reserves,
        real_token_reserves=request.real_token_reserves,
        real_sol_reserves=request.real_sol_reserves,
        token_total_supply=request.token_total_supply,
        complete=False
    )

    tokens_out, price_impact = state.calculate_buy_price(request.buy_amount_sol)

    return {
        "buy_amount_sol": request.buy_amount_sol,
        "tokens_out": tokens_out,
        "price_impact_pct": price_impact,
        "avg_entry_price": request.buy_amount_sol / tokens_out if tokens_out > 0 else 0,
        "current_price": state.get_price()
    }


@app.post("/bonding-curve/optimal-buy")
async def get_optimal_buy(request: BuyCalculationRequest):
    """Calculate optimal buy amount for max price impact."""
    state = BondingCurveState(
        virtual_token_reserves=request.virtual_token_reserves,
        virtual_sol_reserves=request.virtual_sol_reserves,
        real_token_reserves=request.real_token_reserves,
        real_sol_reserves=request.real_sol_reserves,
        token_total_supply=request.token_total_supply,
        complete=False
    )

    optimal = calculate_optimal_buy_amount(state, max_price_impact_pct=5.0)

    return {
        "optimal_buy_amount_sol": optimal,
        "max_price_impact_pct": 5.0
    }


# ═══════════════════════════════════════════════════════════════════════════
#                      PHASE 2: SAFETY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/trades/record")
async def record_trade(request: TradeRequest):
    """Record a trade in the database."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    trade = Trade(
        trade_type=request.trade_type,
        token_mint=request.token_mint,
        token_symbol=request.token_symbol,
        amount_sol=request.amount_sol,
        amount_tokens=request.amount_tokens,
        price_per_token=request.price_per_token,
        slippage_pct=request.slippage_pct,
        gas_fee_sol=request.gas_fee_sol,
        signature=request.signature,
        position_id=request.position_id,
        notes=request.notes
    )

    trade_id = trade_db.record_trade(trade)

    return {"trade_id": trade_id, "status": "recorded"}


@app.get("/trades/recent")
async def get_recent_trades(limit: int = 50):
    """Get recent trades."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    trades = trade_db.get_recent_trades(limit)

    return {
        "trades": [
            {
                "id": t.id,
                "timestamp": t.timestamp.isoformat(),
                "trade_type": t.trade_type,
                "token_mint": t.token_mint,
                "token_symbol": t.token_symbol,
                "amount_sol": t.amount_sol,
                "amount_tokens": t.amount_tokens,
                "price_per_token": t.price_per_token,
                "signature": t.signature
            }
            for t in trades
        ],
        "count": len(trades)
    }


@app.post("/positions/open")
async def open_position(request: PositionRequest):
    """Open a new position."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    position = Position(
        token_mint=request.token_mint,
        token_symbol=request.token_symbol,
        entry_price=request.entry_price,
        entry_amount_tokens=request.entry_amount_tokens,
        entry_amount_sol=request.entry_amount_sol,
        entry_signature=request.entry_signature,
        strategy=request.strategy,
        notes=request.notes
    )

    position_id = trade_db.open_position(position)

    return {"position_id": position_id, "status": "opened"}


@app.post("/positions/close")
async def close_position(request: ClosePositionRequest):
    """Close a position."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    trade_db.close_position(
        position_id=request.position_id,
        exit_price=request.exit_price,
        exit_amount_tokens=request.exit_amount_tokens,
        exit_amount_sol=request.exit_amount_sol,
        exit_signature=request.exit_signature,
        exit_reason=request.exit_reason
    )

    return {"position_id": request.position_id, "status": "closed"}


@app.get("/positions/open")
async def get_open_positions():
    """Get all open positions."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    positions = trade_db.get_open_positions()

    return {
        "positions": [
            {
                "id": p.id,
                "token_mint": p.token_mint,
                "token_symbol": p.token_symbol,
                "open_time": p.open_time.isoformat(),
                "entry_price": p.entry_price,
                "entry_amount_tokens": p.entry_amount_tokens,
                "entry_amount_sol": p.entry_amount_sol,
                "strategy": p.strategy
            }
            for p in positions
        ],
        "count": len(positions)
    }


@app.get("/positions/closed")
async def get_closed_positions(days: int = 30):
    """Get closed positions."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    start_date = datetime.now() - timedelta(days=days)
    positions = trade_db.get_closed_positions(start_date=start_date)

    return {
        "positions": [
            {
                "id": p.id,
                "token_mint": p.token_mint,
                "token_symbol": p.token_symbol,
                "open_time": p.open_time.isoformat(),
                "close_time": p.close_time.isoformat() if p.close_time else None,
                "entry_price": p.entry_price,
                "exit_price": p.exit_price,
                "pnl_sol": p.pnl_sol,
                "pnl_pct": p.pnl_pct,
                "hold_time_minutes": p.hold_time_minutes,
                "exit_reason": p.exit_reason
            }
            for p in positions
        ],
        "count": len(positions),
        "period_days": days
    }


@app.post("/positions/{position_id}/update-peak")
async def update_peak_price(position_id: int, peak_price: float):
    """Update peak price for trailing stop."""
    if not trade_db:
        raise HTTPException(status_code=503, detail="Trade database not initialized")

    trade_db.update_position_peak_price(position_id, peak_price)

    return {"position_id": position_id, "peak_price": peak_price}


@app.get("/jito/status")
async def jito_status():
    """Get Jito MEV protection status."""
    if not jito:
        return {"enabled": False, "reason": "USE_JITO not enabled"}

    return {
        "enabled": True,
        "block_engine": jito.block_engine_url,
        "default_tip_lamports": jito.tip_lamports,
        "tip_accounts": len(jito.TIP_ACCOUNTS)
    }


# ═══════════════════════════════════════════════════════════════════════════
#                      PHASE 3: INTELLIGENCE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/ai/analyze")
async def ai_analyze_token(request: TokenAnalysisRequest):
    """AI analysis of a token launch."""
    if not ai_analyst:
        raise HTTPException(
            status_code=503,
            detail="AI analysis not enabled. Set AI_ANALYSIS_ENABLED=true and OPENROUTER_API_KEY"
        )

    metadata = TokenMetadata(
        token_mint=request.token_mint,
        name=request.name,
        symbol=request.symbol,
        description=request.description,
        initial_liquidity_sol=request.initial_liquidity_sol,
        current_market_cap_sol=request.current_market_cap_sol,
        holder_count=request.holder_count,
        top_10_holder_pct=request.top_10_holder_pct,
        twitter=request.twitter,
        telegram=request.telegram,
        creator_address=request.creator_address
    )

    analysis = await ai_analyst.analyze_token_launch(metadata)

    return {
        "decision": analysis.decision.value,
        "confidence": analysis.confidence,
        "risk_score": analysis.risk_score,
        "reasoning": analysis.reasoning,
        "suggested_buy_amount_sol": analysis.suggested_buy_amount_sol,
        "suggested_stop_loss_pct": analysis.suggested_stop_loss_pct,
        "suggested_take_profit_pct": analysis.suggested_take_profit_pct,
        "red_flags": analysis.red_flags,
        "green_flags": analysis.green_flags,
        "scores": {
            "social": analysis.social_score,
            "liquidity": analysis.liquidity_score,
            "holder": analysis.holder_score,
            "timing": analysis.timing_score
        },
        "model_used": analysis.model_used,
        "analyzed_at": analysis.analyzed_at.isoformat()
    }


@app.get("/ai/performance")
async def ai_performance():
    """Get AI prediction performance."""
    if not ai_analyst:
        raise HTTPException(status_code=503, detail="AI analysis not enabled")

    report = ai_analyst.get_ai_performance_report()

    return report


@app.get("/performance/summary")
async def get_performance_summary(days: int = 30):
    """Get performance summary."""
    if not performance_analyzer:
        raise HTTPException(status_code=503, detail="Performance analyzer not initialized")

    start_date = datetime.now() - timedelta(days=days)
    metrics = performance_analyzer.calculate_comprehensive_metrics(start_date=start_date)

    return {
        "period_days": days,
        "start_date": metrics.start_date.isoformat(),
        "end_date": metrics.end_date.isoformat(),
        "days_traded": metrics.days_traded,
        "total_trades": metrics.total_trades,
        "winning_trades": metrics.winning_trades,
        "losing_trades": metrics.losing_trades,
        "win_rate": metrics.win_rate,
        "total_pnl_sol": metrics.total_pnl_sol,
        "total_pnl_pct": metrics.total_pnl_pct,
        "avg_win_pct": metrics.avg_win_pct,
        "avg_loss_pct": metrics.avg_loss_pct,
        "largest_win_pct": metrics.largest_win_pct,
        "largest_loss_pct": metrics.largest_loss_pct,
        "sharpe_ratio": metrics.sharpe_ratio,
        "sortino_ratio": metrics.sortino_ratio,
        "max_drawdown_pct": metrics.max_drawdown_pct,
        "profit_factor": metrics.profit_factor,
        "avg_hold_time_minutes": metrics.avg_hold_time_minutes,
        "best_time_of_day": metrics.best_time_of_day,
        "worst_time_of_day": metrics.worst_time_of_day
    }


@app.get("/performance/report")
async def get_performance_report(days: int = 30):
    """Get formatted performance report."""
    if not performance_analyzer:
        raise HTTPException(status_code=503, detail="Performance analyzer not initialized")

    start_date = datetime.now() - timedelta(days=days)
    metrics = performance_analyzer.calculate_comprehensive_metrics(start_date=start_date)
    report = performance_analyzer.generate_console_report(metrics)

    return {"report": report}


@app.get("/performance/tokens")
async def get_token_performance(limit: int = 20):
    """Get best performing tokens."""
    if not performance_analyzer:
        raise HTTPException(status_code=503, detail="Performance analyzer not initialized")

    tokens = performance_analyzer.analyze_token_performance()

    return {"tokens": tokens[:limit]}


@app.get("/performance/export")
async def export_performance(days: int = 30):
    """Export performance data as JSON."""
    if not performance_analyzer:
        raise HTTPException(status_code=503, detail="Performance analyzer not initialized")

    start_date = datetime.now() - timedelta(days=days)
    metrics = performance_analyzer.calculate_comprehensive_metrics(start_date=start_date)

    return json.loads(performance_analyzer.export_to_json(metrics))


# ═══════════════════════════════════════════════════════════════════════════
#                           MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"\n🐺 Starting FENRIR Trading Bot on {host}:{port}")

    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
