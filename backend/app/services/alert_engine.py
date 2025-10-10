import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
from app.services.risk_calculator import RiskMetrics, RiskCalculator
from app.models.subaccount import Subaccount
from app.models.alert_history import AlertHistory
from app.schemas.alert import AlertType, AlertSeverity, AlertCreate
from app.core.config import settings

logger = logging.getLogger(__name__)


class Alert:
    """Alert data structure"""

    def __init__(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        subaccount_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.alert_type = alert_type
        self.severity = severity
        self.subaccount_id = subaccount_id
        self.message = message
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alert_type": self.alert_type.value,
            "severity": self.severity.value,
            "subaccount_id": self.subaccount_id,
            "message": self.message,
            "metadata": self.metadata,
        }


class AlertEngine:
    """Evaluate risk metrics and generate alerts"""

    def __init__(self):
        self.risk_calculator = RiskCalculator()
        self.alert_cooldowns: Dict[str, datetime] = (
            {}
        )  # Track last alert time per subaccount
        self.cooldown_seconds = settings.ALERT_COOLDOWN_SECONDS

    def should_alert(self, subaccount_id: str, alert_type: AlertType) -> bool:
        """
        Check if we should send an alert (rate limiting)
        """
        cooldown_key = f"{subaccount_id}_{alert_type.value}"

        if cooldown_key in self.alert_cooldowns:
            last_alert_time = self.alert_cooldowns[cooldown_key]
            time_since_last = datetime.utcnow() - last_alert_time

            if time_since_last.total_seconds() < self.cooldown_seconds:
                logger.debug(f"Alert cooldown active for {cooldown_key}")
                return False

        return True

    def record_alert(self, subaccount_id: str, alert_type: AlertType):
        """Record that an alert was sent"""
        cooldown_key = f"{subaccount_id}_{alert_type.value}"
        self.alert_cooldowns[cooldown_key] = datetime.utcnow()

    def format_liquidation_warning(
        self, subaccount: Subaccount, metrics: RiskMetrics
    ) -> str:
        """Format liquidation warning message"""
        distance = float(metrics.liquidation_distance_percent)
        equity = float(metrics.equity)
        requirement = float(metrics.maintenance_requirement)

        nickname = subaccount.nickname or "Subaccount"
        address_short = subaccount.address[:6] + "..." + subaccount.address[-4:]

        message = (
            f"⚠️ LIQUIDATION WARNING\n\n"
            f"Account: {nickname} ({address_short})\n"
            f"Distance from liquidation: {distance:.2f}%\n"
            f"Equity: ${equity:,.2f}\n"
            f"Maintenance Requirement: ${requirement:,.2f}\n\n"
            f"Action recommended: Add collateral or reduce position size."
        )

        return message

    def format_liquidation_alert(self, subaccount: Subaccount) -> str:
        """Format liquidation event message"""
        nickname = subaccount.nickname or "Subaccount"
        address_short = subaccount.address[:6] + "..." + subaccount.address[-4:]

        message = (
            f"🔴 LIQUIDATION ALERT\n\n"
            f"Account: {nickname} ({address_short})\n"
            f"Your position has been liquidated.\n\n"
            f"Please review your account on dYdX."
        )

        return message

    def format_adl_warning(self, subaccount: Subaccount) -> str:
        """Format ADL risk warning message"""
        nickname = subaccount.nickname or "Subaccount"
        address_short = subaccount.address[:6] + "..." + subaccount.address[-4:]

        message = (
            f"⚠️ AUTO-DELEVERAGING RISK\n\n"
            f"Account: {nickname} ({address_short})\n"
            f"Market conditions are volatile and insurance fund is low.\n"
            f"Your high-leverage position may be subject to auto-deleveraging."
        )

        return message

    def format_adl_alert(
        self, subaccount: Subaccount, amount: Optional[float] = None
    ) -> str:
        """Format ADL event message"""
        nickname = subaccount.nickname or "Subaccount"
        address_short = subaccount.address[:6] + "..." + subaccount.address[-4:]

        message = (
            f"🔴 AUTO-DELEVERAGING EVENT\n\n"
            f"Account: {nickname} ({address_short})\n"
            f"Your position has been auto-deleveraged due to counterparty liquidation.\n"
        )

        if amount:
            message += f"Amount reduced: ${amount:,.2f}\n"

        return message

    async def evaluate_liquidation_risk(
        self, subaccount: Subaccount, metrics: RiskMetrics
    ) -> Optional[Alert]:
        """
        Evaluate if subaccount is at risk of liquidation
        """
        threshold = subaccount.liquidation_threshold_percent
        distance = metrics.liquidation_distance_percent

        # Check if liquidated (distance <= 0)
        if distance <= 0:
            if self.should_alert(subaccount.id, AlertType.liquidation):
                self.record_alert(subaccount.id, AlertType.liquidation)
                return Alert(
                    alert_type=AlertType.liquidation,
                    severity=AlertSeverity.critical,
                    subaccount_id=subaccount.id,
                    message=self.format_liquidation_alert(subaccount),
                    metadata=metrics.to_dict(),
                )

        # Check if approaching liquidation
        elif distance <= Decimal(str(threshold)):
            severity = (
                AlertSeverity.critical if distance <= 5 else AlertSeverity.warning
            )

            if self.should_alert(subaccount.id, AlertType.liquidation_warning):
                self.record_alert(subaccount.id, AlertType.liquidation_warning)
                return Alert(
                    alert_type=AlertType.liquidation_warning,
                    severity=severity,
                    subaccount_id=subaccount.id,
                    message=self.format_liquidation_warning(subaccount, metrics),
                    metadata=metrics.to_dict(),
                )

        return None

    async def evaluate_adl_risk(
        self,
        subaccount: Subaccount,
        metrics: RiskMetrics,
        insurance_fund_low: bool = False,
    ) -> Optional[Alert]:
        """
        Evaluate auto-deleveraging risk
        """
        # Only warn if insurance fund is low and user has high leverage
        if insurance_fund_low and metrics.margin_ratio < Decimal("2.0"):
            if self.should_alert(subaccount.id, AlertType.adl_warning):
                self.record_alert(subaccount.id, AlertType.adl_warning)
                return Alert(
                    alert_type=AlertType.adl_warning,
                    severity=AlertSeverity.warning,
                    subaccount_id=subaccount.id,
                    message=self.format_adl_warning(subaccount),
                    metadata=metrics.to_dict(),
                )

        return None

    async def evaluate(
        self,
        subaccount: Subaccount,
        metrics: RiskMetrics,
        insurance_fund_low: bool = False,
    ) -> Optional[Alert]:
        """
        Main evaluation method - checks all alert conditions
        """
        # Check liquidation risk first (highest priority)
        alert = await self.evaluate_liquidation_risk(subaccount, metrics)
        if alert:
            return alert

        # Check ADL risk
        alert = await self.evaluate_adl_risk(subaccount, metrics, insurance_fund_low)
        if alert:
            return alert

        return None
