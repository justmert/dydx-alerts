from typing import Dict, Any
import logging
from telegram import Bot
from telegram.error import TelegramError
from app.services.notifications.base import NotificationHandler
from app.core.config import settings

logger = logging.getLogger(__name__)


class TelegramHandler(NotificationHandler):
    """Telegram notification handler"""

    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.bot = None
        if self.bot_token:
            try:
                self.bot = Bot(token=self.bot_token)
            except Exception as e:
                logger.error(f"Failed to initialize Telegram bot: {e}")

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters for Telegram, but preserve HTML tags"""
        import re

        # First, protect valid HTML tags by replacing them with placeholders
        html_tags = re.findall(r"<(/?)([bi])>", text)
        placeholders = []
        for i, (slash, tag) in enumerate(html_tags):
            placeholder = f"__HTMLTAG{i}__"
            placeholders.append((placeholder, f"<{slash}{tag}>"))
            text = text.replace(f"<{slash}{tag}>", placeholder, 1)

        # Now escape remaining < and > (which are comparison operators)
        text = text.replace("&", "&amp;")
        text = text.replace("<", "&lt;")
        text = text.replace(">", "&gt;")

        # Restore HTML tags
        for placeholder, original in placeholders:
            text = text.replace(placeholder, original)

        return text

    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """Send message via Telegram"""
        if not self.bot:
            logger.error("Telegram bot not initialized")
            return False

        chat_id = config.get("chat_id")
        if not chat_id:
            logger.error("Telegram chat_id not provided in config")
            return False

        try:
            # Escape HTML special characters while preserving HTML tags
            escaped_message = self._escape_html(message)

            await self.bot.send_message(
                chat_id=chat_id, text=escaped_message, parse_mode="HTML"
            )
            logger.info(f"Telegram message sent to chat_id: {chat_id}")
            return True
        except TelegramError as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending Telegram message: {e}")
            return False

    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """Test Telegram connection"""
        test_message = (
            "✅ Test Alert from dYdX Alerts\n\n"
            "Your Telegram notification channel is configured correctly and working!"
        )
        return await self.send(test_message, config)

    def format_message(self, message: str) -> str:
        """Format message for Telegram (HTML)"""
        # Replace emoji with HTML bold for important parts
        message = message.replace("⚠️", "<b>⚠️</b>")
        message = message.replace("🔴", "<b>🔴</b>")
        return message
