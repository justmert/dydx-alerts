import asyncio
import json
import logging
from typing import Optional, Dict, Any, Callable
from decimal import Decimal
import websockets
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

logger = logging.getLogger(__name__)


class DydxClient:
    """Wrapper for dYdX v4 Indexer WebSocket and REST API"""

    def __init__(self):
        self.ws_url = settings.DYDX_INDEXER_WS_URL
        self.rest_url = settings.DYDX_INDEXER_REST_URL
        self.ws_connection: Optional[websockets.WebSocketClientProtocol] = None
        self.subscriptions: Dict[str, Callable] = {}
        self.running = False
        self.http_client = httpx.AsyncClient(timeout=30.0)

    @retry(
        stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=30)
    )
    async def connect(self):
        """Connect to dYdX Indexer WebSocket"""
        try:
            self.ws_connection = await websockets.connect(self.ws_url)
            self.running = True
        except Exception as e:
            logger.error(f"Failed to connect to WebSocket: {e}")
            raise

    async def disconnect(self):
        """Disconnect from WebSocket"""
        self.running = False
        if self.ws_connection:
            await self.ws_connection.close()

    async def subscribe_subaccount(self, address: str, subaccount_number: int = 0):
        """Subscribe to subaccount updates"""
        # dYdX v4 requires id format: "address/subaccount_number"
        subscription_id = f"{address}/{subaccount_number}"

        # Check if connection exists and is open
        if not self.ws_connection or self.ws_connection.closed:
            logger.info(f"WebSocket connection not open, reconnecting...")
            await self.connect()

        subscribe_message = {
            "type": "subscribe",
            "channel": "v4_subaccounts",
            "id": subscription_id,
            "batched": False,
        }

        try:
            await self.ws_connection.send(json.dumps(subscribe_message))
            logger.info(f"Subscribed to subaccount {subscription_id}")
        except Exception as e:
            logger.error(f"Failed to subscribe to subaccount {subscription_id}: {e}")
            raise

    async def unsubscribe_subaccount(self, address: str, subaccount_number: int = 0):
        """Unsubscribe from subaccount updates"""
        # dYdX v4 requires id format: "address/subaccount_number"
        subscription_id = f"{address}/{subaccount_number}"

        unsubscribe_message = {
            "type": "unsubscribe",
            "channel": "v4_subaccounts",
            "id": subscription_id,
        }

        try:
            await self.ws_connection.send(json.dumps(unsubscribe_message))

            if subscription_id in self.subscriptions:
                del self.subscriptions[subscription_id]
        except Exception as e:
            logger.error(f"Failed to unsubscribe from subaccount: {e}")

    async def listen(self) -> Dict[str, Any]:
        """Listen for messages from WebSocket"""
        if not self.ws_connection:
            await self.connect()

        try:
            async for message in self.ws_connection:
                try:
                    data = json.loads(message)
                    yield data
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode message: {e}")
                    continue
        except websockets.exceptions.ConnectionClosed:
            logger.warning("WebSocket connection closed, attempting to reconnect...")
            if self.running:
                await self.connect()
                async for message in self.listen():
                    yield message
        except Exception as e:
            logger.error(f"Error in listen loop: {e}")
            raise

    async def get_subaccount_data(
        self, address: str, subaccount_number: int = 0
    ) -> Optional[Dict[str, Any]]:
        """Fetch subaccount data via REST API"""
        url = (
            f"{self.rest_url}/addresses/{address}/subaccountNumber/{subaccount_number}"
        )

        try:
            response = await self.http_client.get(url)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch subaccount data: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching subaccount data: {e}")
            return None

    def parse_subaccount_message(
        self, message: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Parse subaccount update message"""
        try:
            # REST API response format (has "subaccount" key)
            if "subaccount" in message:
                sub = message["subaccount"]
                address = sub.get("address", "")
                subaccount_number = int(sub.get("subaccountNumber", 0))
                positions = sub.get("openPerpetualPositions", {}) or {}

                return {
                    "address": address,
                    "subaccount_number": subaccount_number,
                    "equity": Decimal(str(sub.get("equity", "0"))),
                    "free_collateral": Decimal(str(sub.get("freeCollateral", "0"))),
                    "margin_enabled": sub.get("marginEnabled", True),
                    "positions": positions,
                    "updated_at": sub.get("updatedAt"),
                }

            # WebSocket message - skip non-data messages
            msg_type = message.get("type")
            if msg_type in ["connected", "subscribed", "unsubscribed", "error"]:
                return None

            # Process both channel_data and channel_batch_data messages
            if msg_type not in ["channel_data", "channel_batch_data"]:
                return None

            # Check channel type
            channel = message.get("channel")
            if channel != "v4_subaccounts":
                return None

            contents = message.get("contents", {})

            # Extract relevant data
            # ID format is "address/subaccount_number"
            message_id = message.get("id", "")
            id_parts = message_id.split("/")

            parsed = {
                "address": id_parts[0] if len(id_parts) > 0 else "",
                "subaccount_number": int(id_parts[1]) if len(id_parts) > 1 else 0,
                "equity": Decimal(str(contents.get("equity", "0"))),
                "free_collateral": Decimal(str(contents.get("freeCollateral", "0"))),
                "margin_enabled": contents.get("marginEnabled", True),
                "positions": contents.get("openPerpetualPositions", {}),
                "updated_at": message.get("version", ""),
            }

            return parsed
        except Exception as e:
            logger.error(f"Error parsing subaccount message: {e}")
            return None

    async def subscribe_markets(self, batched: bool = True):
        """Subscribe to markets channel for real-time oracle prices and market data"""
        if not self.ws_connection:
            await self.connect()

        subscribe_message = {
            "type": "subscribe",
            "channel": "v4_markets",
            "batched": batched,
        }

        try:
            await self.ws_connection.send(json.dumps(subscribe_message))
        except Exception as e:
            logger.error(f"Failed to subscribe to markets: {e}")
            raise

    async def unsubscribe_markets(self):
        """Unsubscribe from markets channel"""
        unsubscribe_message = {"type": "unsubscribe", "channel": "v4_markets"}

        try:
            await self.ws_connection.send(json.dumps(unsubscribe_message))
        except Exception as e:
            logger.error(f"Failed to unsubscribe from markets: {e}")

    def parse_markets_message(
        self, message: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Parse markets update message from WebSocket"""
        try:
            # Skip non-data messages
            msg_type = message.get("type")
            if msg_type in ["connected", "subscribed", "unsubscribed", "error"]:
                return None

            # Process both channel_data and channel_batch_data messages
            if msg_type not in ["channel_data", "channel_batch_data"]:
                return None

            # Check channel type
            channel = message.get("channel")
            if channel != "v4_markets":
                return None

            contents = message.get("contents", {})

            # Handle batch data (list of updates)
            if isinstance(contents, list):
                # Batch data: merge all market updates
                markets = {}
                for item in contents:
                    if not isinstance(item, dict):
                        continue
                    trading = item.get("trading", {})
                    if trading:
                        markets.update(trading)
                    # Also check direct markets key
                    item_markets = item.get("markets", {})
                    if item_markets:
                        markets.update(item_markets)
            else:
                # Single update (dict)
                markets = contents.get("trading", {})
                if not markets:
                    markets = contents.get("markets", {})

            return {"markets": markets, "updated_at": message.get("version", "")}
        except Exception as e:
            logger.error(f"Error parsing markets message: {e}")
            return None

    async def get_markets(self) -> Optional[Dict[str, Any]]:
        """Fetch market data via REST API (fallback)"""
        url = f"{self.rest_url}/perpetualMarkets"

        try:
            response = await self.http_client.get(url)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch markets: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return None

    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()
