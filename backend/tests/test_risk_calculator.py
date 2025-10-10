import pytest
from decimal import Decimal
from app.services.risk_calculator import RiskCalculator


def test_calculate_margin_ratio():
    """Test margin ratio calculation"""
    calculator = RiskCalculator()

    # Normal case
    equity = Decimal("1000")
    requirement = Decimal("500")
    ratio = calculator.calculate_margin_ratio(equity, requirement)
    assert ratio == Decimal("2.0")

    # At liquidation
    equity = Decimal("500")
    requirement = Decimal("500")
    ratio = calculator.calculate_margin_ratio(equity, requirement)
    assert ratio == Decimal("1.0")

    # Zero requirement (no positions)
    equity = Decimal("1000")
    requirement = Decimal("0")
    ratio = calculator.calculate_margin_ratio(equity, requirement)
    assert ratio == Decimal("inf")


def test_calculate_liquidation_distance():
    """Test liquidation distance calculation"""
    calculator = RiskCalculator()

    # 50% above liquidation
    margin_ratio = Decimal("1.5")
    distance = calculator.calculate_liquidation_distance(margin_ratio)
    assert distance == Decimal("50")

    # 10% above liquidation
    margin_ratio = Decimal("1.1")
    distance = calculator.calculate_liquidation_distance(margin_ratio)
    assert distance == Decimal("10")

    # At liquidation
    margin_ratio = Decimal("1.0")
    distance = calculator.calculate_liquidation_distance(margin_ratio)
    assert distance == Decimal("0")

    # Below liquidation
    margin_ratio = Decimal("0.9")
    distance = calculator.calculate_liquidation_distance(margin_ratio)
    assert distance == Decimal("-10")


def test_get_risk_status():
    """Test risk status determination"""
    calculator = RiskCalculator()
    threshold = 10.0

    # Safe
    status = calculator.get_risk_status(Decimal("20"), threshold)
    assert status == "safe"

    # Warning
    status = calculator.get_risk_status(Decimal("8"), threshold)
    assert status == "warning"

    # Critical
    status = calculator.get_risk_status(Decimal("3"), threshold)
    assert status == "critical"

    # Liquidated
    status = calculator.get_risk_status(Decimal("-5"), threshold)
    assert status == "liquidated"

    # No positions
    status = calculator.get_risk_status(Decimal("inf"), threshold)
    assert status == "safe"


def test_calculate_maintenance_requirement():
    """Test maintenance requirement calculation"""
    calculator = RiskCalculator()

    positions = {
        "BTC-USD": {"size": "1.0", "entryPrice": "50000"},
        "ETH-USD": {"size": "10.0", "entryPrice": "3000"},
    }

    requirement = calculator.calculate_maintenance_requirement(positions)

    # BTC: 1 * 50000 * 0.03 = 1500
    # ETH: 10 * 3000 * 0.03 = 900
    # Total: 2400
    expected = Decimal("2400")
    assert requirement == expected


def test_calculate_maintenance_requirement_with_market_data():
    """Maintenance requirement should respect per-market fractions."""
    calculator = RiskCalculator()

    positions = {
        "BTC-USD": {"size": "1.0", "oraclePrice": "50000"},
        "ETH-USD": {"size": "10.0", "oraclePrice": "3000"},
    }

    markets = {
        "BTC-USD": {"maintenance_margin_fraction": "0.05"},  # 5%
        "ETH-USD": {"maintenance_margin_fraction": "0.02"},  # 2%
    }

    requirement = calculator.calculate_maintenance_requirement(positions, markets)

    # BTC: 1 * 50000 * 0.05 = 2500
    # ETH: 10 * 3000 * 0.02 = 600
    # Total: 3100
    assert requirement == Decimal("3100")


def test_calculate_isolated_liquidation_price():
    calculator = RiskCalculator()
    price = calculator.calculate_isolated_liquidation_price(
        equity=Decimal("1000"),
        size=Decimal("-3"),
        entry_price=Decimal("3000"),
        maintenance_fraction=Decimal("0.05"),
    )
    assert price is not None
    assert float(price) == pytest.approx(3174.60317, rel=1e-6)


def test_calculate_cross_liquidation_price():
    calculator = RiskCalculator()
    price = calculator.calculate_cross_liquidation_price(
        equity=Decimal("1000"),
        size=Decimal("-1.5"),
        entry_price=Decimal("3000"),
        maintenance_fraction=Decimal("0.05"),
        other_requirements=Decimal("175"),
    )
    assert price is not None
    assert float(price) == pytest.approx(3380.95238, rel=1e-6)


def test_position_metrics_include_fillable_price():
    calculator = RiskCalculator()
    subaccount_data = {
        "equity": "1000",
        "free_collateral": "950",
        "positions": {
            "ETH-USD": {
                "size": "-3",
                "entryPrice": "3000",
                "oraclePrice": "3000",
                "marginMode": "cross",
                "initialMarginRequirement": "50",
                "maintenanceMarginRequirement": "30",
                "unrealizedPnl": "5",
                "fundingPayment": "1",
                "realizedPnl": "2",
            }
        },
    }
    markets = {
        "ETH-USD": {
            "maintenance_margin_fraction": "0.03",
            "spread_to_mmr_ratio": "0.1",
            "bankruptcy_adjustment": "1.5",
            "initial_margin_fraction": "0.05",
        }
    }

    metrics = calculator.calculate_risk_metrics(subaccount_data, markets)
    assert float(metrics.initial_requirement) == pytest.approx(50.0)
    assert float(metrics.maintenance_requirement) == pytest.approx(30.0)
    assert float(metrics.free_collateral) == pytest.approx(950.0)
    assert float(metrics.initial_margin_percent) == pytest.approx(
        (50.0 / (3 * 3000)) * 100
    )
    assert float(metrics.maintenance_margin_percent) == pytest.approx(
        (30.0 / (3 * 3000)) * 100
    )
    position_metrics = metrics.position_metrics.get("ETH-USD")
    assert position_metrics is not None
    assert position_metrics["isolated_liquidation_price"] is not None
    assert position_metrics["cross_liquidation_price"] is not None
    assert position_metrics["fillable_price"] is not None
    assert position_metrics["protocol_liquidation_price"] is None
    assert position_metrics["initial_requirement"] == pytest.approx(50.0)
    assert position_metrics["maintenance_requirement"] == pytest.approx(30.0)
