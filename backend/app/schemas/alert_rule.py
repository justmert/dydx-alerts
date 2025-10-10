from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Optional, List
from enum import Enum
from uuid import UUID


class AlertScope(str, Enum):
    account = "account"
    position = "position"


class ConditionType(str, Enum):
    # Account-level conditions
    liquidation_distance = "liquidation_distance"
    margin_ratio = "margin_ratio"
    equity_drop = "equity_drop"
    position_size = "position_size"
    free_collateral = "free_collateral"

    # Position-level conditions
    position_pnl_percent = "position_pnl_percent"
    position_pnl_usd = "position_pnl_usd"
    position_size_usd = "position_size_usd"
    position_size_contracts = "position_size_contracts"
    position_liquidation_distance = "position_liquidation_distance"
    position_leverage = "position_leverage"
    position_entry_price = "position_entry_price"
    position_oracle_price = "position_oracle_price"
    position_funding_payment = "position_funding_payment"


class Comparison(str, Enum):
    less_than = "<"
    less_than_or_equal = "<="
    greater_than = ">"
    greater_than_or_equal = ">="
    equal = "=="


class AlertRuleSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    subaccount_id: Optional[UUID] = None  # None = applies to all user's subaccounts
    scope: AlertScope = AlertScope.account  # Default to account-level
    position_market: Optional[str] = Field(None, max_length=50)  # e.g., "BTC-USD"
    condition_type: ConditionType
    threshold_value: float
    comparison: Comparison = Comparison.less_than_or_equal
    alert_severity: AlertRuleSeverity = AlertRuleSeverity.warning
    custom_message: Optional[str] = Field(None, max_length=500)
    channel_ids: List[UUID] = Field(default_factory=list)
    cooldown_seconds: float = Field(default=3600, ge=60)  # Min 1 minute
    enabled: bool = True

    @model_validator(mode="after")
    def validate_position_scope(self):
        """Validate that position_market is set when scope is position"""
        if self.scope == AlertScope.position and not self.position_market:
            raise ValueError("position_market is required when scope is 'position'")
        if self.scope == AlertScope.account and self.position_market:
            raise ValueError("position_market should not be set when scope is 'account'")
        return self


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    subaccount_id: Optional[UUID] = None
    scope: Optional[AlertScope] = None
    position_market: Optional[str] = Field(None, max_length=50)
    condition_type: Optional[ConditionType] = None
    threshold_value: Optional[float] = None
    comparison: Optional[Comparison] = None
    alert_severity: Optional[AlertRuleSeverity] = None
    custom_message: Optional[str] = Field(None, max_length=500)
    channel_ids: Optional[List[UUID]] = None
    cooldown_seconds: Optional[float] = Field(None, ge=60)
    enabled: Optional[bool] = None

    # Track if subaccount_id was explicitly provided
    _subaccount_id_set: bool = False

    @model_validator(mode="before")
    @classmethod
    def track_subaccount_id(cls, data):
        if isinstance(data, dict) and "subaccount_id" in data:
            # Store that subaccount_id was explicitly provided
            data["_subaccount_id_set"] = True
        return data


class AlertRuleResponse(BaseModel):
    id: UUID
    user_id: UUID
    subaccount_id: Optional[UUID]
    scope: str  # "account" or "position"
    position_market: Optional[str]  # e.g., "BTC-USD"
    name: str
    description: Optional[str]  # Auto-generated natural language description
    enabled: bool
    archived: bool
    condition_type: str
    threshold_value: float
    comparison: str
    alert_severity: str
    custom_message: Optional[str]
    channel_ids: List[str]  # UUIDs as strings
    cooldown_seconds: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
