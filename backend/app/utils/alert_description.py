"""Helper utilities for generating human-readable alert descriptions"""

from typing import Dict, Any, Optional


def generate_alert_description(
    rule_name: str,
    condition_type: str,
    comparison: str,
    threshold_value: float,
    actual_value: float,
    scope: str = "account",
    position_market: Optional[str] = None,
) -> str:
    """
    Generate a human-readable description for an alert.

    Format: "{Rule Name} triggered because {condition description with actual values}"
    Example: "High Leverage Alert triggered because Margin Ratio (1.23x) was less than 1.5x"
    """

    # Condition type labels
    condition_labels: Dict[str, str] = {
        "liquidation_distance": "Liquidation Distance",
        "margin_ratio": "Margin Ratio",
        "equity_drop": "Equity",
        "position_size": "Position Size",
        "free_collateral": "Free Collateral",
        "position_pnl_percent": "Position PnL %",
        "position_pnl_usd": "Position PnL",
        "position_size_usd": "Position Size",
        "position_liquidation_distance": "Position Liquidation Distance",
        "position_leverage": "Position Leverage",
        "position_size_contracts": "Position Size (Contracts)",
        "position_entry_price": "Entry Price",
        "position_oracle_price": "Oracle Price",
        "position_funding_payment": "Funding Payment",
    }

    # Units for formatting
    units: Dict[str, str] = {
        "liquidation_distance": "%",
        "margin_ratio": "x",
        "equity_drop": "USD",
        "position_size": "USD",
        "free_collateral": "USD",
        "position_pnl_percent": "%",
        "position_pnl_usd": "USD",
        "position_size_usd": "USD",
        "position_liquidation_distance": "%",
        "position_leverage": "x",
        "position_size_contracts": "contracts",
        "position_entry_price": "USD",
        "position_oracle_price": "USD",
        "position_funding_payment": "USD",
    }

    # Human-readable comparison operators
    comparison_text: Dict[str, str] = {
        "<": "was less than",
        "<=": "was less than or equal to",
        ">": "was greater than",
        ">=": "was greater than or equal to",
        "==": "was equal to",
    }

    def format_value(value: float, unit: str) -> str:
        """Format value with appropriate unit"""
        if unit == "USD":
            return f"${value:,.2f}"
        elif unit == "%":
            return f"{value:.2f}%"
        elif unit == "x":
            return f"{value:.2f}x"
        elif unit == "contracts":
            return f"{value:,.4f} contracts"
        else:
            return f"{value:,.2f}"

    # Get labels and format values
    condition_label = condition_labels.get(condition_type, condition_type)
    unit = units.get(condition_type, "")
    human_comparison = comparison_text.get(comparison, comparison)

    actual_formatted = format_value(actual_value, unit)
    threshold_formatted = format_value(threshold_value, unit)

    # Build description
    if scope == "position" and position_market:
        # Position-level alert
        description = (
            f"{rule_name} triggered because {position_market} position's "
            f"{condition_label} ({actual_formatted}) {human_comparison} {threshold_formatted}"
        )
    else:
        # Account-level alert
        description = (
            f"{rule_name} triggered because {condition_label} "
            f"({actual_formatted}) {human_comparison} {threshold_formatted}"
        )

    return description
