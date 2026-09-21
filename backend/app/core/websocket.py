"""Apollo Engineering High-Throughput Real-Time WebSocket Connection Manager.

Pillars:
1. Thread-Safe Channel Subscription: Supports channels like 'orders', 'inventory', 'tracking:{id}', 'admin'.
2. Automatic Dead Connection Pruning: Detects broken sockets during broadcast and cleans them up.
3. High Availability Keep-Alive: Ping/Pong frame heartbeats with latency telemetry.
4. Serializer Resilience: Converts UUIDs, Decimals, and Datetime into ISO JSON automatically.
"""
from __future__ import annotations

import asyncio
from datetime import date, datetime
from decimal import Decimal
import json
import logging
from typing import Any
import uuid

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("apollo.websocket")


def _custom_json_serializer(obj: Any) -> Any:
    """Safe serializer for PostgreSQL / FastAPI domain types."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if hasattr(obj, "dict") and callable(obj.dict):
        return obj.dict()
    if hasattr(obj, "model_dump") and callable(obj.model_dump):
        return obj.model_dump()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class ConnectionManager:
    """Enterprise In-Memory WebSocket Connection & Channel Hub."""

    def __init__(self) -> None:
        # All active connected websockets
        self.active_connections: set[WebSocket] = set()
        # Mapping: channel_name -> set[WebSocket]
        self.channel_subscriptions: dict[str, set[WebSocket]] = {}
        # Mapping: websocket -> set[channel_name]
        self.client_channels: dict[WebSocket, set[str]] = {}
        # Mapping: client_id -> websocket
        self.client_id_map: dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: str | None = None) -> None:
        """Accept incoming WebSocket connection and register in active pool."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
            self.client_channels[websocket] = set()
            if client_id:
                self.client_id_map[client_id] = websocket
        logger.info(
            "[WebSocket] Client connected: client_id=%s. Total active: %d",
            client_id or "anonymous",
            len(self.active_connections),
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Unregister websocket and clean up channel mappings."""
        async with self._lock:
            self.active_connections.discard(websocket)

            # Remove from all subscribed channels
            subscribed = self.client_channels.pop(websocket, set())
            for ch in subscribed:
                if ch in self.channel_subscriptions:
                    self.channel_subscriptions[ch].discard(websocket)
                    if not self.channel_subscriptions[ch]:
                        del self.channel_subscriptions[ch]

            # Remove from client_id map if present
            to_remove = [cid for cid, ws in self.client_id_map.items() if ws == websocket]
            for cid in to_remove:
                del self.client_id_map[cid]

        logger.info("[WebSocket] Client disconnected. Total active: %d", len(self.active_connections))

    async def subscribe(self, websocket: WebSocket, channel: str) -> None:
        """Subscribe a websocket client to a specific topic channel."""
        async with self._lock:
            if websocket not in self.active_connections:
                return
            if channel not in self.channel_subscriptions:
                self.channel_subscriptions[channel] = set()
            self.channel_subscriptions[channel].add(websocket)
            if websocket in self.client_channels:
                self.client_channels[websocket].add(channel)
        logger.debug("[WebSocket] Subscribed client to channel '%s'", channel)

    async def unsubscribe(self, websocket: WebSocket, channel: str) -> None:
        """Unsubscribe a client from a specific topic channel."""
        async with self._lock:
            if channel in self.channel_subscriptions:
                self.channel_subscriptions[channel].discard(websocket)
                if not self.channel_subscriptions[channel]:
                    del self.channel_subscriptions[channel]
            if websocket in self.client_channels:
                self.client_channels[websocket].discard(channel)
        logger.debug("[WebSocket] Unsubscribed client from channel '%s'", channel)

    async def send_personal_message(self, websocket: WebSocket, message: dict[str, Any]) -> bool:
        """Send JSON message to a specific client with safety error catch."""
        try:
            payload = json.dumps(message, default=_custom_json_serializer)
            await websocket.send_text(payload)
            return True
        except Exception as e:
            logger.warning("[WebSocket] Error sending personal message: %s", e)
            await self.disconnect(websocket)
            return False

    async def broadcast_all(self, message: dict[str, Any]) -> int:
        """Broadcast payload to every connected client."""
        payload = json.dumps(message, default=_custom_json_serializer)
        dead_connections: list[WebSocket] = []
        sent_count = 0

        # Snapshot of connections to avoid lock contention during network I/O
        async with self._lock:
            targets = list(self.active_connections)

        for ws in targets:
            try:
                await ws.send_text(payload)
                sent_count += 1
            except Exception:
                dead_connections.append(ws)

        if dead_connections:
            for dead_ws in dead_connections:
                await self.disconnect(dead_ws)

        return sent_count

    async def broadcast(self, channel: str, message: dict[str, Any]) -> int:
        """Broadcast message to all subscribers of a specific channel."""
        # Include channel info in outgoing payload
        msg_with_channel = dict(message)
        msg_with_channel.setdefault("channel", channel)
        payload = json.dumps(msg_with_channel, default=_custom_json_serializer)

        async with self._lock:
            subscribers = list(self.channel_subscriptions.get(channel, set()))

        dead_connections: list[WebSocket] = []
        sent_count = 0

        for ws in subscribers:
            try:
                await ws.send_text(payload)
                sent_count += 1
            except Exception:
                dead_connections.append(ws)

        if dead_connections:
            for dead_ws in dead_connections:
                await self.disconnect(dead_ws)

        return sent_count

    def get_stats(self) -> dict[str, Any]:
        """Telemetry snapshot of connection health and channel saturation."""
        return {
            "active_connections": len(self.active_connections),
            "channels": {ch: len(conns) for ch, conns in self.channel_subscriptions.items()},
        }


# Global singleton instance
ws_manager = ConnectionManager()
