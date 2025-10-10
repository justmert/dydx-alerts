"""Markets API endpoints - serve cached market data from WebSocket"""

from fastapi import APIRouter
from typing import Dict, Any
from app.services.monitor_service import monitor_service

router = APIRouter(prefix="/api", tags=["markets"])


@router.get("/markets")
async def get_markets() -> Dict[str, Any]:
    """
    Get current market data from dYdX REST API cache

    Returns full market info including prices, volumes, funding rates, etc.
    Updated every 5 seconds via REST polling

    Public endpoint - no authentication required
    """
    if not monitor_service.market_info:
        return {"markets": {}}

    # Pass through all market data from dYdX API
    markets_dict = {}
    for market_id, info in monitor_service.market_info.items():
        markets_dict[market_id] = {
            "ticker": market_id,
            "status": info.get("status"),
            "oraclePrice": info.get("oracle_price"),
            "priceChange24H": info.get("price_change_24h"),
            "volume24H": info.get("volume_24h"),
            "trades24H": info.get("trades_24h"),
            "nextFundingRate": info.get("next_funding_rate"),
            "initialMarginFraction": info.get("initial_margin_fraction"),
            "maintenanceMarginFraction": info.get("maintenance_margin_fraction"),
            "baseInitialMarginFraction": info.get("base_initial_margin_fraction"),
            "openInterest": info.get("open_interest"),
            "openNotional": info.get("open_notional"),
            "marketType": info.get("market_type"),
            "openInterestLowerCap": info.get("open_interest_lower_cap"),
            "openInterestUpperCap": info.get("open_interest_upper_cap"),
            "spreadToMaintenanceMarginRatio": info.get("spread_to_mmr_ratio"),
            "bankruptcyAdjustment": info.get("bankruptcy_adjustment"),
        }

    return {"markets": markets_dict}
