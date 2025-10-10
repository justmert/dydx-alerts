from typing import Dict, Any
import logging
import aiohttp
from app.services.notifications.base import NotificationHandler

logger = logging.getLogger(__name__)


class WebhookHandler(NotificationHandler):
    """Custom webhook notification handler"""

    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """Send message to custom webhook"""
        webhook_url = config.get("url")
        if not webhook_url:
            logger.error("Webhook URL not provided in config")
            return False

        method = config.get("method", "POST").upper()
        headers = config.get("headers", {})

        # Add default content-type if not specified
        if "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"

        # Payload format
        payload = {
            "message": message,
            "source": "dydx-alerts",
            "severity": self._extract_severity(message),
        }

        try:
            async with aiohttp.ClientSession() as session:
                if method == "POST":
                    async with session.post(
                        webhook_url, json=payload, headers=headers
                    ) as response:
                        if 200 <= response.status < 300:
                            logger.info(
                                f"Webhook message sent successfully to {webhook_url}"
                            )
                            return True
                        else:
                            logger.error(
                                f"Webhook failed with status: {response.status}"
                            )
                            return False
                elif method == "PUT":
                    async with session.put(
                        webhook_url, json=payload, headers=headers
                    ) as response:
                        if 200 <= response.status < 300:
                            logger.info(
                                f"Webhook message sent successfully to {webhook_url}"
                            )
                            return True
                        else:
                            logger.error(
                                f"Webhook failed with status: {response.status}"
                            )
                            return False
                else:
                    logger.error(f"Unsupported HTTP method: {method}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")
            return False

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """Test webhook connection"""
        test_message = (
            "✅ Test Alert from dYdX Alerts\n\n"
            "Your webhook notification channel is configured correctly and working!"
        )
        return await self.send(test_message, config)

    def _extract_severity(self, message: str) -> str:
        """Extract severity from message"""
        if "🔴" in message or "LIQUIDATION" in message:
            return "critical"
        elif "⚠️" in message or "WARNING" in message:
            return "warning"
        else:
            return "info"
