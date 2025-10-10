from abc import ABC, abstractmethod
from typing import Dict, Any
import logging
import re

logger = logging.getLogger(__name__)


class NotificationHandler(ABC):
    """Abstract base class for notification handlers"""

    @abstractmethod
    async def send(self, message: str, config: Dict[str, Any]) -> bool:
        """
        Send a notification message
        Returns True if successful, False otherwise
        """
        pass

    @abstractmethod
    async def test_connection(self, config: Dict[str, Any]) -> bool:
        """
        Test if the notification channel is properly configured
        Returns True if successful, False otherwise
        """
        pass

    def format_message(self, message: str) -> str:
        """
        Format message for this channel (can be overridden)
        """
        return message

    def _html_to_markdown(self, text: str, bold_syntax: str = "**", italic_syntax: str = "*") -> str:
        """
        Standardized HTML to Markdown conversion

        Args:
            text: HTML formatted text
            bold_syntax: Syntax for bold (default: ** for Discord/Markdown, * for Slack)
            italic_syntax: Syntax for italic (default: * for Discord/Markdown, _ for Slack)
        """
        # Convert HTML entities first
        text = text.replace("&lt;", "<")
        text = text.replace("&gt;", ">")
        text = text.replace("&amp;", "&")

        # Convert links: <a href='url'>text</a> -> [text](url) or just url
        text = re.sub(r"<a href=['\"]([^'\"]+)['\"]>([^<]+)</a>", r"[\2](\1)", text)

        # Convert bold
        text = re.sub(r"<b>(.*?)</b>", rf"{bold_syntax}\1{bold_syntax}", text)

        # Convert italic
        text = re.sub(r"<i>(.*?)</i>", rf"{italic_syntax}\1{italic_syntax}", text)

        # Convert underline (Discord supports this)
        text = re.sub(r"<u>(.*?)</u>", r"__\1__", text)

        return text
