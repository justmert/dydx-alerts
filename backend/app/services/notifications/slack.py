from typing import Dict, Any
import logging
import aiohttp
from app.services.notifications.base import NotificationHandler

logger = logging.getLogger(__name__)


class SlackHandler(NotificationHandler):
    """Slack webhook notification handler"""

    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """Send message via Slack webhook"""
        webhook_url = config.get("webhook_url")
        if not webhook_url:
            logger.error("Slack webhook_url not provided in config")
            return False

        # Convert HTML to Markdown (Slack uses * for bold, _ for italic)
        markdown_message = self._html_to_markdown(message, bold_syntax="*", italic_syntax="_")

        # Determine color based on message severity
        color = "good"  # Green default
        if "🔴" in message or "LIQUIDATION" in message:
            color = "danger"  # Red for critical
        elif "⚠️" in message or "WARNING" in message:
            color = "warning"  # Yellow for warnings

        payload = {
            "attachments": [
                {
                    "color": color,
                    "text": markdown_message,
                    "footer": "dYdX Alerts",
                    "mrkdwn_in": ["text"],
                }
            ]
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Slack webhook message sent successfully")
                        return True
                    else:
                        logger.error(
                            f"Slack webhook failed with status: {response.status}"
                        )
                        return False
        except Exception as e:
            logger.error(f"Failed to send Slack message: {e}")
            return False

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """Test Slack webhook connection"""
        test_message = (
            "✅ Test Alert from dYdX Alerts\n\n"
            "Your Slack notification channel is configured correctly and working!"
        )
        return await self.send(test_message, config)
