"""
Comprehensive tests for Alert Rule Evaluator

Tests all condition types, comparison operators, and edge cases
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4, UUID

from app.services.alert_rule_evaluator import AlertRuleEvaluator, RuleAlert
from app.services.risk_calculator import RiskMetrics
from app.models.alert_rule import AlertRule
from app.models.subaccount import Subaccount


# Mock classes for testing
class MockAlertRule:
    """Mock AlertRule for testing without database"""

    def __init__(
        self,
        id=None,
        name="Test Rule",
        condition_type="liquidation_distance",
        threshold_value=10.0,
        comparison="<=",
        alert_severity="warning",
        custom_message=None,
        channel_ids=None,
        cooldown_seconds=3600,
        enabled=True,
        subaccount_id=None,
        user_id=None,
    ):
        self.id = id or uuid4()
        self.name = name
        self.condition_type = condition_type
        self.threshold_value = threshold_value
        self.comparison = comparison
        self.alert_severity = alert_severity
        self.custom_message = custom_message
        self.channel_ids = channel_ids or []
        self.cooldown_seconds = cooldown_seconds
        self.enabled = enabled
        self.subaccount_id = subaccount_id
        self.user_id = user_id or uuid4()


class MockSubaccount:
    """Mock Subaccount for testing without database"""

    def __init__(
        self,
        id=None,
        address="dydx1test",
        subaccount_number=0,
        nickname="Test Account",
        user_id=None,
    ):
        self.id = id or uuid4()
        self.address = address
        self.subaccount_number = subaccount_number
        self.nickname = nickname
        self.user_id = user_id or uuid4()


class MockRiskMetrics:
    """Mock RiskMetrics for testing"""

    def __init__(
        self,
        equity=10000.0,
        margin_ratio=2.5,
        liquidation_distance_percent=15.0,
        free_collateral=5000.0,
        position_metrics=None,
    ):
        self.equity = Decimal(str(equity))
        self.margin_ratio = Decimal(str(margin_ratio))
        self.liquidation_distance_percent = Decimal(str(liquidation_distance_percent))
        self.free_collateral = Decimal(str(free_collateral))
        self.position_metrics = position_metrics or {}

    def to_dict(self):
        return {
            "equity": float(self.equity),
            "margin_ratio": float(self.margin_ratio),
            "liquidation_distance_percent": float(self.liquidation_distance_percent),
            "free_collateral": float(self.free_collateral),
        }


class TestAlertRuleEvaluatorConditions:
    """Test all condition types"""

    def setup_method(self):
        self.evaluator = AlertRuleEvaluator()
        self.subaccount = MockSubaccount()

    def test_liquidation_distance_condition(self):
        """Test liquidation_distance condition type"""
        # Metrics with 15% liquidation distance
        metrics = MockRiskMetrics(liquidation_distance_percent=15.0)

        # Rule: alert when liquidation distance <= 20%
        rule = MockAlertRule(
            condition_type="liquidation_distance", threshold_value=20.0, comparison="<="
        )

        # Should trigger (15 <= 20)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is True
        ), "Should trigger when liquidation distance (15%) <= threshold (20%)"

        # Rule: alert when liquidation distance <= 10%
        rule.threshold_value = 10.0

        # Should NOT trigger (15 > 10)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is False
        ), "Should NOT trigger when liquidation distance (15%) > threshold (10%)"

    def test_margin_ratio_condition(self):
        """Test margin_ratio condition type"""
        # Metrics with 2.5x margin ratio
        metrics = MockRiskMetrics(margin_ratio=2.5)

        # Rule: alert when margin ratio < 3.0
        rule = MockAlertRule(
            condition_type="margin_ratio", threshold_value=3.0, comparison="<"
        )

        # Should trigger (2.5 < 3.0)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is True
        ), "Should trigger when margin ratio (2.5) < threshold (3.0)"

        # Rule: alert when margin ratio < 2.0
        rule.threshold_value = 2.0

        # Should NOT trigger (2.5 >= 2.0)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is False
        ), "Should NOT trigger when margin ratio (2.5) >= threshold (2.0)"

    def test_equity_drop_condition(self):
        """Test equity_drop condition type"""
        # Metrics with $10,000 equity
        metrics = MockRiskMetrics(equity=10000.0)

        # Rule: alert when equity < $12,000
        rule = MockAlertRule(
            condition_type="equity_drop", threshold_value=12000.0, comparison="<"
        )

        # Should trigger (10000 < 12000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is True
        ), "Should trigger when equity ($10,000) < threshold ($12,000)"

        # Rule: alert when equity < $8,000
        rule.threshold_value = 8000.0

        # Should NOT trigger (10000 >= 8000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is False
        ), "Should NOT trigger when equity ($10,000) >= threshold ($8,000)"

    def test_position_size_condition(self):
        """Test position_size condition type"""
        # Metrics with positions totaling $25,000
        position_metrics = {
            "BTC-USD": {"position_value": 15000.0},
            "ETH-USD": {"position_value": -10000.0},  # Short position
        }
        metrics = MockRiskMetrics(position_metrics=position_metrics)

        # Rule: alert when total position size > $20,000
        rule = MockAlertRule(
            condition_type="position_size", threshold_value=20000.0, comparison=">"
        )

        # Should trigger (abs(15000) + abs(-10000) = 25000 > 20000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is True
        ), "Should trigger when position size ($25,000) > threshold ($20,000)"

        # Rule: alert when total position size > $30,000
        rule.threshold_value = 30000.0

        # Should NOT trigger (25000 <= 30000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is False
        ), "Should NOT trigger when position size ($25,000) <= threshold ($30,000)"

    def test_free_collateral_condition(self):
        """Test free_collateral condition type"""
        # Metrics with $5,000 free collateral
        metrics = MockRiskMetrics(free_collateral=5000.0)

        # Rule: alert when free collateral < $6,000
        rule = MockAlertRule(
            condition_type="free_collateral", threshold_value=6000.0, comparison="<"
        )

        # Should trigger (5000 < 6000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is True
        ), "Should trigger when free collateral ($5,000) < threshold ($6,000)"

        # Rule: alert when free collateral < $4,000
        rule.threshold_value = 4000.0

        # Should NOT trigger (5000 >= 4000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert (
            result is False
        ), "Should NOT trigger when free collateral ($5,000) >= threshold ($4,000)"


class TestAlertRuleEvaluatorComparisons:
    """Test all comparison operators"""

    def setup_method(self):
        self.evaluator = AlertRuleEvaluator()
        self.subaccount = MockSubaccount()

    def test_less_than_operator(self):
        """Test < comparison operator"""
        metrics = MockRiskMetrics(margin_ratio=2.0)
        rule = MockAlertRule(condition_type="margin_ratio", comparison="<")

        # Test cases: (actual_value, threshold, expected_result)
        test_cases = [
            (2.0, 3.0, True),  # 2.0 < 3.0 → True
            (2.0, 2.0, False),  # 2.0 < 2.0 → False
            (2.0, 1.0, False),  # 2.0 < 1.0 → False
        ]

        for actual, threshold, expected in test_cases:
            metrics.margin_ratio = Decimal(str(actual))
            rule.threshold_value = threshold
            result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
            assert (
                result == expected
            ), f"Failed: {actual} < {threshold} should be {expected}"

    def test_less_than_or_equal_operator(self):
        """Test <= comparison operator"""
        metrics = MockRiskMetrics(margin_ratio=2.0)
        rule = MockAlertRule(condition_type="margin_ratio", comparison="<=")

        # Test cases: (actual_value, threshold, expected_result)
        test_cases = [
            (2.0, 3.0, True),  # 2.0 <= 3.0 → True
            (2.0, 2.0, True),  # 2.0 <= 2.0 → True
            (2.0, 1.0, False),  # 2.0 <= 1.0 → False
        ]

        for actual, threshold, expected in test_cases:
            metrics.margin_ratio = Decimal(str(actual))
            rule.threshold_value = threshold
            result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
            assert (
                result == expected
            ), f"Failed: {actual} <= {threshold} should be {expected}"

    def test_greater_than_operator(self):
        """Test > comparison operator"""
        metrics = MockRiskMetrics(margin_ratio=2.0)
        rule = MockAlertRule(condition_type="margin_ratio", comparison=">")

        # Test cases: (actual_value, threshold, expected_result)
        test_cases = [
            (2.0, 1.0, True),  # 2.0 > 1.0 → True
            (2.0, 2.0, False),  # 2.0 > 2.0 → False
            (2.0, 3.0, False),  # 2.0 > 3.0 → False
        ]

        for actual, threshold, expected in test_cases:
            metrics.margin_ratio = Decimal(str(actual))
            rule.threshold_value = threshold
            result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
            assert (
                result == expected
            ), f"Failed: {actual} > {threshold} should be {expected}"

    def test_greater_than_or_equal_operator(self):
        """Test >= comparison operator"""
        metrics = MockRiskMetrics(margin_ratio=2.0)
        rule = MockAlertRule(condition_type="margin_ratio", comparison=">=")

        # Test cases: (actual_value, threshold, expected_result)
        test_cases = [
            (2.0, 1.0, True),  # 2.0 >= 1.0 → True
            (2.0, 2.0, True),  # 2.0 >= 2.0 → True
            (2.0, 3.0, False),  # 2.0 >= 3.0 → False
        ]

        for actual, threshold, expected in test_cases:
            metrics.margin_ratio = Decimal(str(actual))
            rule.threshold_value = threshold
            result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
            assert (
                result == expected
            ), f"Failed: {actual} >= {threshold} should be {expected}"

    def test_equal_operator(self):
        """Test == comparison operator with floating point tolerance"""
        metrics = MockRiskMetrics(margin_ratio=2.0)
        rule = MockAlertRule(condition_type="margin_ratio", comparison="==")

        # Test cases: (actual_value, threshold, expected_result)
        test_cases = [
            (2.0, 2.0, True),  # Exact match
            (2.0, 2.0005, True),  # Within tolerance (0.001)
            (2.0, 1.9995, True),  # Within tolerance (0.001)
            (2.0, 2.002, False),  # Outside tolerance
            (2.0, 1.997, False),  # Outside tolerance
        ]

        for actual, threshold, expected in test_cases:
            metrics.margin_ratio = Decimal(str(actual))
            rule.threshold_value = threshold
            result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
            assert (
                result == expected
            ), f"Failed: {actual} == {threshold} should be {expected}"


class TestAlertRuleEvaluatorCooldown:
    """Test cooldown functionality"""

    def setup_method(self):
        self.evaluator = AlertRuleEvaluator()
        self.subaccount = MockSubaccount()
        self.rule = MockAlertRule(cooldown_seconds=3600)  # 1 hour cooldown

    def test_first_alert_should_send(self):
        """First alert should always be sent"""
        result = self.evaluator.should_alert(self.rule, str(self.subaccount.id))
        assert result is True, "First alert should be sent"

    def test_cooldown_prevents_immediate_alert(self):
        """Alert should be blocked during cooldown period"""
        # Record first alert
        self.evaluator.record_alert(self.rule, str(self.subaccount.id))

        # Try to send another alert immediately
        result = self.evaluator.should_alert(self.rule, str(self.subaccount.id))
        assert result is False, "Alert should be blocked during cooldown"

    def test_alert_allowed_after_cooldown(self):
        """Alert should be allowed after cooldown expires"""
        # Record first alert with modified timestamp (1 hour and 1 second ago)
        cooldown_key = f"{self.rule.id}_{self.subaccount.id}"
        self.evaluator.last_alert_times[cooldown_key] = datetime.utcnow() - timedelta(
            seconds=3601
        )

        # Try to send another alert
        result = self.evaluator.should_alert(self.rule, str(self.subaccount.id))
        assert result is True, "Alert should be allowed after cooldown expires"

    def test_different_subaccounts_have_separate_cooldowns(self):
        """Different subaccounts should have independent cooldowns"""
        subaccount2 = MockSubaccount(id=uuid4())

        # Record alert for first subaccount
        self.evaluator.record_alert(self.rule, str(self.subaccount.id))

        # Alert for first subaccount should be blocked
        result1 = self.evaluator.should_alert(self.rule, str(self.subaccount.id))
        assert result1 is False, "First subaccount should be in cooldown"

        # Alert for second subaccount should be allowed
        result2 = self.evaluator.should_alert(self.rule, str(subaccount2.id))
        assert result2 is True, "Second subaccount should not be in cooldown"

    def test_different_rules_have_separate_cooldowns(self):
        """Different rules should have independent cooldowns"""
        rule2 = MockAlertRule(id=uuid4(), cooldown_seconds=3600)

        # Record alert for first rule
        self.evaluator.record_alert(self.rule, str(self.subaccount.id))

        # Alert for first rule should be blocked
        result1 = self.evaluator.should_alert(self.rule, str(self.subaccount.id))
        assert result1 is False, "First rule should be in cooldown"

        # Alert for second rule should be allowed
        result2 = self.evaluator.should_alert(rule2, str(self.subaccount.id))
        assert result2 is True, "Second rule should not be in cooldown"


class TestAlertRuleEvaluatorEdgeCases:
    """Test edge cases and error handling"""

    def setup_method(self):
        self.evaluator = AlertRuleEvaluator()
        self.subaccount = MockSubaccount()

    def test_unknown_condition_type(self):
        """Unknown condition type should return False"""
        metrics = MockRiskMetrics()
        rule = MockAlertRule(condition_type="unknown_type")

        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is False, "Unknown condition type should return False"

    def test_unknown_comparison_operator(self):
        """Unknown comparison operator should return False"""
        metrics = MockRiskMetrics()
        rule = MockAlertRule(comparison="!=")  # Not supported

        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is False, "Unknown comparison operator should return False"

    def test_position_size_with_no_positions(self):
        """Position size with no positions should be 0"""
        metrics = MockRiskMetrics(position_metrics={})
        rule = MockAlertRule(
            condition_type="position_size", threshold_value=1000.0, comparison=">"
        )

        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is False, "Position size should be 0 when no positions"

    def test_position_size_with_missing_position_value(self):
        """Position size should handle missing position_value"""
        position_metrics = {
            "BTC-USD": {"some_other_field": 123},  # No position_value
            "ETH-USD": {"position_value": 5000.0},
        }
        metrics = MockRiskMetrics(position_metrics=position_metrics)
        rule = MockAlertRule(
            condition_type="position_size", threshold_value=4000.0, comparison=">"
        )

        # Should only count ETH-USD (5000 > 4000)
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is True, "Should handle missing position_value gracefully"

    def test_get_actual_value_for_all_conditions(self):
        """Test get_actual_value for all condition types"""
        position_metrics = {
            "BTC-USD": {"position_value": 10000.0},
            "ETH-USD": {"position_value": -5000.0},
        }
        metrics = MockRiskMetrics(
            equity=12000.0,
            margin_ratio=3.5,
            liquidation_distance_percent=25.0,
            free_collateral=7000.0,
            position_metrics=position_metrics,
        )

        test_cases = [
            ("liquidation_distance", 25.0),
            ("margin_ratio", 3.5),
            ("equity_drop", 12000.0),
            ("position_size", 15000.0),  # abs(10000) + abs(-5000)
            ("free_collateral", 7000.0),
        ]

        for condition_type, expected_value in test_cases:
            rule = MockAlertRule(condition_type=condition_type)
            actual_value = self.evaluator.get_actual_value(rule, metrics)
            assert (
                abs(actual_value - expected_value) < 0.01
            ), f"get_actual_value for {condition_type} should be {expected_value}, got {actual_value}"

    def test_format_alert_message_default(self):
        """Test default alert message formatting"""
        metrics = MockRiskMetrics(
            equity=10000.0, margin_ratio=2.5, liquidation_distance_percent=15.0
        )
        rule = MockAlertRule(
            name="Test Alert",
            condition_type="liquidation_distance",
            threshold_value=20.0,
            comparison="<=",
            alert_severity="warning",
        )

        actual_value = 15.0
        message = self.evaluator.format_alert_message(
            rule, self.subaccount, metrics, actual_value
        )

        # Check that message contains key information
        assert "TEST ALERT" in message, "Message should contain rule name in uppercase"
        assert "Test Account" in message, "Message should contain subaccount nickname"
        assert (
            "Liquidation Distance: 15.00%" in message
        ), "Message should contain actual value"
        assert "Threshold: <= 20.0%" in message, "Message should contain threshold"
        assert "$10,000.00" in message, "Message should contain equity"
        assert "2.50x" in message, "Message should contain margin ratio"

    def test_format_alert_message_custom(self):
        """Test custom alert message"""
        metrics = MockRiskMetrics()
        rule = MockAlertRule(custom_message="Custom alert message!")

        message = self.evaluator.format_alert_message(
            rule, self.subaccount, metrics, 0.0
        )
        assert (
            message == "Custom alert message!"
        ), "Should use custom message when provided"

    def test_severity_emojis(self):
        """Test that different severities have different emojis"""
        metrics = MockRiskMetrics()

        severities = ["critical", "warning", "info"]
        messages = []

        for severity in severities:
            rule = MockAlertRule(name="Test", alert_severity=severity)
            message = self.evaluator.format_alert_message(
                rule, self.subaccount, metrics, 0.0
            )
            messages.append(message)

        # Each message should be different (different emojis)
        assert messages[0].startswith("🔴"), "Critical should use red emoji"
        assert messages[1].startswith("⚠️"), "Warning should use warning emoji"
        assert messages[2].startswith("ℹ️"), "Info should use info emoji"


class TestAlertRuleEvaluatorIntegration:
    """Integration tests combining multiple features"""

    def setup_method(self):
        self.evaluator = AlertRuleEvaluator()
        self.subaccount = MockSubaccount()

    def test_multiple_conditions_same_metrics(self):
        """Test multiple rules against same metrics"""
        metrics = MockRiskMetrics(
            equity=8000.0,
            margin_ratio=1.8,
            liquidation_distance_percent=12.0,
            free_collateral=2000.0,
        )

        # Rule 1: Liquidation distance <= 15% (should trigger)
        rule1 = MockAlertRule(
            name="Low Liquidation Distance",
            condition_type="liquidation_distance",
            threshold_value=15.0,
            comparison="<=",
        )

        # Rule 2: Margin ratio < 2.0 (should trigger)
        rule2 = MockAlertRule(
            name="Low Margin Ratio",
            condition_type="margin_ratio",
            threshold_value=2.0,
            comparison="<",
        )

        # Rule 3: Equity < 5000 (should NOT trigger)
        rule3 = MockAlertRule(
            name="Low Equity",
            condition_type="equity_drop",
            threshold_value=5000.0,
            comparison="<",
        )

        result1 = self.evaluator.evaluate_condition(rule1, metrics, self.subaccount)
        result2 = self.evaluator.evaluate_condition(rule2, metrics, self.subaccount)
        result3 = self.evaluator.evaluate_condition(rule3, metrics, self.subaccount)

        assert result1 is True, "Rule 1 should trigger (12.0 <= 15.0)"
        assert result2 is True, "Rule 2 should trigger (1.8 < 2.0)"
        assert result3 is False, "Rule 3 should NOT trigger (8000 >= 5000)"

    def test_boundary_values(self):
        """Test boundary conditions"""
        metrics = MockRiskMetrics(margin_ratio=2.0)

        # Test exact boundary with <=
        rule = MockAlertRule(
            condition_type="margin_ratio", threshold_value=2.0, comparison="<="
        )
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is True, "Should trigger when value equals threshold with <="

        # Test exact boundary with <
        rule.comparison = "<"
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is False, "Should NOT trigger when value equals threshold with <"

        # Test exact boundary with >=
        rule.comparison = ">="
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is True, "Should trigger when value equals threshold with >="

        # Test exact boundary with >
        rule.comparison = ">"
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is False, "Should NOT trigger when value equals threshold with >"

    def test_very_large_and_small_values(self):
        """Test with very large and very small values"""
        # Very large equity
        metrics = MockRiskMetrics(equity=1_000_000_000.0)
        rule = MockAlertRule(
            condition_type="equity_drop", threshold_value=500_000_000.0, comparison=">"
        )
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is True, "Should handle very large values"

        # Very small margin ratio
        metrics = MockRiskMetrics(margin_ratio=0.001)
        rule = MockAlertRule(
            condition_type="margin_ratio", threshold_value=0.002, comparison="<"
        )
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is True, "Should handle very small values"

    def test_negative_values(self):
        """Test with negative values"""
        # Negative equity (shouldn't happen in practice, but test it)
        metrics = MockRiskMetrics(equity=-1000.0)
        rule = MockAlertRule(
            condition_type="equity_drop", threshold_value=0.0, comparison="<"
        )
        result = self.evaluator.evaluate_condition(rule, metrics, self.subaccount)
        assert result is True, "Should handle negative values"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
