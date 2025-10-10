from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any, Dict
from uuid import UUID


class SubaccountBase(BaseModel):
    address: str = Field(..., min_length=1, max_length=100)
    subaccount_number: int = Field(default=0, ge=0)
    nickname: Optional[str] = Field(None, max_length=100)
    liquidation_threshold_percent: float = Field(default=10.0, ge=0, le=100)


class SubaccountCreate(SubaccountBase):
    pass


class SubaccountUpdate(BaseModel):
    nickname: Optional[str] = Field(None, max_length=100)
    liquidation_threshold_percent: Optional[float] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


class SubaccountResponse(SubaccountBase):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PositionRiskMetrics(BaseModel):
    margin_mode: Optional[str] = None
    size: Optional[float] = None
    entry_price: Optional[float] = None
    oracle_price: Optional[float] = None
    maintenance_margin_fraction: Optional[float] = None
    initial_margin_fraction: Optional[float] = None
    maintenance_requirement: Optional[float] = None
    initial_requirement: Optional[float] = None
    maintenance_margin_percent: Optional[float] = None
    initial_margin_percent: Optional[float] = None
    position_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    unrealized_pnl_percent: Optional[float] = None
    funding_payment: Optional[float] = None
    realized_pnl: Optional[float] = None
    leverage: Optional[float] = None
    leverage_on_equity: Optional[float] = None
    leverage_on_initial_margin: Optional[float] = None
    liquidation_distance_percent: Optional[float] = None
    isolated_liquidation_price: Optional[float] = None
    cross_liquidation_price: Optional[float] = None
    fillable_price: Optional[float] = None
    protocol_liquidation_price: Optional[float] = None


class SubaccountMetrics(BaseModel):
    margin_ratio: Optional[float] = None
    equity: Optional[float] = None
    initial_requirement: Optional[float] = None
    maintenance_requirement: Optional[float] = None
    liquidation_distance_percent: Optional[float] = None
    free_collateral: Optional[float] = None
    max_liquidation_penalty: Optional[float] = None
    initial_margin_percent: Optional[float] = None
    maintenance_margin_percent: Optional[float] = None
    positions: Optional[Dict[str, Any]] = None
    position_metrics: Optional[Dict[str, PositionRiskMetrics]] = None


class SubaccountStatusResponse(SubaccountResponse):
    metrics: Optional[SubaccountMetrics] = None
    status: str = "unknown"  # safe, warning, critical, liquidated
