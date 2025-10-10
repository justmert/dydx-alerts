from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.subaccount import Subaccount
from app.models.notification_channel import NotificationChannel
from app.models.alert_history import AlertHistory
from app.models.alert_rule import AlertRule
from app.schemas.subaccount import SubaccountCreate, SubaccountUpdate
from app.schemas.notification_channel import (
    NotificationChannelCreate,
    NotificationChannelUpdate,
)
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleUpdate
from app.utils.rule_description import generate_rule_description

# UserCRUD removed - Supabase Auth handles user management


class SubaccountCRUD:
    @staticmethod
    async def create(
        db: AsyncSession,
        subaccount_data: SubaccountCreate,
        user_id: Optional[str] = None,
    ) -> Subaccount:
        subaccount = Subaccount(**subaccount_data.model_dump(), user_id=user_id)
        db.add(subaccount)
        await db.commit()
        await db.refresh(subaccount)
        return subaccount

    @staticmethod
    async def get_by_id(db: AsyncSession, subaccount_id: str) -> Optional[Subaccount]:
        from uuid import UUID

        # Convert string to UUID if needed
        if isinstance(subaccount_id, str):
            try:
                subaccount_id = UUID(subaccount_id)
            except ValueError:
                return None
        result = await db.execute(
            select(Subaccount).where(Subaccount.id == subaccount_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_by_user(
        db: AsyncSession, user_id: Optional[str] = None
    ) -> List[Subaccount]:
        if user_id:
            result = await db.execute(
                select(Subaccount).where(Subaccount.user_id == user_id)
            )
        else:
            result = await db.execute(select(Subaccount))
        return list(result.scalars().all())

    @staticmethod
    async def update(
        db: AsyncSession, subaccount_id: str, subaccount_data: SubaccountUpdate
    ) -> Optional[Subaccount]:
        subaccount = await SubaccountCRUD.get_by_id(db, subaccount_id)
        if not subaccount:
            return None

        update_data = subaccount_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(subaccount, field, value)

        await db.commit()
        await db.refresh(subaccount)
        return subaccount

    @staticmethod
    async def delete(db: AsyncSession, subaccount_id: str) -> bool:
        from uuid import UUID

        # Convert string to UUID if needed
        if isinstance(subaccount_id, str):
            try:
                subaccount_id = UUID(subaccount_id)
            except ValueError:
                return False
        result = await db.execute(
            delete(Subaccount).where(Subaccount.id == subaccount_id)
        )
        await db.commit()
        return result.rowcount > 0


class NotificationChannelCRUD:
    @staticmethod
    async def create(
        db: AsyncSession,
        channel_data: NotificationChannelCreate,
        user_id: Optional[str] = None,
    ) -> NotificationChannel:
        channel = NotificationChannel(**channel_data.model_dump(), user_id=user_id)
        db.add(channel)
        await db.commit()
        await db.refresh(channel)
        return channel

    @staticmethod
    async def get_by_id(
        db: AsyncSession, channel_id: str
    ) -> Optional[NotificationChannel]:
        from uuid import UUID

        # Convert string to UUID if needed
        if isinstance(channel_id, str):
            try:
                channel_id = UUID(channel_id)
            except ValueError:
                return None
        result = await db.execute(
            select(NotificationChannel).where(NotificationChannel.id == channel_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_by_user(
        db: AsyncSession, user_id: Optional[str] = None
    ) -> List[NotificationChannel]:
        if user_id:
            result = await db.execute(
                select(NotificationChannel).where(
                    NotificationChannel.user_id == user_id
                )
            )
        else:
            result = await db.execute(select(NotificationChannel))
        return list(result.scalars().all())

    @staticmethod
    async def update(
        db: AsyncSession, channel_id: str, channel_data: NotificationChannelUpdate
    ) -> Optional[NotificationChannel]:
        channel = await NotificationChannelCRUD.get_by_id(db, channel_id)
        if not channel:
            return None

        update_data = channel_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(channel, field, value)

        await db.commit()
        await db.refresh(channel)
        return channel

    @staticmethod
    async def delete(db: AsyncSession, channel_id: str) -> bool:
        from uuid import UUID

        # Convert string to UUID if needed
        if isinstance(channel_id, str):
            try:
                channel_id = UUID(channel_id)
            except ValueError:
                return False
        result = await db.execute(
            delete(NotificationChannel).where(NotificationChannel.id == channel_id)
        )
        await db.commit()
        return result.rowcount > 0


class AlertHistoryCRUD:
    @staticmethod
    async def get_by_id(db: AsyncSession, alert_id: str) -> Optional[AlertHistory]:
        result = await db.execute(
            select(AlertHistory).join(Subaccount).where(AlertHistory.id == alert_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_subaccount(
        db: AsyncSession, subaccount_id: str, limit: int = 100, offset: int = 0
    ) -> List[AlertHistory]:
        result = await db.execute(
            select(AlertHistory)
            .where(AlertHistory.subaccount_id == subaccount_id)
            .order_by(AlertHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_all(
        db: AsyncSession, limit: int = 100, offset: int = 0
    ) -> List[AlertHistory]:
        result = await db.execute(
            select(AlertHistory)
            .order_by(AlertHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_all_for_user(
        db: AsyncSession, user_id: str, limit: int = 100, offset: int = 0
    ) -> List[AlertHistory]:
        result = await db.execute(
            select(AlertHistory)
            .join(Subaccount)
            .where(Subaccount.user_id == user_id)
            .order_by(AlertHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_subaccount_for_user(
        db: AsyncSession,
        user_id: str,
        subaccount_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AlertHistory]:
        result = await db.execute(
            select(AlertHistory)
            .join(Subaccount)
            .where(
                AlertHistory.subaccount_id == subaccount_id,
                Subaccount.user_id == user_id,
            )
            .order_by(AlertHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete(db: AsyncSession, alert_id: str) -> bool:
        """Delete a single alert by ID"""
        try:
            await db.execute(delete(AlertHistory).where(AlertHistory.id == alert_id))
            await db.commit()
            return True
        except Exception:
            await db.rollback()
            return False

    @staticmethod
    async def delete_many(db: AsyncSession, alert_ids: List[str]) -> int:
        """Delete multiple alerts by IDs. Returns the number of deleted alerts."""
        try:
            result = await db.execute(
                delete(AlertHistory).where(AlertHistory.id.in_(alert_ids))
            )
            await db.commit()
            return result.rowcount
        except Exception:
            await db.rollback()
            return 0

    @staticmethod
    async def delete_all_for_user(db: AsyncSession, user_id: str) -> int:
        """Delete all alerts for a user. Returns the number of deleted alerts."""
        try:
            # First, get all subaccount IDs for this user
            subaccount_result = await db.execute(
                select(Subaccount.id).where(Subaccount.user_id == user_id)
            )
            subaccount_ids = [row[0] for row in subaccount_result.all()]

            if not subaccount_ids:
                return 0

            # Delete all alerts for these subaccounts
            result = await db.execute(
                delete(AlertHistory).where(
                    AlertHistory.subaccount_id.in_(subaccount_ids)
                )
            )
            await db.commit()
            return result.rowcount
        except Exception as e:
            await db.rollback()
            import logging

            logging.error(f"Error deleting all alerts for user {user_id}: {e}")
            return 0


class AlertRuleCRUD:
    @staticmethod
    async def create(
        db: AsyncSession, rule_data: AlertRuleCreate, user_id: Optional[str] = None
    ) -> AlertRule:
        # Convert channel_ids UUIDs to strings for JSON storage
        channel_ids_str = [str(cid) for cid in rule_data.channel_ids]

        # Get subaccount info if provided for description generation
        subaccount_address = None
        subaccount_nickname = None
        if rule_data.subaccount_id:
            subaccount = await SubaccountCRUD.get_by_id(db, str(rule_data.subaccount_id))
            if subaccount:
                subaccount_address = subaccount.address
                subaccount_nickname = subaccount.nickname

        # Generate description
        description = generate_rule_description(
            condition_type=rule_data.condition_type.value,
            threshold_value=rule_data.threshold_value,
            comparison=rule_data.comparison.value,
            scope=rule_data.scope.value,
            position_market=rule_data.position_market,
            subaccount_address=subaccount_address,
            subaccount_nickname=subaccount_nickname,
        )

        rule = AlertRule(
            user_id=user_id,
            name=rule_data.name,
            description=description,
            subaccount_id=rule_data.subaccount_id,
            scope=rule_data.scope.value,  # NEW: position or account
            position_market=rule_data.position_market,  # NEW: e.g., "BTC-USD"
            condition_type=rule_data.condition_type.value,
            threshold_value=rule_data.threshold_value,
            comparison=rule_data.comparison.value,
            alert_severity=rule_data.alert_severity.value,
            custom_message=rule_data.custom_message,
            channel_ids=channel_ids_str,
            cooldown_seconds=rule_data.cooldown_seconds,
            enabled=rule_data.enabled,
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def get_by_id(db: AsyncSession, rule_id: str) -> Optional[AlertRule]:
        from uuid import UUID

        # Convert string to UUID if needed
        if isinstance(rule_id, str):
            try:
                rule_id = UUID(rule_id)
            except ValueError:
                return None
        result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_by_user(
        db: AsyncSession, user_id: Optional[str] = None
    ) -> List[AlertRule]:
        if user_id:
            result = await db.execute(
                select(AlertRule)
                .where(AlertRule.user_id == user_id)
                .order_by(AlertRule.created_at.desc())
            )
        else:
            result = await db.execute(
                select(AlertRule).order_by(AlertRule.created_at.desc())
            )
        return list(result.scalars().all())

    @staticmethod
    async def get_enabled_by_user(db: AsyncSession, user_id: str) -> List[AlertRule]:
        """Get all enabled and non-archived alert rules for a user"""
        result = await db.execute(
            select(AlertRule)
            .where(AlertRule.user_id == user_id, AlertRule.enabled == True, AlertRule.archived == False)
            .order_by(AlertRule.created_at.desc())
            .with_for_update()  # Lock rows to prevent concurrent duplicate evaluations
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_subaccount(
        db: AsyncSession, subaccount_id: str, user_id: Optional[str] = None
    ) -> List[AlertRule]:
        """Get alert rules for a specific subaccount or global rules (subaccount_id=None)"""
        from uuid import UUID

        if isinstance(subaccount_id, str):
            try:
                subaccount_id = UUID(subaccount_id)
            except ValueError:
                return []

        query = select(AlertRule).where(
            (AlertRule.subaccount_id == subaccount_id)
            | (AlertRule.subaccount_id == None)
        )

        if user_id:
            query = query.where(AlertRule.user_id == user_id)

        result = await db.execute(query.order_by(AlertRule.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def update(
        db: AsyncSession, rule_id: str, rule_data: AlertRuleUpdate
    ) -> Optional[AlertRule]:
        rule = await AlertRuleCRUD.get_by_id(db, rule_id)
        if not rule:
            return None

        update_data = rule_data.model_dump(exclude_unset=True)

        # Handle subaccount_id explicitly if it was set (even to None)
        if rule_data._subaccount_id_set:
            update_data["subaccount_id"] = rule_data.subaccount_id

        # Convert channel_ids if present
        if "channel_ids" in update_data and update_data["channel_ids"] is not None:
            update_data["channel_ids"] = [
                str(cid) for cid in update_data["channel_ids"]
            ]

        # Convert enums to values
        for field in ["condition_type", "comparison", "alert_severity", "scope"]:
            if field in update_data and update_data[field] is not None:
                if hasattr(update_data[field], "value"):
                    update_data[field] = update_data[field].value

        # Remove internal tracking fields
        update_data.pop("_subaccount_id_set", None)

        # Check if any fields that affect the description have changed
        description_fields = ["condition_type", "threshold_value", "comparison", "scope", "position_market", "subaccount_id"]
        needs_description_update = any(field in update_data for field in description_fields)

        # Apply updates
        for field, value in update_data.items():
            setattr(rule, field, value)

        # Regenerate description if needed
        if needs_description_update:
            # Get subaccount info if provided
            subaccount_address = None
            subaccount_nickname = None
            if rule.subaccount_id:
                subaccount = await SubaccountCRUD.get_by_id(db, str(rule.subaccount_id))
                if subaccount:
                    subaccount_address = subaccount.address
                    subaccount_nickname = subaccount.nickname

            # Generate new description
            rule.description = generate_rule_description(
                condition_type=rule.condition_type,
                threshold_value=rule.threshold_value,
                comparison=rule.comparison,
                scope=rule.scope,
                position_market=rule.position_market,
                subaccount_address=subaccount_address,
                subaccount_nickname=subaccount_nickname,
            )

        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def delete(db: AsyncSession, rule_id: str) -> bool:
        from uuid import UUID

        # Convert string to UUID if needed
        if isinstance(rule_id, str):
            try:
                rule_id = UUID(rule_id)
            except ValueError:
                return False
        result = await db.execute(delete(AlertRule).where(AlertRule.id == rule_id))
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def delete_by_subaccount(db: AsyncSession, subaccount_id: str) -> int:
        """Delete all alert rules associated with a subaccount"""
        from uuid import UUID

        if isinstance(subaccount_id, str):
            try:
                subaccount_id = UUID(subaccount_id)
            except ValueError:
                return 0

        result = await db.execute(
            delete(AlertRule).where(AlertRule.subaccount_id == subaccount_id)
        )
        await db.commit()
        return result.rowcount
