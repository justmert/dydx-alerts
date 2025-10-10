"""
Helper functions for generating natural language descriptions of alert rules.
"""

from typing import Optional


def generate_rule_description(
    condition_type: str,
    threshold_value: float,
    comparison: str,
    scope: str,
    position_market: Optional[str] = None,
    subaccount_address: Optional[str] = None,
    subaccount_nickname: Optional[str] = None,
) -> str:
    """
    Generate a natural language description for an alert rule.

    Args:
        condition_type: The condition type (e.g., "liquidation_distance", "position_pnl_percent")
        threshold_value: The threshold value
        comparison: The comparison operator ("<", "<=", ">", ">=", "==")
        scope: The scope ("account" or "position")
        position_market: The position market (e.g., "BTC-USD") for position-level alerts
        subaccount_address: The subaccount address (optional, for account context)
        subaccount_nickname: The subaccount nickname (optional, for account context)

    Returns:
        A natural language description string
    """
    # Mapping of condition types to labels
    condition_labels = {
        # Account-level conditions
        "liquidation_distance": "Liquidation Distance",
        "margin_ratio": "Margin Ratio",
        "equity_drop": "Equity",
        "position_size": "Position Size",
        "free_collateral": "Free Collateral",
        # Position-level conditions
        "position_pnl_percent": "Position PnL %",
        "position_pnl_usd": "Position PnL",
        "position_size_usd": "Position Size",
        "position_size_contracts": "Position Size (Contracts)",
        "position_liquidation_distance": "Position Liquidation Distance",
        "position_leverage": "Position Leverage",
        "position_entry_price": "Entry Price",
        "position_oracle_price": "Oracle Price",
        "position_funding_payment": "Funding Payment",
    }

    # Mapping of condition types to units
    condition_units = {
        "liquidation_distance": "%",
        "margin_ratio": "x",
        "equity_drop": "USD",
        "position_size": "USD",
        "free_collateral": "USD",
        "position_pnl_percent": "%",
        "position_pnl_usd": "USD",
        "position_size_usd": "USD",
        "position_size_contracts": "",
        "position_liquidation_distance": "%",
        "position_leverage": "x",
        "position_entry_price": "USD",
        "position_oracle_price": "USD",
        "position_funding_payment": "USD",
    }

    # Mapping of comparison operators to text
    comparison_text = {
        "<": "is less than",
        "<=": "is less than or equal to",
        ">": "is greater than",
        ">=": "is greater than or equal to",
        "==": "equals",
    }

    def format_value(value: float, unit: str) -> str:
        """Format a value with its unit."""
        if unit == "USD":
            return f"${value:,.2f}"
        elif unit == "%":
            return f"{value}%"
        elif unit == "x":
            return f"{value}x"
        elif unit == "":
            return str(value)
        else:
            return f"{value}{unit}"

    # Get the label and unit for the condition
    condition_label = condition_labels.get(condition_type, condition_type)
    unit = condition_units.get(condition_type, "")

    # Format the threshold value
    threshold = format_value(threshold_value, unit)

    # Get the comparison text
    comparison_phrase = comparison_text.get(comparison, comparison)

    # Build the account context
    if subaccount_nickname:
        account_name = subaccount_nickname
    elif subaccount_address:
        account_name = f"{subaccount_address[:8]}...{subaccount_address[-6:]}"
    else:
        account_name = "account"

    # Build the description based on scope
    if scope == "position" and position_market:
        description = f"This alert will be triggered when your {position_market} position on {account_name} {condition_label} {comparison_phrase} {threshold}"
    else:
        description = f"This alert will be triggered when {account_name} {condition_label} {comparison_phrase} {threshold}"

    return description
