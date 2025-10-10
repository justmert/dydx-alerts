from typing import List, Dict, Any
import logging
import asyncio
from app.services.notifications.telegram import TelegramHandler
from app.services.notifications.discord import DiscordHandler
from app.services.notifications.slack import SlackHandler
from app.services.notifications.pagerduty import PagerDutyHandler
from app.services.notifications.email import EmailHandler
from app.services.notifications.webhook import WebhookHandler
from app.services.alert_engine import Alert
from app.models.notification_channel import NotificationChannel
from app.models.alert_history import AlertHistory
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    """Dispatch alerts to all configured notification channels"""

    def __init__(self):
        self.handlers = {
            "telegram": TelegramHandler(),
            "discord": DiscordHandler(),
            "slack": SlackHandler(),
            "pagerduty": PagerDutyHandler(),
            "email": EmailHandler(),
            "webhook": WebhookHandler(),
        }

    async def send_alert(
        self, alert: Alert, channels: List[NotificationChannel], db: AsyncSession
    ) -> List[str]:
        """
        Send alert to all enabled notification channels
        Returns list of channel types that successfully received the alert
        """
        successful_channels = []

        # Create tasks for parallel sending
        tasks = []
        for channel in channels:
            if channel.channel_type in self.handlers:
                task = self._send_to_channel(alert, channel)
                tasks.append((channel.channel_type, task))

        # Execute all sends in parallel
        results = await asyncio.gather(
            *[task for _, task in tasks], return_exceptions=True
        )

        # Collect successful channels
        for i, (channel_type, _) in enumerate(tasks):
            if results[i] is True:
                successful_channels.append(channel_type)
            elif isinstance(results[i], Exception):
                logger.error(f"Exception sending to {channel_type}: {results[i]}")

        # Save alert to history ONLY for legacy alerts (non-rule based)
        # Rule-based alerts are already saved by monitor_service.py
        if not hasattr(alert, 'rule'):
            await self._save_alert_history(alert, successful_channels, db)
            logger.debug("Saved legacy alert to history")
        else:
            logger.debug("Skipping alert history save for rule-based alert (already saved by monitor_service)")

        return successful_channels

    async def _send_to_channel(
        self, alert: Alert, channel: NotificationChannel
    ) -> bool:
        """Send alert to a specific channel"""
        handler = self.handlers.get(channel.channel_type)
        if not handler:
            logger.error(f"No handler for channel type: {channel.channel_type}")
            return False

        try:
            message = alert.message
            success = await handler.send(message, channel.config)
            if not success:
                logger.warning(f"Failed to send alert via {channel.channel_type}")
            return success
        except Exception as e:
            logger.error(f"Error sending alert via {channel.channel_type}: {e}")
            return False

    async def _save_alert_history(
        self, alert: Alert, successful_channels: List[str], db: AsyncSession
    ):
        """Save alert to history"""
        try:
            # Handle both Alert (enum) and RuleAlert (string) objects
            alert_type = (
                alert.alert_type.value
                if hasattr(alert.alert_type, "value")
                else alert.alert_type
            )
            severity = (
                alert.severity.value
                if hasattr(alert.severity, "value")
                else alert.severity
            )

            alert_history = AlertHistory(
                subaccount_id=alert.subaccount_id,
                alert_type=alert_type,
                severity=severity,
                message=alert.message,
                description=None,  # Legacy alerts don't have descriptions
                alert_metadata=alert.metadata,  # Updated field name
                channels_sent=successful_channels,
            )
            db.add(alert_history)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to save alert history: {e}")
            await db.rollback()

    async def test_channel(self, channel: NotificationChannel) -> bool:
        """Test a notification channel"""
        handler = self.handlers.get(channel.channel_type)
        if not handler:
            logger.error(f"No handler for channel type: {channel.channel_type}")
            return False

        try:
            return await handler.test_connection(channel.config)
        except Exception as e:
            logger.error(f"Error testing channel {channel.channel_type}: {e}")
            return False

    async def get_channels_for_user(
        self, user_id: str, db: AsyncSession
    ) -> List[NotificationChannel]:
        """Get all notification channels for a user"""
        try:
            result = await db.execute(
                select(NotificationChannel)
                .where(NotificationChannel.user_id == user_id)
            )
            channels = result.scalars().all()
            return list(channels)
        except Exception as e:
            logger.error(f"Error fetching channels for user {user_id}: {e}")
            return []
