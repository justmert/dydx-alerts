from typing import Dict, Any
import logging
import aiohttp
from app.services.notifications.base import NotificationHandler

logger = logging.getLogger(__name__)


class DiscordHandler(NotificationHandler):
    """Discord webhook notification handler"""

    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """Send message via Discord webhook"""
        webhook_url = config.get("webhook_url")
        if not webhook_url:
            logger.error("Discord webhook_url not provided in config")
            return False

        # Convert HTML to Markdown (Discord uses ** for bold, * for italic)
        markdown_message = self._html_to_markdown(message, bold_syntax="**", italic_syntax="*")

        # Determine color based on message severity
        color = 0x3498DB  # Blue default
        if "🔴" in message or "LIQUIDATION" in message:
            color = 0xE74C3C  # Red for critical
        elif "⚠️" in message or "WARNING" in message:
            color = 0xF39C12  # Orange for warnings

        payload = {
            "embeds": [
                {
                    "title": self._extract_title(markdown_message),
                    "description": markdown_message,
                    "color": color,
                    "footer": {"text": "dYdX Alerts"},
                }
            ]
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status in [200, 204]:
                        logger.info(f"Discord webhook message sent successfully")
                        return True
                    else:
                        logger.error(
                            f"Discord webhook failed with status: {response.status}"
                        )
                        return False
        except Exception as e:
            logger.error(f"Failed to send Discord message: {e}")
            return False

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """Test Discord webhook connection"""
        test_message = (
            "✅ Test Alert from dYdX Alerts\n\n"
            "Your Discord notification channel is configured correctly and working!"
        )
        return await self.send(test_message, config)

    def _extract_title(self, message: str) -> str:
        """Extract title from message"""
        lines = message.split("\n")
        if lines:
            title = lines[0].strip()
            # Remove emoji if present
            title = title.replace("⚠️", "").replace("🔴", "").strip()
            return title
        return "dYdX Alerts"
