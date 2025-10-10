from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import structlog

from app.core.database import get_db
from app.core.errors import ResourceNotFound, ResourceConflict, ValidationError

logger = structlog.get_logger()
from app.schemas.subaccount import (
    SubaccountCreate,
    SubaccountUpdate,
    SubaccountResponse,
    SubaccountStatusResponse,
)
from app.utils.crud import SubaccountCRUD, AlertRuleCRUD
from app.services.monitor_service import monitor_service
from app.api.deps import get_current_user, SupabaseUser
from app.services.dydx.client import DydxClient

router = APIRouter(prefix="/api/subaccounts", tags=["subaccounts"])


@router.get("/validate")
async def validate_subaccount_address(
    address: str,
    subaccount_number: int = 0,
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Validate if a dYdX address and subaccount number exist via Indexer API"""
    dydx_client = DydxClient()
    try:
        data = await dydx_client.get_subaccount_data(address, subaccount_number)

        if data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subaccount not found on dYdX chain. Please verify the address and subaccount number.",
            )

        return {"valid": True, "message": "Subaccount found on dYdX chain"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating subaccount: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate address: {str(e)}",
        )
    finally:
        await dydx_client.close()


@router.post("", response_model=SubaccountResponse, status_code=status.HTTP_201_CREATED)
async def create_subaccount(
    subaccount_data: SubaccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Create a new subaccount to monitor"""
    subaccount = await SubaccountCRUD.create(
        db, subaccount_data, user_id=current_user.id
    )

    # Add to monitoring
    await monitor_service.add_subaccount(subaccount)

    return subaccount


@router.get("", response_model=List[SubaccountResponse])
async def list_subaccounts(
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """List all subaccounts"""
    subaccounts = await SubaccountCRUD.get_all_by_user(db, user_id=current_user.id)
    return subaccounts


@router.get("/{subaccount_id}", response_model=SubaccountResponse)
async def get_subaccount(
    subaccount_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Get subaccount by ID"""
    subaccount = await SubaccountCRUD.get_by_id(db, subaccount_id)
    if not subaccount:
        raise ResourceNotFound("Subaccount", subaccount_id)
    if str(subaccount.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )
    return subaccount


@router.get("/{subaccount_id}/status", response_model=SubaccountStatusResponse)
async def get_subaccount_status(
    subaccount_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Get current status of subaccount with risk metrics"""
    subaccount = await SubaccountCRUD.get_by_id(db, subaccount_id)
    if not subaccount or str(subaccount.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
        )

    # Get current status from monitor service
    status_data = await monitor_service.get_subaccount_status(subaccount_id)

    if not status_data:
        # Return subaccount data without metrics if not available yet
        return SubaccountStatusResponse(
            **subaccount.__dict__, status="unknown", metrics=None
        )

    # Combine subaccount data with metrics wrapped in metrics object
    from app.schemas.subaccount import SubaccountMetrics

    metrics_dict = status_data.get("metrics", {})
    metrics_obj = SubaccountMetrics(**metrics_dict) if metrics_dict else None

    return SubaccountStatusResponse(
        **subaccount.__dict__,
        metrics=metrics_obj,
        status=status_data.get("status", "unknown"),
    )


@router.patch("/{subaccount_id}", response_model=SubaccountResponse)
async def update_subaccount(
    subaccount_id: str,
    subaccount_data: SubaccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Update subaccount settings"""
    existing = await SubaccountCRUD.get_by_id(db, subaccount_id)
    if not existing or str(existing.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
        )
    subaccount = await SubaccountCRUD.update(db, subaccount_id, subaccount_data)
    return subaccount


@router.delete("/{subaccount_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subaccount(
    subaccount_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Delete subaccount and all associated alert rules"""
    existing = await SubaccountCRUD.get_by_id(db, subaccount_id)
    if not existing or str(existing.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
        )

    # Remove from monitoring first
    await monitor_service.remove_subaccount(subaccount_id)

    # Delete all alert rules associated with this subaccount
    await AlertRuleCRUD.delete_by_subaccount(db, subaccount_id)

    # Delete from database
    success = await SubaccountCRUD.delete(db, subaccount_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
        )
