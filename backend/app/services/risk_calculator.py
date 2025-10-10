from decimal import Decimal
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class RiskMetrics:
    """Data class for risk metrics"""

    def __init__(
        self,
        equity: Decimal,
        maintenance_requirement: Decimal,
        initial_requirement: Decimal,
        margin_ratio: Decimal,
        liquidation_distance_percent: Decimal,
        free_collateral: Decimal,
        positions: Dict[str, Any],
        position_metrics: Dict[str, Any],
        max_liquidation_penalty: Optional[Decimal],
    ):
        self.equity = equity
        self.maintenance_requirement = maintenance_requirement
        self.initial_requirement = initial_requirement
        self.margin_ratio = margin_ratio
        self.liquidation_distance_percent = liquidation_distance_percent
        self.free_collateral = free_collateral
        self.positions = positions
        self.position_metrics = position_metrics
        self.max_liquidation_penalty = max_liquidation_penalty
        self.initial_margin_percent: Optional[Decimal] = None
        self.maintenance_margin_percent: Optional[Decimal] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary, handling infinity values for JSON serialization"""

        def safe_float(value: Decimal) -> Optional[float]:
            """Convert Decimal to float, returning None for infinity (JSON-safe)"""
            if value is None:
                return None
            if value == Decimal("inf") or value == Decimal("-inf"):
                return None
            return float(value)

        return {
            "equity": safe_float(self.equity),
            "maintenance_requirement": safe_float(self.maintenance_requirement),
            "initial_requirement": safe_float(self.initial_requirement),
            "margin_ratio": safe_float(self.margin_ratio),
            "liquidation_distance_percent": safe_float(
                self.liquidation_distance_percent
            ),
            "free_collateral": safe_float(self.free_collateral),
            "initial_margin_percent": (
                safe_float(self.initial_margin_percent)
                if self.initial_margin_percent is not None
                else None
            ),
            "maintenance_margin_percent": (
                safe_float(self.maintenance_margin_percent)
                if self.maintenance_margin_percent is not None
                else None
            ),
            "positions": self.positions,
            "position_metrics": self.position_metrics,
            "max_liquidation_penalty": safe_float(self.max_liquidation_penalty),
        }


class RiskCalculator:
    """Calculate risk metrics for trading positions"""

    def __init__(self):
        # fallback when market data is unavailable
        self.default_maintenance_margin_fraction = Decimal("0.03")
        self.default_initial_margin_fraction = Decimal("0.05")

    def _resolve_market_fraction(
        self,
        market: str,
        markets: Optional[Dict[str, Any]] = None,
    ) -> Decimal:
        """Return the maintenance margin fraction for a market."""
        if not markets:
            return self.default_maintenance_margin_fraction

        market_info = markets.get(market)
        if not market_info:
            return self.default_maintenance_margin_fraction

        fraction = market_info.get("maintenance_margin_fraction")
        if fraction is None:
            return self.default_maintenance_margin_fraction

        try:
            return Decimal(str(fraction))
        except Exception:
            logger.warning(
                "Invalid maintenance margin fraction for %s: %s", market, fraction
            )
            return self.default_maintenance_margin_fraction

    def _resolve_initial_fraction(
        self,
        market: str,
        markets: Optional[Dict[str, Any]] = None,
    ) -> Decimal:
        """Return the initial margin fraction for a market."""
        if not markets:
            return self.default_initial_margin_fraction

        market_info = markets.get(market)
        if not market_info:
            return self.default_initial_margin_fraction

        fraction = market_info.get("initial_margin_fraction") or market_info.get(
            "initialMarginFraction"
        )

        if fraction is None:
            ppm_value = market_info.get(
                "initial_margin_fraction_ppm"
            ) or market_info.get("initialMarginFractionPpm")
            if ppm_value is not None:
                try:
                    fraction = Decimal(str(ppm_value)) / Decimal("1000000")
                except Exception:
                    fraction = None

        if fraction is None:
            return self.default_initial_margin_fraction

        try:
            return Decimal(str(fraction))
        except Exception:
            logger.warning(
                "Invalid initial margin fraction for %s: %s", market, fraction
            )
            return self.default_initial_margin_fraction

    def calculate_effective_imf(
        self,
        market: str,
        markets: Optional[Dict[str, Any]] = None,
    ) -> Decimal:
        """
        Calculate effective Initial Margin Fraction with Open-Interest-Based IMF scaling
        Per dYdX docs:
        effective_IMF = Min(base_IMF + Max(IMF_increase, 0), 100%)
        where IMF_increase = scaling_factor * (1 - base_IMF)
        and scaling_factor = (open_notional - lower_cap) / (upper_cap - lower_cap)
        """
        base_imf = self._resolve_initial_fraction(market, markets)

        if not markets:
            return base_imf

        market_info = markets.get(market)
        if not market_info:
            return base_imf

        try:
            # Get open interest and oracle price
            open_interest = self._safe_decimal(
                market_info.get("openInterest") or market_info.get("open_interest")
            )
            oracle_price = self._safe_decimal(
                market_info.get("oraclePrice") or market_info.get("oracle_price")
            )

            if open_interest is None or oracle_price is None:
                return base_imf

            # Calculate open notional value
            open_notional = abs(open_interest * oracle_price)

            # Get IMF scaling parameters
            lower_cap = self._safe_decimal(
                market_info.get("openInterestLowerCap")
                or market_info.get("open_interest_lower_cap")
            )
            upper_cap = self._safe_decimal(
                market_info.get("openInterestUpperCap")
                or market_info.get("open_interest_upper_cap")
            )

            # If caps not available, no scaling
            if lower_cap is None or upper_cap is None:
                return base_imf

            # Avoid division by zero
            if upper_cap == lower_cap:
                return base_imf

            # Calculate scaling factor (clamped between 0 and 1)
            scaling_factor = (open_notional - lower_cap) / (upper_cap - lower_cap)
            scaling_factor = max(Decimal("0"), min(Decimal("1"), scaling_factor))

            # Calculate IMF increase
            imf_increase = scaling_factor * (Decimal("1") - base_imf)
            imf_increase = max(Decimal("0"), imf_increase)

            # Calculate effective IMF (capped at 100%)
            effective_imf = min(base_imf + imf_increase, Decimal("1"))

            logger.debug(
                f"OI-based IMF scaling for {market}: base={base_imf}, "
                f"open_notional={open_notional}, scaling_factor={scaling_factor}, "
                f"effective_imf={effective_imf}"
            )

            return effective_imf

        except Exception as e:
            logger.warning(f"Error calculating effective IMF for {market}: {e}")
            return base_imf

    def calculate_margin_ratio(
        self, equity: Decimal, maintenance_requirement: Decimal
    ) -> Decimal:
        """
        Calculate margin ratio: equity / maintenance_requirement
        Returns infinity if maintenance_requirement is 0
        """
        if maintenance_requirement == 0:
            return Decimal("inf")
        return equity / maintenance_requirement

    def calculate_liquidation_distance(self, margin_ratio: Decimal) -> Decimal:
        """
        Calculate percentage distance from liquidation
        100% = at liquidation threshold (margin_ratio = 1.0)
        Returns the percentage above liquidation
        """
        if margin_ratio == Decimal("inf"):
            return Decimal("inf")

        # Distance from liquidation as percentage
        # If margin_ratio = 1.1, then distance = 10% above liquidation
        distance = (margin_ratio - Decimal("1.0")) * Decimal("100")
        return distance

    def _safe_decimal(self, value: Any) -> Optional[Decimal]:
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except Exception:
            return None

    def _safe_float(self, value: Optional[Decimal]) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except Exception:
            return None

    def calculate_maintenance_requirement(
        self,
        positions: Dict[str, Any],
        markets: Optional[Dict[str, Any]] = None,
        details: Optional[Dict[str, Decimal]] = None,
    ) -> Decimal:
        """
        Calculate total maintenance margin requirement for all positions
        Per dYdX docs: Total MMR = Σ abs(Si × Pi × Mi)
        Where S = size, P = oracle price, M = maintenance margin fraction
        """
        total_requirement = Decimal("0")

        for market, position in positions.items():
            try:
                size = abs(Decimal(str(position.get("size", "0"))))

                # Get oracle price from markets data (position data doesn't have it)
                price_value = None
                if markets:
                    market_info = markets.get(market)
                    if market_info:
                        price_value = self._safe_decimal(
                            market_info.get("oracle_price")
                            or market_info.get("oraclePrice")
                        )

                # Fallback to position data if markets data unavailable
                if price_value is None:
                    price_fields = [
                        "oraclePrice",
                        "indexPrice",
                        "markPrice",
                        "entryPrice",
                        "price",
                    ]
                    for field in price_fields:
                        field_value = position.get(field)
                        if field_value is not None:
                            price_value = Decimal(str(field_value))
                            break

                if price_value is None:
                    logger.debug(
                        "Skipping maintenance calculation for %s: missing price", market
                    )
                    continue

                notional = size * price_value
                if notional == 0:
                    continue

                fraction = self._resolve_market_fraction(market, markets)
                if fraction == self.default_maintenance_margin_fraction:
                    override_fraction = position.get("maintenanceMarginFraction")
                    if (
                        override_fraction is None
                        and position.get("maintenanceMarginFractionPpm") is not None
                    ):
                        try:
                            override_fraction = Decimal(
                                str(position["maintenanceMarginFractionPpm"])
                            ) / Decimal("1000000")
                        except Exception:
                            override_fraction = None

                    if override_fraction is not None:
                        try:
                            fraction = Decimal(str(override_fraction))
                        except Exception:
                            logger.debug(
                                "Invalid position-level maintenance fraction for %s: %s",
                                market,
                                override_fraction,
                            )
                requirement = notional * fraction

                total_requirement += requirement
                if details is not None:
                    details[market] = requirement
            except Exception as e:
                logger.error(f"Error calculating requirement for {market}: {e}")
                continue

        return total_requirement

    def calculate_initial_requirement(
        self,
        positions: Dict[str, Any],
        markets: Optional[Dict[str, Any]] = None,
        details: Optional[Dict[str, Decimal]] = None,
    ) -> Decimal:
        """
        Calculate total initial margin requirement for all positions
        Per dYdX docs: Total IMR = Σ abs(Si × Pi × Ii)
        Where S = size, P = oracle price, I = effective initial margin fraction (with OI scaling)
        """
        total_requirement = Decimal("0")

        for market, position in positions.items():
            try:
                size = abs(Decimal(str(position.get("size", "0"))))

                # Get oracle price from markets data (position data doesn't have it)
                price_value = None
                if markets:
                    market_info = markets.get(market)
                    if market_info:
                        price_value = self._safe_decimal(
                            market_info.get("oracle_price")
                            or market_info.get("oraclePrice")
                        )

                # Fallback to position data if markets data unavailable
                if price_value is None:
                    price_fields = [
                        "oraclePrice",
                        "indexPrice",
                        "markPrice",
                        "entryPrice",
                        "price",
                    ]
                    for field in price_fields:
                        field_value = position.get(field)
                        if field_value is not None:
                            price_value = Decimal(str(field_value))
                            break

                if price_value is None:
                    logger.debug(
                        "Skipping initial requirement calculation for %s: missing price",
                        market,
                    )
                    continue

                notional = size * price_value
                if notional == 0:
                    continue

                # Get effective initial margin fraction with OI-based scaling
                fraction = self.calculate_effective_imf(market, markets)
                if fraction == self.default_initial_margin_fraction:
                    override_fraction = position.get(
                        "initialMarginFraction"
                    ) or position.get("initial_margin_fraction")
                    if override_fraction is not None:
                        try:
                            fraction = Decimal(str(override_fraction))
                        except Exception:
                            logger.debug(
                                "Invalid position-level initial fraction for %s: %s",
                                market,
                                override_fraction,
                            )

                requirement = notional * fraction

                total_requirement += requirement
                if details is not None:
                    details[market] = requirement
            except Exception as e:
                logger.error(f"Error calculating initial requirement for {market}: {e}")
                continue

        return total_requirement

    def calculate_isolated_liquidation_price(
        self,
        equity: Decimal,
        size: Decimal,
        oracle_price: Decimal,
        maintenance_fraction: Decimal,
    ) -> Optional[Decimal]:
        """
        Calculate isolated liquidation price for a position.

        Per dYdX docs: p' = (e - s × p) / (|s| × MMF - s)

        IMPORTANT: The 'p' in the formula refers to the CURRENT oracle price, not entry price.
        This is because:
        1. 'e' (equity) already includes unrealized P&L at current oracle price
        2. We're solving for the future price that would trigger liquidation
        3. Mathematically verified: the formula only works with current oracle price

        Example (from dYdX docs):
        - Deposit $1,000, short 3 ETH at $3,000, MMF=5%
        - Using oracle=$3,000: liq_price = (1000-(-3)×3000)/(3×0.05-(-3)) = $3,174.60 ✓
        - At $3,174.60: equity=$476.20 = MMR=$476.19 (liquidation condition met)
        """
        if oracle_price is None:
            return None

        denominator = (abs(size) * maintenance_fraction) - size
        if denominator == 0:
            return None

        try:
            return (equity - (size * oracle_price)) / denominator
        except Exception as exc:
            logger.debug("Failed isolated liquidation price calculation: %s", exc)
            return None

    def calculate_cross_liquidation_price(
        self,
        equity: Decimal,
        size: Decimal,
        oracle_price: Decimal,
        maintenance_fraction: Decimal,
        other_requirements: Decimal,
    ) -> Optional[Decimal]:
        """
        Calculate cross margin liquidation price accounting for other positions.

        Per dYdX docs: p' = (e - s × p - MMR_other) / (|s| × MMF - s)

        Where:
        - e = total account equity (including all positions at current oracle prices)
        - s = size of this position (signed)
        - p = CURRENT oracle price for this position
        - MMR_other = maintenance margin requirement of OTHER positions
        - MMF = maintenance margin fraction for this position

        See calculate_isolated_liquidation_price() for explanation of why we use
        current oracle price rather than entry price.
        """
        denominator = (abs(size) * maintenance_fraction) - size
        if denominator == 0:
            return None

        try:
            return (equity - (size * oracle_price) - other_requirements) / denominator
        except Exception as exc:
            logger.debug("Failed cross liquidation price calculation: %s", exc)
            return None

    def calculate_fillable_price(
        self,
        oracle_price: Optional[Decimal],
        maintenance_fraction: Decimal,
        equity: Decimal,
        total_requirement: Decimal,
        market_info: Optional[Dict[str, Any]],
    ) -> Optional[Decimal]:
        """Calculate protocol fillable price for a liquidation order."""
        if oracle_price is None or oracle_price <= 0:
            return None
        if market_info is None:
            return None

        spread_ratio = self._safe_decimal(market_info.get("spread_to_mmr_ratio"))
        bankruptcy_adjustment = self._safe_decimal(
            market_info.get("bankruptcy_adjustment")
        )

        if not spread_ratio or spread_ratio <= 0:
            return None
        if not bankruptcy_adjustment or bankruptcy_adjustment <= 0:
            return None

        Q = Decimal("0")
        if total_requirement > 0:
            Q = equity / total_requirement
        # Clamp Q between 0 and 1 to avoid runaway values
        Q = min(max(Q, Decimal("0")), Decimal("1"))

        try:
            adjustment = (spread_ratio * maintenance_fraction) * (
                bankruptcy_adjustment * (Decimal("1") - Q)
            )
            fillable = oracle_price * (Decimal("1") - adjustment)
            return fillable
        except Exception as exc:
            logger.debug("Failed fillable price calculation: %s", exc)
            return None

    def calculate_risk_metrics(
        self, subaccount_data: Dict[str, Any], markets: Optional[Dict[str, Any]] = None
    ) -> RiskMetrics:
        """
        Calculate comprehensive risk metrics per dYdX v4 Chain specifications.

        All formulas validated against official dYdX documentation:
        - Total Account Value = Q + Σ(Si × Pi)
        - Total IMR = Σ abs(Si × Pi × Ii) with OI-based IMF scaling
        - Total MMR = Σ abs(Si × Pi × Mi)
        - Free Collateral = Total Account Value - Total IMR
        - Liquidation prices using current oracle prices
        - Fillable price per protocol liquidation formula

        Trust API-provided values: equity, freeCollateral (when available)
        Calculate: margin requirements, liquidation prices, leverage, risk status
        """
        try:
            # Trust API equity value
            equity = Decimal(str(subaccount_data.get("equity", "0")))

            # Trust API freeCollateral value if provided
            api_free_collateral = self._safe_decimal(
                subaccount_data.get("free_collateral")
                or subaccount_data.get("freeCollateral")
            )

            positions = subaccount_data.get("positions", {})

            per_position_requirements: Dict[str, Decimal] = {}
            per_position_initial_requirements: Dict[str, Decimal] = {}
            per_position_raw_maintenance: Dict[str, Decimal] = {}
            per_position_raw_initial: Dict[str, Decimal] = {}

            # Calculate Total Maintenance Margin Requirement
            # Per dYdX: Total MMR = Σ abs(Si × Pi × Mi)
            maintenance_requirement = self.calculate_maintenance_requirement(
                positions,
                markets,
                details=per_position_requirements,
            )

            # Calculate Total Initial Margin Requirement
            # Per dYdX: Total IMR = Σ abs(Si × Pi × Ii)
            initial_requirement = self.calculate_initial_requirement(
                positions,
                markets,
                details=per_position_initial_requirements,
            )

            # Use API free_collateral if available, otherwise calculate
            # Per dYdX: Free Collateral = Total Account Value - Total Initial Margin Requirement
            if api_free_collateral is not None:
                free_collateral = api_free_collateral
            else:
                free_collateral = equity - initial_requirement

            # Calculate margin ratio (for liquidation distance)
            margin_ratio = self.calculate_margin_ratio(equity, maintenance_requirement)

            # Calculate distance from liquidation
            liquidation_distance = self.calculate_liquidation_distance(margin_ratio)

            position_metrics: Dict[str, Any] = {}
            total_position_notional = Decimal("0")

            for market, position in positions.items():
                raw_size = self._safe_decimal(position.get("size"))
                if raw_size is None or raw_size == 0:
                    continue

                size = raw_size
                side = position.get("side") or position.get("positionSide")
                if isinstance(side, str):
                    normalized = side.upper()
                    if normalized in {"SHORT", "SELL"}:
                        size = -abs(raw_size)
                    elif normalized in {"LONG", "BUY"}:
                        size = abs(raw_size)
                elif position.get("isLong") is not None:
                    is_long = bool(position.get("isLong"))
                    size = abs(raw_size) if is_long else -abs(raw_size)
                elif position.get("isShort") is not None:
                    is_short = bool(position.get("isShort"))
                    size = -abs(raw_size) if is_short else abs(raw_size)

                entry_price = self._safe_decimal(
                    position.get("entryPrice") or position.get("averageEntryPrice")
                )

                maintenance_fraction = self._resolve_market_fraction(market, markets)
                market_info = markets.get(market) if markets else None

                # Get oracle price from MARKETS data, NOT position data
                # Position data doesn't include oracle price, only entry price
                oracle_price = None
                oracle_source = "unknown"
                if market_info:
                    oracle_price = self._safe_decimal(
                        market_info.get("oracle_price")
                        or market_info.get("oraclePrice")
                    )
                    if oracle_price is not None:
                        oracle_source = "market_info"
                else:
                    logger.warning(
                        f"No market_info for {market}! This will cause oracle price fallback to entry price"
                    )

                # Fallback to position data only if market data unavailable
                if oracle_price is None:
                    oracle_price = self._safe_decimal(
                        position.get("oraclePrice") or position.get("indexPrice")
                    )
                    if oracle_price is not None:
                        oracle_source = "position_data"

                # Last resort: use entry price (but this is not ideal)
                if oracle_price is None:
                    oracle_price = entry_price
                    oracle_source = "entry_price"
                    logger.warning(
                        f"Using entry_price as oracle for {market}! entry_price=${entry_price}"
                    )
                # Use effective IMF with OI-based scaling
                initial_fraction = self.calculate_effective_imf(market, markets)

                requirement = per_position_requirements.get(market, Decimal("0"))
                initial_req = per_position_initial_requirements.get(
                    market, Decimal("0")
                )
                other_requirements = maintenance_requirement - requirement
                if other_requirements < 0:
                    other_requirements = Decimal("0")

                # ALWAYS calculate position_notional using oracle price (not entry price)
                # This matches dYdX UI which uses current oracle price for position value
                position_notional = None
                if oracle_price is not None and size is not None:
                    position_notional = abs(size) * oracle_price
                else:
                    # Fallback to API-provided value only if oracle price is not available
                    raw_position_value = self._safe_decimal(
                        position.get("openNotional")
                        or position.get("positionValue")
                        or position.get("notional")
                        or position.get("notionalValue")
                    )
                    if raw_position_value is not None:
                        position_notional = abs(raw_position_value)

                # Override requirements with raw values if provided by the API
                raw_maintenance_req = self._safe_decimal(
                    position.get("maintenanceMarginRequirement")
                )
                if raw_maintenance_req is not None:
                    requirement = raw_maintenance_req
                    per_position_requirements[market] = raw_maintenance_req
                    per_position_raw_maintenance[market] = raw_maintenance_req

                raw_initial_req = self._safe_decimal(
                    position.get("initialMarginRequirement")
                )
                if raw_initial_req is not None:
                    initial_req = raw_initial_req
                    per_position_initial_requirements[market] = raw_initial_req
                    per_position_raw_initial[market] = raw_initial_req

                if initial_req is not None and initial_fraction not in (
                    None,
                    Decimal("0"),
                ):
                    position_notional = abs(initial_req / initial_fraction)

                if (
                    position_notional is None
                    and requirement is not None
                    and maintenance_fraction not in (None, Decimal("0"))
                ):
                    position_notional = abs(requirement / maintenance_fraction)

                # Calculate liquidation prices using ORACLE PRICE (not entry price)
                isolated_price = None
                cross_price = None
                if oracle_price is not None:
                    isolated_price = self.calculate_isolated_liquidation_price(
                        equity,
                        size,
                        oracle_price,  # Use oracle price, not entry price!
                        maintenance_fraction,
                    )
                    cross_price = self.calculate_cross_liquidation_price(
                        equity,
                        size,
                        oracle_price,  # Use oracle price, not entry price!
                        maintenance_fraction,
                        other_requirements,
                    )

                fillable_price = self.calculate_fillable_price(
                    oracle_price,
                    maintenance_fraction,
                    equity,
                    maintenance_requirement,
                    market_info,
                )

                protocol_liquidation_price = self._safe_decimal(
                    position.get("liquidationPrice")
                    or position.get("estimatedLiquidationPrice")
                    or position.get("liquidation_price")
                )

                def _sanitize(price: Optional[Decimal]) -> Optional[Decimal]:
                    if price is None:
                        return None
                    if price <= 0:
                        return None
                    if price > Decimal("1e7"):
                        return None
                    return price

                isolated_price = _sanitize(isolated_price)
                cross_price = _sanitize(cross_price)
                protocol_liquidation_price = _sanitize(protocol_liquidation_price)

                # Use protocol liquidation price from dYdX API if available
                # The protocol price is specific to the position's margin mode
                margin_mode = (position.get("marginMode") or "CROSS").upper()
                if protocol_liquidation_price is not None:
                    if margin_mode == "ISOLATED":
                        # For isolated positions, protocol price is the isolated liquidation price
                        isolated_price = protocol_liquidation_price
                    else:
                        # For cross positions, protocol price is the cross liquidation price
                        cross_price = protocol_liquidation_price

                # Calculate unrealized PnL as percentage of entry value
                unrealized_pnl_decimal = self._safe_decimal(
                    position.get("unrealizedPnl")
                    or position.get("unrealizedPnlUsd")
                    or position.get("pnl")
                )
                entry_value = abs(size * entry_price) if size and entry_price else None
                unrealized_pnl_percent = None
                if unrealized_pnl_decimal is not None and entry_value and entry_value != 0:
                    unrealized_pnl_percent = (unrealized_pnl_decimal / entry_value) * Decimal("100")

                # Calculate position-specific liquidation distance
                # Simplified: position's contribution to total margin requirement vs position's equity contribution
                position_liquidation_distance_percent = None
                if requirement and requirement != 0 and position_notional is not None:
                    # Position's "margin ratio" = position_equity / position_maintenance_req
                    # For simplification, use unrealized PnL + position notional as position equity contribution
                    position_equity_contribution = position_notional + (unrealized_pnl_decimal or Decimal("0"))
                    if position_equity_contribution > 0:
                        position_margin_ratio = position_equity_contribution / requirement
                        # Distance from liquidation (margin_ratio = 1.0 is liquidation)
                        position_liquidation_distance_percent = (position_margin_ratio - Decimal("1.0")) * Decimal("100")

                position_metrics[market] = {
                    "margin_mode": position.get("marginMode"),
                    "size": self._safe_float(size),
                    "entry_price": self._safe_float(entry_price),
                    "oracle_price": self._safe_float(oracle_price),
                    "maintenance_margin_fraction": self._safe_float(
                        maintenance_fraction
                    ),
                    "initial_margin_fraction": self._safe_float(initial_fraction),
                    "maintenance_requirement": self._safe_float(requirement),
                    "initial_requirement": self._safe_float(initial_req),
                    "maintenance_margin_percent": (
                        self._safe_float(maintenance_fraction * Decimal("100"))
                        if maintenance_fraction is not None
                        else None
                    ),
                    "initial_margin_percent": (
                        self._safe_float(initial_fraction * Decimal("100"))
                        if initial_fraction is not None
                        else None
                    ),
                    "position_value": self._safe_float(position_notional),
                    "unrealized_pnl": self._safe_float(unrealized_pnl_decimal),
                    "unrealized_pnl_percent": self._safe_float(unrealized_pnl_percent),  # NEW: PnL as % of entry
                    "funding_payment": self._safe_float(
                        self._safe_decimal(
                            position.get("fundingPayment") or position.get("funding")
                        )
                    ),
                    "realized_pnl": self._safe_float(
                        self._safe_decimal(
                            position.get("realizedPnl")
                            or position.get("realizedPnlUsd")
                        )
                    ),
                    "leverage": self._safe_float(  # NEW: Renamed from leverage_on_equity for clarity
                        (position_notional / equity)
                        if equity and equity != 0 and position_notional is not None
                        else None
                    ),
                    "leverage_on_equity": self._safe_float(  # Keep for backward compatibility
                        (position_notional / equity)
                        if equity and equity != 0 and position_notional is not None
                        else None
                    ),
                    "leverage_on_initial_margin": self._safe_float(
                        (Decimal("1") / initial_fraction) if initial_fraction else None
                    ),
                    "liquidation_distance_percent": self._safe_float(position_liquidation_distance_percent),  # NEW: Position-specific liquidation distance
                    "isolated_liquidation_price": self._safe_float(isolated_price),
                    "cross_liquidation_price": self._safe_float(cross_price),
                    "fillable_price": self._safe_float(fillable_price),
                    "protocol_liquidation_price": self._safe_float(
                        protocol_liquidation_price
                    ),
                }

                if position_notional is not None:
                    total_position_notional += position_notional

            max_penalty_rate = Decimal("0.015")  # 1.5% default per dYdX docs
            max_liquidation_penalty = equity * max_penalty_rate if equity > 0 else None

            metrics_obj = RiskMetrics(
                equity=equity,
                maintenance_requirement=maintenance_requirement,
                initial_requirement=initial_requirement,
                margin_ratio=margin_ratio,
                liquidation_distance_percent=liquidation_distance,
                free_collateral=free_collateral,
                positions=positions,
                position_metrics=position_metrics,
                max_liquidation_penalty=max_liquidation_penalty,
            )

            if per_position_raw_initial:
                initial_requirement = sum(per_position_raw_initial.values())
                metrics_obj.initial_requirement = initial_requirement
                # Always prefer API free_collateral if available
                if api_free_collateral is not None:
                    metrics_obj.free_collateral = api_free_collateral
                else:
                    metrics_obj.free_collateral = equity - initial_requirement
            if per_position_raw_maintenance:
                maintenance_requirement = sum(per_position_raw_maintenance.values())
                metrics_obj.maintenance_requirement = maintenance_requirement

            if total_position_notional > 0:
                metrics_obj.initial_margin_percent = (
                    initial_requirement / total_position_notional
                ) * Decimal("100")
                metrics_obj.maintenance_margin_percent = (
                    maintenance_requirement / total_position_notional
                ) * Decimal("100")

            return metrics_obj
        except Exception as e:
            logger.error(f"Error calculating risk metrics: {e}")
            # Return safe defaults
            return RiskMetrics(
                equity=Decimal("0"),
                maintenance_requirement=Decimal("0"),
                initial_requirement=Decimal("0"),
                margin_ratio=Decimal("inf"),
                liquidation_distance_percent=Decimal("inf"),
                free_collateral=Decimal("0"),
                positions={},
                position_metrics={},
                max_liquidation_penalty=None,
            )

    def get_risk_status(
        self, liquidation_distance_percent: Decimal, threshold: float
    ) -> str:
        """
        Determine risk status based on distance from liquidation
        """
        if liquidation_distance_percent == Decimal("inf"):
            return "safe"

        threshold_decimal = Decimal(str(threshold))

        if liquidation_distance_percent <= 0:
            return "liquidated"
        elif liquidation_distance_percent <= Decimal("5"):
            return "critical"
        elif liquidation_distance_percent <= threshold_decimal:
            return "warning"
        else:
            return "safe"
