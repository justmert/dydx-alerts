from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        # Map of user_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str = "default"):
        """Accept new WebSocket connection"""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()

        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str = "default"):
        """Remove WebSocket connection"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)

            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to specific user"""
        if user_id in self.active_connections:
            disconnected = set()

            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    disconnected.add(connection)

            # Clean up disconnected connections
            for connection in disconnected:
                self.disconnect(connection, user_id)

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    # For self-hosted, use "default" user_id
    user_id = "default"

    await manager.connect(websocket, user_id)

    try:
        while True:
            # Keep connection alive and receive any messages from client
            data = await websocket.receive_text()

            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)


async def broadcast_position_update(subaccount_id: str, data: dict):
    """Broadcast position update to all connected clients"""
    message = {"type": "position_update", "subaccount_id": subaccount_id, "data": data}
    await manager.broadcast(message)


async def broadcast_alert(alert_data: dict):
    """Broadcast alert to all connected clients"""
    message = {"type": "alert", "data": alert_data}
    await manager.broadcast(message)
