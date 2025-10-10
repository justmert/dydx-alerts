from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from uuid import UUID


class AlertType(str, Enum):
    liquidation_warning = "liquidation_warning"
    liquidation = "liquidation"
    adl_warning = "adl_warning"
    adl = "adl"


class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertCreate(BaseModel):
    subaccount_id: UUID
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    metadata: Optional[Dict[str, Any]] = None


class AlertResponse(BaseModel):
    id: UUID
    subaccount_id: UUID
    alert_type: str
    severity: str
    message: str
    description: Optional[str] = None
    alert_metadata: Optional[Dict[str, Any]] = None
    channels_sent: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True
