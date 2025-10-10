from typing import Dict, Any
import logging
import aiohttp
from app.services.notifications.base import NotificationHandler

logger = logging.getLogger(__name__)


class PagerDutyHandler(NotificationHandler):
    """PagerDuty Events API v2 notification handler"""

    EVENTS_URL = "https://events.pagerduty.com/v2/enqueue"

    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """Send alert to PagerDuty"""
        integration_key = config.get("integration_key")
        if not integration_key:
            logger.error("PagerDuty integration_key not provided in config")
            return False

        # Determine severity
        severity = "info"
        if "🔴" in message or "LIQUIDATION" in message:
            severity = "critical"
        elif "⚠️" in message or "WARNING" in message:
            severity = "warning"

        # Generate dedup_key from message content to avoid duplicate incidents
        dedup_key = f"dydx_alert_{hash(message) % 10000000}"

        payload = {
            "routing_key": integration_key,
            "event_action": "trigger",
            "dedup_key": dedup_key,
            "payload": {
                "summary": self._extract_summary(message),
                "severity": severity,
                "source": "dydx-alerts",
                "custom_details": {"message": message},
            },
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(self.EVENTS_URL, json=payload) as response:
                    if response.status == 202:
                        logger.info(f"PagerDuty incident created successfully")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(
                            f"PagerDuty API failed with status {response.status}: {error_text}"
                        )
                        return False
        except Exception as e:
            logger.error(f"Failed to send PagerDuty alert: {e}")
            return False

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """Test PagerDuty connection"""
        test_message = (
            "✅ Test Alert from dYdX Alerts\n\n"
            "Your PagerDuty notification channel is configured correctly and working!"
        )
        return await self.send(test_message, config)

    def _extract_summary(self, message: str) -> str:
        """Extract summary from message (first line)"""
        lines = message.split("\n")
        if lines:
            summary = lines[0].strip()
            # Remove emoji
            summary = summary.replace("⚠️", "").replace("🔴", "").strip()
            return summary[:1024]  # PagerDuty has a limit
        return "dYdX Alerts"
