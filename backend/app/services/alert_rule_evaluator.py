import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_rule import AlertRule
from app.models.subaccount import Subaccount
from app.models.notification_channel import NotificationChannel
from app.services.risk_calculator import RiskMetrics
from app.schemas.alert import AlertSeverity, AlertType
from app.utils.crud import AlertRuleCRUD, NotificationChannelCRUD
from app.utils.alert_description import generate_alert_description

logger = logging.getLogger(__name__)


class RuleAlert:
    """Alert generated from a custom rule"""

    def __init__(
        self,
        rule: AlertRule,
        subaccount_id: str,
        message: str,
        severity: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.rule = rule
        self.subaccount_id = subaccount_id
        self.message = message
        self.severity = severity
        self.description = description
        self.metadata = metadata or {}
        self.alert_type = (
            f"rule_{rule.condition_type}"  # e.g., "rule_liquidation_distance"
        )


class AlertRuleEvaluator:
    """Evaluates custom alert rules against position metrics"""

    def __init__(self):
        self.last_alert_times: Dict[str, datetime] = (
            {}
        )  # Track cooldowns: rule_id_subaccount_id -> timestamp

    def should_alert(self, rule: AlertRule, subaccount_id: str) -> bool:
        """Check if we should send an alert - always return True (no cooldown)"""
        # No cooldown - alerts fire every time condition is met
        return True

    def record_alert(self, rule: AlertRule, subaccount_id: str):
        """Record that an alert was sent"""
        # Include position_market in cooldown key for position-level alerts
        cooldown_key = f"{rule.id}_{subaccount_id}"
        if rule.scope == "position" and rule.position_market:
            cooldown_key = f"{rule.id}_{subaccount_id}_{rule.position_market}"
        self.last_alert_times[cooldown_key] = datetime.utcnow()

    def evaluate_condition(
        self, rule: AlertRule, metrics: RiskMetrics, subaccount: Subaccount
    ) -> bool:
        """Evaluate if a rule's condition is met"""
        try:
            # Check rule scope
            if rule.scope == "position":
                return self._evaluate_position_condition(rule, metrics)
            else:
                return self._evaluate_account_condition(rule, metrics)

        except Exception as e:
            logger.error(f"Error evaluating rule {rule.name}: {e}")
            return False

    def _evaluate_account_condition(self, rule: AlertRule, metrics: RiskMetrics) -> bool:
        """Evaluate account-level condition"""
        # Get the value to compare based on condition type
        if rule.condition_type == "liquidation_distance":
            actual_value = float(metrics.liquidation_distance_percent)
        elif rule.condition_type == "margin_ratio":
            actual_value = float(metrics.margin_ratio)
        elif rule.condition_type == "equity_drop":
            actual_value = float(metrics.equity)
        elif rule.condition_type == "position_size":
            # Sum of all position values
            total_position_size = 0
            if metrics.position_metrics:
                for pos_metrics in metrics.position_metrics.values():
                    if pos_metrics.get("position_value"):
                        total_position_size += abs(
                            float(pos_metrics["position_value"])
                        )
            actual_value = total_position_size
        elif rule.condition_type == "free_collateral":
            actual_value = float(metrics.free_collateral)
        else:
            logger.warning(f"Unknown account condition type: {rule.condition_type}")
            return False

        # Compare based on operator
        return self._compare_values(actual_value, rule.threshold_value, rule.comparison)

    def _evaluate_position_condition(self, rule: AlertRule, metrics: RiskMetrics) -> bool:
        """Evaluate position-level condition"""
        # Get position metrics for the specified market
        position_market = rule.position_market
        if not position_market or position_market not in metrics.position_metrics:
            logger.debug(f"Position {position_market} not found for rule {rule.name}")
            return False  # Position doesn't exist

        pos_metrics = metrics.position_metrics[position_market]

        # Get value based on condition type
        if rule.condition_type == "position_pnl_percent":
            actual_value = pos_metrics.get("unrealized_pnl_percent", 0) or 0
        elif rule.condition_type == "position_pnl_usd":
            actual_value = pos_metrics.get("unrealized_pnl", 0) or 0
        elif rule.condition_type == "position_size_usd":
            actual_value = abs(pos_metrics.get("position_value", 0) or 0)
        elif rule.condition_type == "position_size_contracts":
            actual_value = abs(pos_metrics.get("size", 0) or 0)
        elif rule.condition_type == "position_liquidation_distance":
            actual_value = pos_metrics.get("liquidation_distance_percent", 0) or 0
        elif rule.condition_type == "position_leverage":
            actual_value = pos_metrics.get("leverage", 0) or 0
        elif rule.condition_type == "position_entry_price":
            actual_value = abs(pos_metrics.get("entry_price", 0) or 0)
        elif rule.condition_type == "position_oracle_price":
            actual_value = abs(pos_metrics.get("oracle_price", 0) or 0)
        else:
            logger.warning(f"Unknown position condition type: {rule.condition_type}")
            return False

        # Compare based on operator
        return self._compare_values(actual_value, rule.threshold_value, rule.comparison)

    def _compare_values(self, actual_value: float, threshold: float, comparison: str) -> bool:
        """Compare two values based on comparison operator"""
        if comparison == "<":
            return actual_value < threshold
        elif comparison == "<=":
            return actual_value <= threshold
        elif comparison == ">":
            return actual_value > threshold
        elif comparison == ">=":
            return actual_value >= threshold
        elif comparison == "==":
            return abs(actual_value - threshold) < 0.001  # Floating point comparison
        else:
            logger.warning(f"Unknown comparison operator: {comparison}")
            return False

    def format_alert_message(
        self,
        rule: AlertRule,
        subaccount: Subaccount,
        metrics: RiskMetrics,
        actual_value: float,
    ) -> str:
        """Format the alert message"""
        # Use custom message if provided
        if rule.custom_message:
            return rule.custom_message

        # Route to appropriate formatter based on scope
        if rule.scope == "position":
            return self._format_position_alert_message(rule, subaccount, metrics, actual_value)
        else:
            return self._format_account_alert_message(rule, subaccount, metrics, actual_value)

    def _format_account_alert_message(
        self,
        rule: AlertRule,
        subaccount: Subaccount,
        metrics: RiskMetrics,
        actual_value: float,
    ) -> str:
        """Format account-level alert message"""
        nickname = subaccount.nickname or "Subaccount"
        full_address = f"{subaccount.address}#{subaccount.subaccount_number}"

        severity_emoji = (
            "🔴"
            if rule.alert_severity == "critical"
            else "⚠️" if rule.alert_severity == "warning" else "ℹ️"
        )

        condition_labels = {
            "liquidation_distance": "Liquidation Distance",
            "margin_ratio": "Margin Ratio",
            "equity_drop": "Equity",
            "position_size": "Position Size",
            "free_collateral": "Free Collateral",
        }

        condition_units = {
            "liquidation_distance": "%",
            "margin_ratio": "x",
            "equity_drop": "$",
            "position_size": "$",
            "free_collateral": "$",
        }

        # Human-readable comparison operators
        comparison_text = {
            "<": "is less than",
            "<=": "is less than or equal to",
            ">": "is greater than",
            ">=": "is greater than or equal to",
            "==": "equals",
        }

        condition_label = condition_labels.get(rule.condition_type, rule.condition_type)
        unit = condition_units.get(rule.condition_type, "")
        comparison_human = comparison_text.get(rule.comparison, rule.comparison)

        # Format values with proper currency/unit symbols
        actual_formatted = (
            f"{unit}{actual_value:,.2f}" if unit == "$" else f"{actual_value:.2f}{unit}"
        )
        threshold_formatted = (
            f"{unit}{rule.threshold_value:,.2f}"
            if unit == "$"
            else f"{rule.threshold_value:.2f}{unit}"
        )

        # Create explanation sentence
        explanation = (
            f"<i>This alert triggered because your {condition_label} "
            f"({actual_formatted}) {comparison_human} your threshold ({threshold_formatted}).</i>"
        )

        # Add alert type label
        alert_type_label = f"{rule.name.upper()} ({condition_label} Alert)"

        message = (
            f"{severity_emoji} {alert_type_label}\n\n"
            f"Account: {nickname} ({full_address})\n\n"
            f"{explanation}\n\n"
            f"<b>Current Metrics:</b>\n"
            f"• {condition_label}: {actual_formatted}\n"
            f"• Threshold: {rule.comparison} {threshold_formatted}\n"
            f"• Equity: ${float(metrics.equity):,.2f}\n"
            f"• Margin Ratio: {float(metrics.margin_ratio):.2f}x\n"
            f"• Liquidation Distance: {float(metrics.liquidation_distance_percent):.2f}%\n\n"
            f"<a href='https://alertsdydx.com'>View Dashboard →</a>"
        )

        return message

    def _format_position_alert_message(
        self,
        rule: AlertRule,
        subaccount: Subaccount,
        metrics: RiskMetrics,
        actual_value: float,
    ) -> str:
        """Format position-level alert message"""
        nickname = subaccount.nickname or "Subaccount"
        full_address = f"{subaccount.address}#{subaccount.subaccount_number}"
        position_market = rule.position_market or "Unknown"

        severity_emoji = (
            "🔴"
            if rule.alert_severity == "critical"
            else "⚠️" if rule.alert_severity == "warning" else "ℹ️"
        )

        condition_labels = {
            "position_pnl_percent": "Position PnL %",
            "position_pnl_usd": "Position PnL (USD)",
            "position_size_usd": "Position Size (USD)",
            "position_size_contracts": "Position Size (Contracts)",
            "position_liquidation_distance": "Liquidation Distance",
            "position_leverage": "Position Leverage",
            "position_entry_price": "Entry Price",
            "position_oracle_price": "Oracle Price",
            "position_funding_payment": "Funding Payment",
        }

        condition_units = {
            "position_pnl_percent": "%",
            "position_pnl_usd": "$",
            "position_size_usd": "$",
            "position_size_contracts": "",
            "position_liquidation_distance": "%",
            "position_leverage": "x",
            "position_entry_price": "$",
            "position_oracle_price": "$",
            "position_funding_payment": "$",
        }

        # Human-readable comparison operators
        comparison_text = {
            "<": "is less than",
            "<=": "is less than or equal to",
            ">": "is greater than",
            ">=": "is greater than or equal to",
            "==": "equals",
        }

        condition_label = condition_labels.get(rule.condition_type, rule.condition_type)
        unit = condition_units.get(rule.condition_type, "")
        comparison_human = comparison_text.get(rule.comparison, rule.comparison)

        # Format values with proper currency/unit symbols
        actual_formatted = (
            f"{unit}{actual_value:,.2f}" if unit == "$" else f"{actual_value:.2f}{unit}"
        )
        threshold_formatted = (
            f"{unit}{rule.threshold_value:,.2f}"
            if unit == "$"
            else f"{rule.threshold_value:.2f}{unit}"
        )

        # Get position metrics
        pos_metrics = metrics.position_metrics.get(position_market, {})

        # Get margin mode and liquidation price
        margin_mode = (pos_metrics.get('margin_mode') or 'CROSS').upper()
        if margin_mode == 'ISOLATED':
            liq_price = pos_metrics.get('isolated_liquidation_price')
        else:
            liq_price = pos_metrics.get('cross_liquidation_price')

        liq_price_str = f"${liq_price:,.2f}" if liq_price else "—"

        # Create explanation sentence
        explanation = (
            f"<i>This alert triggered because your {position_market} position's {condition_label} "
            f"({actual_formatted}) {comparison_human} your threshold ({threshold_formatted}).</i>"
        )

        # Add alert type label
        alert_type_label = f"{rule.name.upper()} ({position_market} Alert)"

        message = (
            f"{severity_emoji} {alert_type_label}\n\n"
            f"Account: {nickname} ({full_address})\n"
            f"Position: {position_market}\n\n"
            f"{explanation}\n\n"
            f"<b>Position Metrics:</b>\n"
            f"• {condition_label}: {actual_formatted}\n"
            f"• Threshold: {rule.comparison} {threshold_formatted}\n"
            f"• Size: ${abs(pos_metrics.get('position_value', 0) or 0):,.2f}\n"
            f"• PnL: ${pos_metrics.get('unrealized_pnl', 0) or 0:,.2f} "
            f"({pos_metrics.get('unrealized_pnl_percent', 0) or 0:.2f}%)\n"
            f"• Leverage: {pos_metrics.get('leverage', 0) or 0:.2f}x\n"
            f"• Margin Mode: {margin_mode}\n"
            f"• Liquidation Price: {liq_price_str}\n"
            f"• Entry Price: ${pos_metrics.get('entry_price', 0) or 0:,.2f}\n"
            f"• Oracle Price: ${pos_metrics.get('oracle_price', 0) or 0:,.2f}\n\n"
            f"<b>Account Metrics:</b>\n"
            f"• Equity: ${float(metrics.equity):,.2f}\n"
            f"• Margin Ratio: {float(metrics.margin_ratio):.2f}x\n"
            f"• Liquidation Distance: {float(metrics.liquidation_distance_percent):.2f}%\n\n"
            f"<a href='https://alertsdydx.com'>View Dashboard →</a>"
        )

        return message

    def get_actual_value(self, rule: AlertRule, metrics: RiskMetrics) -> float:
        """Get the actual value for a condition type"""
        # Account-level conditions
        if rule.condition_type == "liquidation_distance":
            return float(metrics.liquidation_distance_percent)
        elif rule.condition_type == "margin_ratio":
            return float(metrics.margin_ratio)
        elif rule.condition_type == "equity_drop":
            return float(metrics.equity)
        elif rule.condition_type == "position_size":
            total_position_size = 0
            if metrics.position_metrics:
                for pos_metrics in metrics.position_metrics.values():
                    if pos_metrics.get("position_value"):
                        total_position_size += abs(float(pos_metrics["position_value"]))
            return total_position_size
        elif rule.condition_type == "free_collateral":
            return float(metrics.free_collateral)
        # Position-level conditions
        elif rule.condition_type == "position_pnl_percent":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return metrics.position_metrics[rule.position_market].get("unrealized_pnl_percent", 0) or 0
            return 0.0
        elif rule.condition_type == "position_pnl_usd":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return metrics.position_metrics[rule.position_market].get("unrealized_pnl", 0) or 0
            return 0.0
        elif rule.condition_type == "position_size_usd":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return abs(metrics.position_metrics[rule.position_market].get("position_value", 0) or 0)
            return 0.0
        elif rule.condition_type == "position_size_contracts":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                size = metrics.position_metrics[rule.position_market].get("size", 0) or 0
                logger.debug(f"get_actual_value: market={rule.position_market}, size={size}, abs={abs(size)}")
                return abs(size)
            logger.warning(f"get_actual_value: Position {rule.position_market} not found in metrics. Available: {list(metrics.position_metrics.keys()) if metrics.position_metrics else 'None'}")
            return 0.0
        elif rule.condition_type == "position_liquidation_distance":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return metrics.position_metrics[rule.position_market].get("liquidation_distance_percent", 0) or 0
            return 0.0
        elif rule.condition_type == "position_leverage":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return metrics.position_metrics[rule.position_market].get("leverage", 0) or 0
            return 0.0
        elif rule.condition_type == "position_entry_price":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return abs(metrics.position_metrics[rule.position_market].get("entry_price", 0) or 0)
            return 0.0
        elif rule.condition_type == "position_oracle_price":
            if rule.position_market and rule.position_market in metrics.position_metrics:
                return abs(metrics.position_metrics[rule.position_market].get("oracle_price", 0) or 0)
            return 0.0
        else:
            return 0.0

    async def evaluate_rules_for_subaccount(
        self, db: AsyncSession, subaccount: Subaccount, metrics: RiskMetrics
    ) -> List[RuleAlert]:
        """Evaluate all rules for a subaccount and return triggered alerts"""
        alerts = []

        try:
            # Get all enabled rules for this user
            user_rules = await AlertRuleCRUD.get_enabled_by_user(
                db, user_id=str(subaccount.user_id)
            )

            for rule in user_rules:
                # Skip archived rules
                if rule.archived:
                    continue

                # Check if rule applies to this subaccount
                if rule.subaccount_id is not None and str(rule.subaccount_id) != str(
                    subaccount.id
                ):
                    continue  # Rule is for a different subaccount

                # No cooldown - always trigger when condition is met
                # (alerts are meant to fire once and be deleted/acknowledged)

                # Evaluate condition
                actual_value = self.get_actual_value(rule, metrics)
                condition_met = self.evaluate_condition(rule, metrics, subaccount)

                # Debug logging
                logger.debug(
                    f"Rule {rule.name}: condition_type={rule.condition_type}, "
                    f"actual_value={actual_value}, threshold={rule.threshold_value}, "
                    f"comparison={rule.comparison}, condition_met={condition_met}"
                )

                if condition_met:
                    # Archive the rule IMMEDIATELY to prevent duplicate alerts (race condition)
                    await self.archive_rule(db, rule)

                    # Condition met - create alert
                    message = self.format_alert_message(
                        rule, subaccount, metrics, actual_value
                    )

                    # Generate human-readable description
                    description = generate_alert_description(
                        rule_name=rule.name,
                        condition_type=rule.condition_type,
                        comparison=rule.comparison,
                        threshold_value=rule.threshold_value,
                        actual_value=actual_value,
                        scope=rule.scope,
                        position_market=rule.position_market if rule.scope == "position" else None,
                    )

                    # Prepare metadata - for position-level alerts, only include relevant position
                    metrics_dict = metrics.to_dict()

                    # For position-level alerts, filter position_metrics to only include the relevant position
                    if rule.scope == "position" and rule.position_market:
                        if "position_metrics" in metrics_dict and rule.position_market in metrics_dict["position_metrics"]:
                            # Only include the specific position's metrics
                            metrics_dict["position_metrics"] = {
                                rule.position_market: metrics_dict["position_metrics"][rule.position_market]
                            }
                        if "positions" in metrics_dict and rule.position_market in metrics_dict["positions"]:
                            # Only include the specific position's data
                            metrics_dict["positions"] = {
                                rule.position_market: metrics_dict["positions"][rule.position_market]
                            }

                    alert = RuleAlert(
                        rule=rule,
                        subaccount_id=str(subaccount.id),
                        message=message,
                        severity=rule.alert_severity,
                        description=description,
                        metadata={
                            **metrics_dict,
                            "rule_id": str(rule.id),
                            "rule_name": rule.name,
                            "condition_type": rule.condition_type,
                            "threshold_value": rule.threshold_value,
                            "actual_value": actual_value,
                            "comparison": rule.comparison,
                            "scope": rule.scope,
                            "position_market": rule.position_market if rule.scope == "position" else None,
                        },
                    )

                    alerts.append(alert)
                    self.record_alert(rule, str(subaccount.id))

                    logger.info(
                        f"✓ Alert rule triggered: {rule.name} for subaccount {subaccount.id} "
                        f"({rule.condition_type} {rule.comparison} {rule.threshold_value})"
                    )

        except Exception as e:
            logger.error(f"Error evaluating rules for subaccount {subaccount.id}: {e}")

        return alerts

    async def archive_rule(
        self, db: AsyncSession, rule: AlertRule
    ):
        """Archive alert rule immediately after it triggers"""
        try:
            if not rule.archived:
                rule.archived = True
                await db.commit()
                logger.info(f"Archived alert rule '{rule.name}' (triggered)")

        except Exception as e:
            logger.error(f"Error archiving rule {rule.id}: {e}")
            await db.rollback()

    async def get_channels_for_rule(
        self, db: AsyncSession, rule: AlertRule
    ) -> List[NotificationChannel]:
        """Get notification channels for a rule"""
        channels = []

        try:
            for channel_id in rule.channel_ids:
                channel = await NotificationChannelCRUD.get_by_id(db, channel_id)
                if channel:
                    channels.append(channel)
                else:
                    logger.warning(
                        f"Channel {channel_id} not found for rule {rule.name}"
                    )

        except Exception as e:
            logger.error(f"Error getting channels for rule {rule.id}: {e}")

        return channels
