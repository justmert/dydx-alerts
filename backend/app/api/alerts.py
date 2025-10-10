from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db
from app.schemas.alert import AlertResponse
from app.utils.crud import AlertHistoryCRUD, SubaccountCRUD
from app.api.deps import get_current_user, SupabaseUser

# from app.models.user import User

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """List alerts for the authenticated user with pagination"""
    alerts = await AlertHistoryCRUD.get_all_for_user(
        db, user_id=current_user.id, limit=limit, offset=offset
    )
    return alerts


@router.get("/subaccount/{subaccount_id}", response_model=List[AlertResponse])
async def list_alerts_by_subaccount(
    subaccount_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """List alerts for a specific subaccount"""
    subaccount = await SubaccountCRUD.get_by_id(db, subaccount_id)
    if not subaccount or subaccount.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
        )

    alerts = await AlertHistoryCRUD.get_by_subaccount_for_user(
        db,
        user_id=current_user.id,
        subaccount_id=subaccount_id,
        limit=limit,
        offset=offset,
    )
    return alerts


@router.delete("/clear-all", status_code=status.HTTP_200_OK)
async def clear_all_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Delete all alerts for the current user"""
    deleted_count = await AlertHistoryCRUD.delete_all_for_user(db, current_user.id)
    return {"deleted_count": deleted_count}


@router.post("/delete-many", status_code=status.HTTP_200_OK)
async def delete_many_alerts(
    alert_ids: List[str] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Delete multiple alerts by IDs"""
    # Verify all alerts belong to the user
    for alert_id in alert_ids:
        alert = await AlertHistoryCRUD.get_by_id(db, alert_id)
        if alert:
            parent = await SubaccountCRUD.get_by_id(db, alert.subaccount_id)
            if not parent or str(parent.user_id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Not authorized to delete alert {alert_id}",
                )

    deleted_count = await AlertHistoryCRUD.delete_many(db, alert_ids)
    return {"deleted_count": deleted_count}


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Get alert by ID"""
    alert = await AlertHistoryCRUD.get_by_id(db, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )

    parent = await SubaccountCRUD.get_by_id(db, alert.subaccount_id)
    if not parent or parent.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )

    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Delete a single alert by ID"""
    # Check if alert exists and belongs to user
    alert = await AlertHistoryCRUD.get_by_id(db, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )

    parent = await SubaccountCRUD.get_by_id(db, alert.subaccount_id)
    if not parent or str(parent.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )

    success = await AlertHistoryCRUD.delete(db, alert_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert",
        )
