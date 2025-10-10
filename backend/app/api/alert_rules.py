from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from app.core.database import get_db
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse
from app.utils.crud import AlertRuleCRUD, SubaccountCRUD, NotificationChannelCRUD
from app.api.deps import get_current_user, SupabaseUser

router = APIRouter(prefix="/api/alert-rules", tags=["alert-rules"])


@router.post("", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    rule_data: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Create a new alert rule"""
    # Check alert rule limit (max 25 active rules per user, excluding archived)
    existing_rules = await AlertRuleCRUD.get_all_by_user(db, user_id=current_user.id)
    active_rules = [rule for rule in existing_rules if not rule.archived]
    if len(active_rules) >= 25:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 25 active alert rules per account reached",
        )

    # Validate subaccount ownership if specified
    if rule_data.subaccount_id:
        subaccount = await SubaccountCRUD.get_by_id(db, str(rule_data.subaccount_id))
        if not subaccount or str(subaccount.user_id) != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
            )

    # Validate position-based alert requirements
    if rule_data.scope.value == "position":
        # Position-based alerts require a specific subaccount
        if not rule_data.subaccount_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="subaccount_id is required for position-level alerts"
            )

        if not rule_data.position_market:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="position_market is required for position-level alerts"
            )

        # Validate that the position actually exists in the subaccount
        from app.services.monitor_service import monitor_service

        snapshot = await monitor_service.get_subaccount_status(str(rule_data.subaccount_id))
        if not snapshot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to fetch subaccount data. Please ensure the subaccount is active and monitored."
            )

        metrics = snapshot.get("metrics", {})
        position_metrics = metrics.get("position_metrics", {})

        if not position_metrics:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active positions found in this subaccount. Position-based alerts require at least one open position."
            )

        if rule_data.position_market not in position_metrics:
            available_markets = ", ".join(sorted(position_metrics.keys()))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position '{rule_data.position_market}' not found in subaccount. Available positions: {available_markets}"
            )

    # Validate that all channels belong to the user
    if rule_data.channel_ids:
        for channel_id in rule_data.channel_ids:
            channel = await NotificationChannelCRUD.get_by_id(db, str(channel_id))
            if not channel or str(channel.user_id) != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Notification channel {channel_id} not found",
                )

    rule = await AlertRuleCRUD.create(db, rule_data, user_id=current_user.id)
    return rule


@router.get("", response_model=List[AlertRuleResponse])
async def list_alert_rules(
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """List all alert rules for the authenticated user"""
    rules = await AlertRuleCRUD.get_all_by_user(db, user_id=current_user.id)
    return rules


@router.get("/available-positions", response_model=Dict[str, Any])
async def get_available_positions(
    subaccount_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """
    Get list of positions that user can create alerts for.
    Returns positions from specified subaccount or all user's subaccounts.
    """
    from app.services.monitor_service import monitor_service

    # Get user's subaccounts
    if subaccount_id:
        # Validate subaccount ownership
        subaccount = await SubaccountCRUD.get_by_id(db, subaccount_id)
        if not subaccount or str(subaccount.user_id) != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
            )
        subaccounts = [subaccount]
    else:
        # Get all user's subaccounts
        subaccounts = await SubaccountCRUD.get_all_by_user(db, user_id=current_user.id)

    # Collect all positions across subaccounts
    positions_by_market: Dict[str, Dict[str, Any]] = {}

    for subaccount in subaccounts:
        # Get latest snapshot from monitor service
        snapshot = await monitor_service.get_subaccount_status(str(subaccount.id))
        if not snapshot:
            continue

        metrics = snapshot.get("metrics", {})
        if not metrics:
            continue

        position_metrics = metrics.get("position_metrics", {})
        if not position_metrics:
            continue
        for market, pos_metrics in position_metrics.items():
            if market not in positions_by_market:
                positions_by_market[market] = {
                    "market": market,
                    "subaccounts": [],
                    "total_size_usd": 0,
                    "oracle_price": pos_metrics.get("oracle_price"),
                }

            # Add subaccount reference
            positions_by_market[market]["subaccounts"].append({
                "subaccount_id": str(subaccount.id),
                "nickname": subaccount.nickname,
                "size_usd": pos_metrics.get("position_value"),
                "pnl_usd": pos_metrics.get("unrealized_pnl"),
                "pnl_percent": pos_metrics.get("unrealized_pnl_percent"),
            })

            # Aggregate total size
            position_value = pos_metrics.get("position_value", 0) or 0
            positions_by_market[market]["total_size_usd"] += abs(position_value)

    return {
        "positions": list(positions_by_market.values()),
        "total_markets": len(positions_by_market),
    }


@router.get("/subaccount/{subaccount_id}", response_model=List[AlertRuleResponse])
async def list_alert_rules_by_subaccount(
    subaccount_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """List alert rules for a specific subaccount (including global rules)"""
    # Validate subaccount ownership
    subaccount = await SubaccountCRUD.get_by_id(db, subaccount_id)
    if not subaccount or str(subaccount.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
        )

    rules = await AlertRuleCRUD.get_by_subaccount(
        db, subaccount_id, user_id=current_user.id
    )
    return rules


@router.get("/{rule_id}", response_model=AlertRuleResponse)
async def get_alert_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Get alert rule by ID"""
    rule = await AlertRuleCRUD.get_by_id(db, rule_id)
    if not rule or str(rule.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found"
        )
    return rule


@router.patch("/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    rule_id: str,
    rule_data: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Update an alert rule"""
    # Check if rule exists and belongs to user
    rule = await AlertRuleCRUD.get_by_id(db, rule_id)
    if not rule or str(rule.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found"
        )

    # Validate subaccount ownership if being updated
    if rule_data.subaccount_id:
        subaccount = await SubaccountCRUD.get_by_id(db, str(rule_data.subaccount_id))
        if not subaccount or str(subaccount.user_id) != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Subaccount not found"
            )

    # Validate position-based alert requirements if scope or position_market is being updated
    # Determine the effective scope and position_market after update
    effective_scope = rule_data.scope.value if rule_data.scope else rule.scope
    effective_position_market = rule_data.position_market if hasattr(rule_data, 'position_market') and rule_data.position_market is not None else rule.position_market
    effective_subaccount_id = rule_data.subaccount_id if rule_data.subaccount_id else rule.subaccount_id

    if effective_scope == "position":
        # Position-based alerts require a specific subaccount
        if not effective_subaccount_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="subaccount_id is required for position-level alerts"
            )

        if not effective_position_market:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="position_market is required for position-level alerts"
            )

        # Validate that the position actually exists in the subaccount
        from app.services.monitor_service import monitor_service

        snapshot = await monitor_service.get_subaccount_status(str(effective_subaccount_id))
        if not snapshot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to fetch subaccount data. Please ensure the subaccount is active and monitored."
            )

        metrics = snapshot.get("metrics", {})
        position_metrics = metrics.get("position_metrics", {})

        if not position_metrics:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active positions found in this subaccount. Position-based alerts require at least one open position."
            )

        if effective_position_market not in position_metrics:
            available_markets = ", ".join(sorted(position_metrics.keys()))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position '{effective_position_market}' not found in subaccount. Available positions: {available_markets}"
            )

    # Validate channels if being updated
    if rule_data.channel_ids is not None:
        for channel_id in rule_data.channel_ids:
            channel = await NotificationChannelCRUD.get_by_id(db, str(channel_id))
            if not channel or str(channel.user_id) != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Notification channel {channel_id} not found",
                )

    updated_rule = await AlertRuleCRUD.update(db, rule_id, rule_data)
    return updated_rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
):
    """Delete an alert rule"""
    # Check if rule exists and belongs to user
    rule = await AlertRuleCRUD.get_by_id(db, rule_id)
    if not rule or str(rule.user_id) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule not found"
        )

    success = await AlertRuleCRUD.delete(db, rule_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete alert rule",
        )
    return None
