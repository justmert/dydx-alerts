import asyncio
import logging
import time
from copy import deepcopy
from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.services.dydx.client import DydxClient
from app.services.risk_calculator import RiskCalculator
from app.services.alert_engine import AlertEngine
from app.services.alert_rule_evaluator import AlertRuleEvaluator
from app.services.notifications.dispatcher import NotificationDispatcher
from app.models.subaccount import Subaccount
from app.models.alert_history import AlertHistory
from app.schemas.alert import AlertType, AlertSeverity
from app.core.database import async_session_maker
from app.core.config import settings

logger = logging.getLogger(__name__)


class MonitorService:
    """Main service for monitoring positions and sending alerts"""

    def __init__(self):
        self.dydx_client = DydxClient()
        self.risk_calculator = RiskCalculator()
        self.alert_engine = AlertEngine()
        self.alert_rule_evaluator = AlertRuleEvaluator()
        self.notification_dispatcher = NotificationDispatcher()
        self.running = False
        self.monitored_subaccounts: Dict[str, Subaccount] = {}
        self.market_info: Dict[str, Dict[str, str]] = {}
        self._market_info_loaded_at: float = 0.0
        self._status_lock = asyncio.Lock()
        self._subaccount_snapshots: Dict[str, Dict[str, Any]] = {}
        self._db_session: Optional[AsyncSession] = None  # Shared database session

    async def start(self):
        """Start the monitoring service"""
        logger.info("Starting Monitor Service (REST-only mode)...")
        self.running = True

        # Create shared database session for the entire monitoring lifecycle
        self._db_session = async_session_maker()
        logger.info("Created shared database session for monitor service")

        # Load active subaccounts
        await self.load_active_subaccounts()

        # Load market metadata
        await self.ensure_market_info(refresh=True)

        if not settings.ENABLE_MONITOR:
            logger.info("Monitor disabled; skipping polling")
            return

        # NO WebSocket subscriptions - REST polling only
        logger.info("Using REST API polling (no WebSocket to dYdX)")

        # Load initial data for all subaccounts
        for subaccount_id, subaccount in self.monitored_subaccounts.items():
            try:
                await self.update_subaccount_via_rest(subaccount)
            except Exception as e:
                logger.error(f"Failed to load subaccount {subaccount_id}: {e}")

        # Start polling loop instead of WebSocket
        await self.polling_loop()

    async def stop(self):
        """Stop the monitoring service"""
        logger.info("Stopping Monitor Service...")
        self.running = False

        # Close shared database session
        if self._db_session:
            await self._db_session.close()
            logger.info("Closed shared database session")
            self._db_session = None

        await self.dydx_client.close()

    async def polling_loop(self):
        """
        Poll dYdX REST API with differential rates for scaling:
        - Markets (oracle prices): Every 5 seconds (1 API call)
        - Positions: Every 15 seconds (N API calls)

        This reduces API calls by ~67% while maintaining fresh oracle prices.
        We recalculate metrics every 5s using fresh prices + cached positions.
        """
        logger.info(
            "Starting differential polling loop (markets: 5s, positions: 15s)..."
        )

        markets_interval = 5  # Oracle prices change frequently
        positions_interval = 15  # Position data changes on trades

        markets_counter = 0
        positions_counter = 0

        while self.running:
            try:
                current_time = time.time()

                # Update markets every 5 seconds (cheap - 1 call)
                if markets_counter == 0:
                    await self.ensure_market_info(refresh=True)

                    # Recalculate all subaccounts with fresh oracle prices
                    await self._recalculate_all_with_fresh_prices()

                    markets_counter = markets_interval

                # Update positions every 30 seconds (expensive - N calls)
                if positions_counter == 0:
                    for subaccount_id, subaccount in list(
                        self.monitored_subaccounts.items()
                    ):
                        try:
                            await self.update_subaccount_via_rest(subaccount)
                        except Exception as e:
                            logger.error(
                                f"Error updating subaccount {subaccount_id}: {e}"
                            )

                    positions_counter = positions_interval

                # Wait 1 second and decrement counters
                await asyncio.sleep(1)
                markets_counter = max(0, markets_counter - 1)
                positions_counter = max(0, positions_counter - 1)

            except Exception as e:
                logger.error(f"Error in polling loop: {e}")
                await asyncio.sleep(1)

    async def update_subaccount_via_rest(self, subaccount: Subaccount):
        """Fetch and update a single subaccount via REST API"""
        data = await self.dydx_client.get_subaccount_data(
            subaccount.address, subaccount.subaccount_number
        )

        if not data:
            logger.warning(f"No data returned for subaccount {subaccount.id}")
            return

        parsed_data = self.dydx_client.parse_subaccount_message(data)
        if not parsed_data:
            logger.warning(f"Failed to parse data for subaccount {subaccount.id}")
            return

        # Calculate metrics
        metrics = self.risk_calculator.calculate_risk_metrics(
            parsed_data,
            self.market_info,
        )

        status_value = self.risk_calculator.get_risk_status(
            metrics.liquidation_distance_percent,
            subaccount.liquidation_threshold_percent,
        )

        # Cache the update
        await self._cache_status(
            subaccount,
            metrics,
            status_value,
            source="rest_poll",
            received_at=time.time(),
            raw_data=parsed_data,
        )

        # Broadcast to frontend
        await self.broadcast_position_update(subaccount, metrics, status_value)

        # Check for built-in alerts (legacy liquidation warnings)
        alert = await self.alert_engine.evaluate(subaccount, metrics)
        if alert:
            await self.send_alert(alert, subaccount)

        # Evaluate custom alert rules
        await self.evaluate_custom_alert_rules(subaccount, metrics)

    async def load_active_subaccounts(self):
        """Load all active subaccounts from database"""
        try:
            if not self._db_session:
                logger.error("Cannot load subaccounts: shared database session not initialized")
                return

            result = await self._db_session.execute(
                select(Subaccount).where(Subaccount.is_active == True)
            )
            subaccounts = result.scalars().all()

            self.monitored_subaccounts = {
                str(subaccount.id): subaccount for subaccount in subaccounts
            }

            logger.info(
                f"Loaded {len(self.monitored_subaccounts)} active subaccounts"
            )
        except Exception as e:
            logger.error(f"Failed to load subaccounts: {e}")

    async def ensure_market_info(self, refresh: bool = False):
        """Ensure market metadata is available for risk calculations."""
        # REST-only mode: Always fetch from API when refresh=True
        if not refresh and self.market_info:
            return

        try:
            data = await self.dydx_client.get_markets()
            markets = self._normalize_market_info(data)
            if markets:
                self.market_info = markets
                self._market_info_loaded_at = time.time()
        except Exception as e:
            logger.error(f"Failed to load market metadata: {e}")

        if not self.market_info:
            logger.warning("Market info not loaded")
        return

    def _normalize_market_info(self, payload) -> Dict[str, Dict[str, str]]:
        """Normalize market metadata into a simple dictionary."""
        normalized: Dict[str, Dict[str, str]] = {}

        if not payload:
            return normalized

        candidate = None
        if isinstance(payload, dict):
            if isinstance(payload.get("perpetualMarkets"), dict):
                candidate = payload.get("perpetualMarkets")
            elif isinstance(payload.get("markets"), dict):
                candidate = payload.get("markets")
            elif isinstance(payload.get("markets"), list):
                candidate = payload.get("markets")
            else:
                candidate = payload
        else:
            candidate = payload

        if isinstance(candidate, dict):
            items = candidate.items()
        elif isinstance(candidate, list):
            items = []
            for entry in candidate:
                if not isinstance(entry, dict):
                    continue
                market_id = (
                    entry.get("ticker")
                    or entry.get("market")
                    or entry.get("symbol")
                    or entry.get("id")
                )
                if not market_id:
                    continue
                items.append((market_id, entry))
        else:
            items = []

        def parse_decimal(value) -> Optional[Decimal]:
            if value is None:
                return None
            try:
                return Decimal(str(value))
            except Exception:
                return None

        for market_id, info in items:
            if not isinstance(info, dict):
                continue

            maintenance_entry: Dict[str, str] = {}

            # Maintenance margin fraction (MMF)
            maintenance_fraction = parse_decimal(
                info.get("maintenanceMarginFraction")
            ) or parse_decimal(info.get("maintenance_margin_fraction"))
            if maintenance_fraction is None and isinstance(info.get("config"), dict):
                maintenance_fraction = parse_decimal(
                    info["config"].get("maintenanceMarginFraction")
                ) or parse_decimal(info["config"].get("maintenance_margin_fraction"))
            if maintenance_fraction is None:
                ppm_value = parse_decimal(
                    info.get("maintenanceMarginFractionPpm")
                ) or parse_decimal(info.get("maintenance_margin_fraction_ppm"))
                if ppm_value is None and isinstance(info.get("config"), dict):
                    ppm_value = parse_decimal(
                        info["config"].get("maintenanceMarginFractionPpm")
                    ) or parse_decimal(
                        info["config"].get("maintenance_margin_fraction_ppm")
                    )
                if ppm_value is not None:
                    maintenance_fraction = ppm_value / Decimal("1000000")

            if maintenance_fraction is not None:
                maintenance_entry["maintenance_margin_fraction"] = str(
                    maintenance_fraction
                )

            # Initial margin fraction inputs (base IMF and effective IMF scaling)
            liquidity_tier = info.get("liquidityTier") or info.get("liquidity_tier")
            base_initial_fraction = None
            lower_cap = None
            upper_cap = None
            impact_notional = None
            if isinstance(liquidity_tier, dict):
                base_initial_fraction = parse_decimal(
                    liquidity_tier.get("baseImf")
                ) or parse_decimal(liquidity_tier.get("base_imf"))
                if base_initial_fraction is None:
                    ppm_value = parse_decimal(
                        liquidity_tier.get("baseImfPpm")
                    ) or parse_decimal(liquidity_tier.get("base_imf_ppm"))
                    if ppm_value is not None:
                        base_initial_fraction = ppm_value / Decimal("1000000")

                lower_cap = parse_decimal(
                    liquidity_tier.get("openInterestLowerCap")
                ) or parse_decimal(liquidity_tier.get("open_interest_lower_cap"))
                upper_cap = parse_decimal(
                    liquidity_tier.get("openInterestUpperCap")
                ) or parse_decimal(liquidity_tier.get("open_interest_upper_cap"))
                impact_notional = parse_decimal(
                    liquidity_tier.get("impactNotional")
                ) or parse_decimal(liquidity_tier.get("impact_notional"))

            # Raw initial fraction (may already be effective)
            initial_fraction = parse_decimal(
                info.get("initialMarginFraction")
            ) or parse_decimal(info.get("initial_margin_fraction"))
            if initial_fraction is None and isinstance(info.get("config"), dict):
                initial_fraction = parse_decimal(
                    info["config"].get("initialMarginFraction")
                ) or parse_decimal(info["config"].get("initial_margin_fraction"))
            if initial_fraction is None:
                ppm_value = parse_decimal(
                    info.get("initialMarginFractionPpm")
                ) or parse_decimal(info.get("initial_margin_fraction_ppm"))
                if ppm_value is None and isinstance(info.get("config"), dict):
                    ppm_value = parse_decimal(
                        info["config"].get("initialMarginFractionPpm")
                    ) or parse_decimal(
                        info["config"].get("initial_margin_fraction_ppm")
                    )
                if ppm_value is not None:
                    initial_fraction = ppm_value / Decimal("1000000")

            oracle_price = parse_decimal(info.get("oraclePrice")) or parse_decimal(
                info.get("oracle_price")
            )
            open_interest = parse_decimal(info.get("openInterest")) or parse_decimal(
                info.get("open_interest")
            )
            open_notional = parse_decimal(info.get("openNotional")) or parse_decimal(
                info.get("open_notional")
            )
            if (
                open_notional is None
                and open_interest is not None
                and oracle_price is not None
            ):
                open_notional = open_interest * oracle_price

            # Additional market data fields
            status = info.get("status")
            price_change_24h = parse_decimal(info.get("priceChange24H"))
            volume_24h = parse_decimal(info.get("volume24H"))
            trades_24h = info.get("trades24H")
            next_funding_rate = parse_decimal(info.get("nextFundingRate"))
            market_type = info.get("marketType")

            # Compute effective initial margin fraction per dYdX documentation
            effective_initial_fraction = (
                initial_fraction
                or base_initial_fraction
                or self.risk_calculator.default_initial_margin_fraction
            )
            if base_initial_fraction is None and initial_fraction is not None:
                base_initial_fraction = initial_fraction

            if (
                base_initial_fraction is not None
                and open_notional is not None
                and lower_cap is not None
                and upper_cap is not None
                and upper_cap > lower_cap
            ):
                scaling_factor = (open_notional - lower_cap) / (upper_cap - lower_cap)
                if scaling_factor < Decimal("0"):
                    scaling_factor = Decimal("0")
                imf_increase = scaling_factor * (Decimal("1") - base_initial_fraction)
                if imf_increase < Decimal("0"):
                    imf_increase = Decimal("0")
                effective_initial_fraction = base_initial_fraction + imf_increase
                if effective_initial_fraction > Decimal("1"):
                    effective_initial_fraction = Decimal("1")

            maintenance_entry["initial_margin_fraction"] = str(
                effective_initial_fraction
            )

            if base_initial_fraction is not None:
                maintenance_entry["base_initial_margin_fraction"] = str(
                    base_initial_fraction
                )
            if lower_cap is not None:
                maintenance_entry["open_interest_lower_cap"] = str(lower_cap)
            if upper_cap is not None:
                maintenance_entry["open_interest_upper_cap"] = str(upper_cap)
            if impact_notional is not None:
                maintenance_entry["impact_notional"] = str(impact_notional)
            if open_interest is not None:
                maintenance_entry["open_interest"] = str(open_interest)
            if open_notional is not None:
                maintenance_entry["open_notional"] = str(open_notional)
            if oracle_price is not None:
                maintenance_entry["oracle_price"] = str(oracle_price)

            # Store additional market data
            if status is not None:
                maintenance_entry["status"] = status
            if price_change_24h is not None:
                maintenance_entry["price_change_24h"] = str(price_change_24h)
            if volume_24h is not None:
                maintenance_entry["volume_24h"] = str(volume_24h)
            if trades_24h is not None:
                maintenance_entry["trades_24h"] = trades_24h
            if next_funding_rate is not None:
                maintenance_entry["next_funding_rate"] = str(next_funding_rate)
            if market_type is not None:
                maintenance_entry["market_type"] = market_type

            # Spread to maintenance margin ratio (SMMR)
            spread_ratio = None
            spread_candidates = [
                info.get("spreadToMaintenanceMarginRatio"),
                info.get("spreadToMaintenanceMarginRatioPpm"),
            ]
            if isinstance(info.get("config"), dict):
                spread_candidates.extend(
                    [
                        info["config"].get("spreadToMaintenanceMarginRatio"),
                        info["config"].get("spreadToMaintenanceMarginRatioPpm"),
                    ]
                )
            for candidate in spread_candidates:
                if candidate is None:
                    continue
                try:
                    spread_dec = Decimal(str(candidate))
                    if spread_dec > Decimal("10"):
                        spread_dec = spread_dec / Decimal("1000000")
                    maintenance_entry["spread_to_mmr_ratio"] = str(spread_dec)
                    break
                except Exception:
                    pass

            # Bankruptcy adjustment (BA)
            bankruptcy_candidates = [
                info.get("bankruptcyAdjustment"),
                info.get("bankruptcyAdjustmentPpm"),
            ]
            if isinstance(info.get("config"), dict):
                bankruptcy_candidates.extend(
                    [
                        info["config"].get("bankruptcyAdjustment"),
                        info["config"].get("bankruptcyAdjustmentPpm"),
                    ]
                )
            for candidate in bankruptcy_candidates:
                if candidate is None:
                    continue
                try:
                    ba_dec = Decimal(str(candidate))
                    if ba_dec > Decimal("10"):
                        ba_dec = ba_dec / Decimal("1000000")
                    maintenance_entry["bankruptcy_adjustment"] = str(ba_dec)
                    break
                except Exception:
                    pass

            normalized[market_id] = maintenance_entry

        return normalized

    async def _recalculate_all_with_fresh_prices(self):
        """
        Recalculate all subaccount metrics using fresh oracle prices from market_info
        and cached position data. This allows real-time metric updates without
        re-fetching slow position endpoints.

        Key insight: When oracle prices change, unrealized PnL and liquidation
        prices change, but position sizes and entry prices remain the same.
        """
        async with self._status_lock:
            snapshots = list(self._subaccount_snapshots.items())

        recalculated_count = 0
        for subaccount_id, snapshot in snapshots:
            try:
                # Get cached position data
                raw_data = snapshot.get("raw_data")
                if not raw_data:
                    continue

                # Get subaccount object
                subaccount = self.monitored_subaccounts.get(subaccount_id)
                if not subaccount:
                    continue

                # Recalculate metrics with fresh oracle prices + cached positions
                metrics = self.risk_calculator.calculate_risk_metrics(
                    raw_data,
                    self.market_info,
                )

                status_value = self.risk_calculator.get_risk_status(
                    metrics.liquidation_distance_percent,
                    subaccount.liquidation_threshold_percent,
                )

                # Update cache with new metrics (keep raw_data intact)
                await self._cache_status(
                    subaccount,
                    metrics,
                    status_value,
                    source="oracle_recalc",
                    received_at=time.time(),
                    raw_data=raw_data,  # Preserve cached position data
                )

                # Broadcast updated metrics to frontend
                await self.broadcast_position_update(subaccount, metrics, status_value)

                # Check for alerts (prices may have crossed thresholds)
                alert = await self.alert_engine.evaluate(subaccount, metrics)
                if alert:
                    await self.send_alert(alert, subaccount)

                # Evaluate custom alert rules
                await self.evaluate_custom_alert_rules(subaccount, metrics)

                recalculated_count += 1

            except Exception as e:
                logger.error(f"Error recalculating subaccount {subaccount_id}: {e}")

    async def _get_cached_status(self, key: str) -> Optional[Dict[str, Any]]:
        """Return a copy of the latest cached snapshot for a subaccount."""
        async with self._status_lock:
            snapshot = self._subaccount_snapshots.get(key)

        if snapshot is None:
            return None

        return deepcopy(snapshot)

    async def _cache_status(
        self,
        subaccount: Subaccount,
        metrics,
        status: str,
        source: str,
        received_at: Optional[float] = None,
        raw_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Persist the most recent metrics snapshot for an active subaccount."""
        timestamp = received_at if received_at is not None else time.time()
        snapshot = {
            "subaccount_id": str(subaccount.id),
            "address": subaccount.address,
            "subaccount_number": subaccount.subaccount_number,
            "nickname": subaccount.nickname,
            "metrics": metrics.to_dict(),
            "status": status,
            "source": source,
            "received_at": timestamp,
            "raw_data": raw_data,  # Store original dYdX data for recalculation
        }

        async with self._status_lock:
            self._subaccount_snapshots[str(subaccount.id)] = snapshot

        return deepcopy(snapshot)

    async def add_subaccount(self, subaccount: Subaccount):
        """Add a subaccount to monitoring"""
        try:
            async with self._status_lock:
                self._subaccount_snapshots.pop(str(subaccount.id), None)
            self.monitored_subaccounts[str(subaccount.id)] = subaccount

            # Immediately fetch initial data so frontend gets instant results
            await self.update_subaccount_via_rest(subaccount)

            # Try to subscribe to WebSocket updates, but don't fail if it errors
            if settings.ENABLE_MONITOR:
                try:
                    await self.dydx_client.subscribe_subaccount(
                        subaccount.address, subaccount.subaccount_number
                    )
                except Exception as ws_error:
                    logger.warning(
                        f"Failed to subscribe to WebSocket for subaccount {subaccount.id}: {ws_error}. "
                        f"Will retry on next monitor cycle."
                    )
                    # Don't raise - subaccount is still added and will be monitored via REST API
        except Exception as e:
            logger.error(f"Failed to add subaccount to monitoring: {e}")
            raise

    async def remove_subaccount(self, subaccount_id: str):
        """Remove a subaccount from monitoring"""
        key = str(subaccount_id)
        if key in self.monitored_subaccounts:
            subaccount = self.monitored_subaccounts[key]
            try:
                if settings.ENABLE_MONITOR:
                    await self.dydx_client.unsubscribe_subaccount(
                        subaccount.address, subaccount.subaccount_number
                    )
                del self.monitored_subaccounts[key]
                async with self._status_lock:
                    self._subaccount_snapshots.pop(key, None)
            except Exception as e:
                logger.error(f"Failed to remove subaccount from monitoring: {e}")

    async def listen_loop(self):
        """Main listening loop for WebSocket messages"""
        try:
            async for message in self.dydx_client.listen():
                if not self.running:
                    break

                # Process message
                await self.process_message(message)
        except Exception as e:
            logger.error(f"Error in listen loop: {e}")
            if self.running:
                # Restart listening
                await asyncio.sleep(5)
                await self.listen_loop()

    async def process_message(self, message: Dict):
        """Process incoming WebSocket message (subaccount or markets)"""
        try:
            # Try parsing as markets message first
            markets_data = self.dydx_client.parse_markets_message(message)
            if markets_data:
                await self.process_markets_update(markets_data)
                return

            # Parse subaccount message
            parsed_data = self.dydx_client.parse_subaccount_message(message)
            if not parsed_data:
                return

            # Find corresponding subaccount
            subaccount = self._find_subaccount(
                parsed_data["address"], parsed_data["subaccount_number"]
            )

            if not subaccount:
                return

            await self.ensure_market_info()

            # Calculate risk metrics
            metrics = self.risk_calculator.calculate_risk_metrics(
                parsed_data,
                self.market_info,
            )

            status_value = self.risk_calculator.get_risk_status(
                metrics.liquidation_distance_percent,
                subaccount.liquidation_threshold_percent,
            )

            await self._cache_status(
                subaccount,
                metrics,
                status_value,
                source="websocket",
                received_at=time.time(),
                raw_data=parsed_data,  # Cache raw dYdX data
            )

            # Evaluate for alerts
            alert = await self.alert_engine.evaluate(subaccount, metrics)

            if alert:
                # Send alert
                await self.send_alert(alert, subaccount)

            # Evaluate custom alert rules
            await self.evaluate_custom_alert_rules(subaccount, metrics)

            # Broadcast update to WebSocket clients (handled by WebSocket manager)
            await self.broadcast_position_update(subaccount, metrics, status_value)

        except Exception as e:
            logger.error(f"Error processing message: {e}")

    async def process_markets_update(self, markets_data: Dict[str, Any]):
        """Process markets WebSocket update - ALWAYS recalculate all positions with new oracle prices"""
        try:
            markets = markets_data.get("markets", {})
            if not markets:
                # Empty update is normal - just skip silently
                return

            # Update market info cache with real-time data
            normalized = self._normalize_market_info({"markets": markets})
            if normalized:
                # CRITICAL FIX: WebSocket may not include oracle_price
                # Preserve existing oracle_price from REST if WebSocket doesn't have it
                for market_id, new_info in normalized.items():
                    if market_id in self.market_info:
                        existing = self.market_info[market_id]
                        # If new data lacks oracle_price, keep the old one
                        if (
                            "oracle_price" not in new_info
                            or new_info.get("oracle_price") is None
                        ):
                            if (
                                "oracle_price" in existing
                                and existing.get("oracle_price") is not None
                            ):
                                new_info["oracle_price"] = existing["oracle_price"]

                # Merge with existing market_info
                self.market_info.update(normalized)
                self._market_info_loaded_at = time.time()

                # CRITICAL: Recalculate ALL positions using cached position data + new oracle prices
                # This works because:
                # 1. We have position data from initial load or last v4_subaccounts update
                # 2. We have fresh oracle prices from v4_markets
                # 3. We can calculate fresh metrics without waiting for position changes
                await self._recalculate_all_positions(source="markets_ws")

        except Exception as e:
            logger.error(f"Error processing markets update: {e}")

    async def _recalculate_all_positions(self, source: str = "update"):
        """Recalculate ALL positions using cached raw data + fresh oracle prices"""
        try:
            # OPTIMIZATION: Recalculate ALL monitored subaccounts on every update
            for subaccount_id, snapshot in list(self._subaccount_snapshots.items()):
                subaccount = self.monitored_subaccounts.get(subaccount_id)
                if not subaccount:
                    continue

                # Use ORIGINAL raw data from dYdX (not reconstructed from metrics)
                raw_data = snapshot.get("raw_data")
                if not raw_data:
                    continue

                positions = raw_data.get("positions", {})
                if not positions:
                    continue

                # Recalculate ALL metrics with current oracle prices from market_info
                # raw_data has original position data (size, entryPrice, etc.)
                # market_info has fresh oracle prices from v4_markets WebSocket
                metrics = self.risk_calculator.calculate_risk_metrics(
                    raw_data,  # Use cached raw data
                    self.market_info,  # Use fresh oracle prices
                )

                status_value = self.risk_calculator.get_risk_status(
                    metrics.liquidation_distance_percent,
                    subaccount.liquidation_threshold_percent,
                )

                # Update cache with new metrics but keep raw_data unchanged
                await self._cache_status(
                    subaccount,
                    metrics,
                    status_value,
                    source=source,
                    received_at=time.time(),
                    raw_data=raw_data,  # Preserve original raw data
                )

                # Broadcast update to WebSocket clients
                await self.broadcast_position_update(subaccount, metrics, status_value)

        except Exception as e:
            logger.error(f"Error recalculating all positions: {e}")

    async def _recalculate_affected_positions(
        self, updated_markets: Dict[str, Dict[str, str]]
    ):
        """DEPRECATED: Use _recalculate_all_positions instead"""
        try:
            # OPTIMIZATION: No REST calls, use existing cached position data with new oracle prices
            # Recalculate for ALL monitored subaccounts with positions
            for subaccount_id, snapshot in list(self._subaccount_snapshots.items()):
                subaccount = self.monitored_subaccounts.get(subaccount_id)
                if not subaccount:
                    continue

                # Check if this subaccount has positions in updated markets
                metrics_dict = snapshot.get("metrics", {})
                positions = metrics_dict.get("positions", {})

                if not positions:
                    continue

                # Check if any positions are in the updated markets
                affected = False
                for market in positions.keys():
                    if market in updated_markets:
                        affected = True
                        break

                if not affected:
                    continue

                # OPTIMIZATION: Use cached position data, no REST call to dYdX
                # Position data comes from v4_subaccounts WebSocket
                # We just recalculate metrics with new oracle prices from v4_markets WebSocket

                # Reconstruct position data from last known snapshot
                cached_data = {
                    "address": snapshot.get("address"),
                    "subaccount_number": snapshot.get("subaccount_number"),
                    "equity": str(metrics_dict.get("equity", "0")),
                    "free_collateral": str(metrics_dict.get("free_collateral", "0")),
                    "margin_enabled": True,
                    "positions": {},
                }

                # Use raw position data from metrics
                for market, pos_metrics in positions.items():
                    cached_data["positions"][market] = {
                        "market": market,
                        "size": str(pos_metrics.get("size", "0")),
                        "side": pos_metrics.get("side", "LONG"),
                        "entryPrice": str(pos_metrics.get("entry_price", "0")),
                        "unrealizedPnl": str(pos_metrics.get("unrealized_pnl", "0")),
                    }

                # Recalculate ALL metrics with updated oracle prices from WebSocket
                metrics = self.risk_calculator.calculate_risk_metrics(
                    cached_data,
                    self.market_info,  # Updated via v4_markets WebSocket
                )

                status_value = self.risk_calculator.get_risk_status(
                    metrics.liquidation_distance_percent,
                    subaccount.liquidation_threshold_percent,
                )

                # Update cache
                await self._cache_status(
                    subaccount,
                    metrics,
                    status_value,
                    source="markets_ws_update",
                    received_at=time.time(),
                )

                # Broadcast update to WebSocket clients
                await self.broadcast_position_update(subaccount, metrics, status_value)

        except Exception as e:
            logger.error(f"Error recalculating affected positions: {e}")

    def _find_subaccount(
        self, address: str, subaccount_number: int
    ) -> Optional[Subaccount]:
        """Find subaccount by address and number"""
        for subaccount in self.monitored_subaccounts.values():
            if (
                subaccount.address == address
                and subaccount.subaccount_number == subaccount_number
            ):
                return subaccount
        return None

    async def evaluate_custom_alert_rules(self, subaccount: Subaccount, metrics):
        """Evaluate custom alert rules for a subaccount"""
        try:
            if not self._db_session:
                logger.error("Cannot evaluate alert rules: shared database session not initialized")
                return

            # Evaluate all rules for this subaccount using shared session
            rule_alerts = (
                await self.alert_rule_evaluator.evaluate_rules_for_subaccount(
                    self._db_session, subaccount, metrics
                )
            )

            # Send each triggered alert
            for rule_alert in rule_alerts:
                # Get channels specific to this rule
                channels = await self.alert_rule_evaluator.get_channels_for_rule(
                    self._db_session, rule_alert.rule
                )

                if not channels:
                    logger.warning(
                        f"No notification channels configured for rule {rule_alert.rule.name}"
                    )
                    continue

                # Create AlertHistory entry
                alert_history = AlertHistory(
                    subaccount_id=subaccount.id,
                    alert_type=rule_alert.alert_type,
                    severity=rule_alert.severity,
                    message=rule_alert.message,
                    description=rule_alert.description,
                    alert_metadata=rule_alert.metadata,
                    channels_sent=[],
                )
                self._db_session.add(alert_history)
                await self._db_session.flush()

                # Send to rule-specific channels
                successful_channels = await self.notification_dispatcher.send_alert(
                    rule_alert, channels, self._db_session
                )

                # Update channels_sent (successful_channels is already a list of channel type strings)
                alert_history.channels_sent = successful_channels
                await self._db_session.commit()

                logger.info(
                    f"Custom alert rule '{rule_alert.rule.name}' sent to "
                    f"{len(successful_channels)}/{len(channels)} channels"
                )

                # Broadcast to WebSocket for real-time notifications
                from app.api.websocket import broadcast_alert

                await broadcast_alert(
                    {
                        "subaccount_id": rule_alert.subaccount_id,
                        "alert_type": rule_alert.alert_type,
                        "severity": rule_alert.severity,
                        "message": rule_alert.message,
                        "metadata": rule_alert.metadata,
                    }
                )

        except Exception as e:
            logger.error(
                f"Error evaluating custom alert rules for subaccount {subaccount.id}: {e}"
            )
            # Rollback on error to keep session healthy
            if self._db_session:
                await self._db_session.rollback()

    async def send_alert(self, alert, subaccount: Subaccount):
        """Send alert via notification channels"""
        try:
            if not self._db_session:
                logger.error("Cannot send alert: shared database session not initialized")
                return

            # Get user's notification channels using shared session
            channels = await self.notification_dispatcher.get_channels_for_user(
                subaccount.user_id, self._db_session
            )

            if not channels:
                logger.warning(
                    f"No notification channels configured for subaccount {subaccount.id}"
                )
                # Still broadcast to WebSocket even if no channels configured
            else:
                # Send to all channels
                successful_channels = await self.notification_dispatcher.send_alert(
                    alert, channels, self._db_session
                )

                logger.info(
                    f"Alert sent to {len(successful_channels)}/{len(channels)} channels "
                    f"for subaccount {subaccount.id}"
                )

            # Broadcast alert to WebSocket clients for real-time notifications
            from app.api.websocket import broadcast_alert

            await broadcast_alert(
                {
                    "subaccount_id": alert.subaccount_id,
                    "alert_type": alert.alert_type.value,
                    "severity": alert.severity.value,
                    "message": alert.message,
                    "metadata": alert.metadata,
                }
            )

        except Exception as e:
            logger.error(f"Error sending alert: {e}")
            # Rollback on error to keep session healthy
            if self._db_session:
                await self._db_session.rollback()

    async def broadcast_position_update(
        self,
        subaccount: Subaccount,
        metrics,
        status: Optional[str] = None,
    ):
        """Broadcast position update to connected WebSocket clients"""
        try:
            from app.api.websocket import broadcast_position_update

            resolved_status = status
            if resolved_status is None:
                resolved_status = self.risk_calculator.get_risk_status(
                    metrics.liquidation_distance_percent,
                    subaccount.liquidation_threshold_percent,
                )

            await broadcast_position_update(
                str(subaccount.id),
                {
                    "address": subaccount.address,
                    "subaccount_number": subaccount.subaccount_number,
                    "nickname": subaccount.nickname,
                    "metrics": metrics.to_dict(),
                    "status": resolved_status,
                },
            )
        except Exception as e:
            logger.debug(f"Could not broadcast position update: {e}")

    async def get_subaccount_status(self, subaccount_id: str) -> Optional[Dict]:
        """Get current status of a subaccount (from cache only, no REST calls)"""
        key = str(subaccount_id)
        subaccount = self.monitored_subaccounts.get(key)
        if not subaccount:
            return None

        # OPTIMIZATION: Always return cached data, no REST fallback
        # Data is updated via WebSocket only
        cached = await self._get_cached_status(key)
        if cached is not None:
            return cached

        # If no cache yet, return None (WebSocket will populate soon)
        return None

        # COMMENTED OUT: No more REST API fallback
        # try:
        #     # Fetch current data from dYdX
        #     data = await self.dydx_client.get_subaccount_data(
        #         subaccount.address,
        #         subaccount.subaccount_number
        #     )
        #
        #     if not data:
        #         return None
        #
        #     # Parse and calculate metrics
        #     parsed_data = self.dydx_client.parse_subaccount_message(data)
        #     if not parsed_data:
        #         return None
        #
        #     await self.ensure_market_info()
        #
        #     metrics = self.risk_calculator.calculate_risk_metrics(
        #         parsed_data,
        #         self.market_info,
        #     )
        #     status = self.risk_calculator.get_risk_status(
        #         metrics.liquidation_distance_percent,
        #         subaccount.liquidation_threshold_percent
        #     )
        #
        #     return await self._cache_status(
        #         subaccount,
        #         metrics,
        #         status,
        #         source="rest",
        #         received_at=time.time(),
        #     )
        # except Exception as e:
        #     logger.error(f"Error getting subaccount status: {e}")
        #     return None


# Global monitor service instance
monitor_service = MonitorService()
