"""Comprehensive Unit Tests for Apollo Engineering WebSocket System."""
import asyncio
import json
import pytest
from starlette.websockets import WebSocketDisconnect

from app.core.websocket import ConnectionManager, ws_manager


class MockWebSocket:
    """Mock WebSocket for unit testing ConnectionManager without network overhead."""

    def __init__(self):
        self.accepted = False
        self.sent_messages = []
        self.closed = False

    async def accept(self):
        self.accepted = True

    async def send_text(self, text: str):
        if self.closed:
            raise RuntimeError("Cannot send on closed socket")
        self.sent_messages.append(text)

    async def close(self, code: int = 1000):
        self.closed = True


@pytest.mark.asyncio
async def test_websocket_connect_and_disconnect():
    manager = ConnectionManager()
    ws = MockWebSocket()

    await manager.connect(ws, client_id="test_client_1")
    assert ws.accepted is True
    assert ws in manager.active_connections
    assert manager.get_stats()["active_connections"] == 1

    await manager.disconnect(ws)
    assert ws not in manager.active_connections
    assert manager.get_stats()["active_connections"] == 0


@pytest.mark.asyncio
async def test_websocket_channels_and_broadcast():
    manager = ConnectionManager()
    ws1 = MockWebSocket()
    ws2 = MockWebSocket()
    ws3 = MockWebSocket()

    await manager.connect(ws1, client_id="c1")
    await manager.connect(ws2, client_id="c2")
    await manager.connect(ws3, client_id="c3")

    # ws1 and ws2 subscribe to 'orders'
    await manager.subscribe(ws1, "orders")
    await manager.subscribe(ws2, "orders")

    # ws2 and ws3 subscribe to 'tracking'
    await manager.subscribe(ws2, "tracking")
    await manager.subscribe(ws3, "tracking")

    # Broadcast to 'orders'
    count = await manager.broadcast("orders", {"type": "ORDER_PLACED", "id": "ORD-001"})
    assert count == 2
    assert len(ws1.sent_messages) == 1
    assert len(ws2.sent_messages) == 1
    assert len(ws3.sent_messages) == 0

    order_msg = json.loads(ws1.sent_messages[0])
    assert order_msg["type"] == "ORDER_PLACED"
    assert order_msg["channel"] == "orders"

    # Broadcast to 'tracking'
    count = await manager.broadcast("tracking", {"type": "STATUS_UPDATE", "status": "IN_TRANSIT"})
    assert count == 2
    assert len(ws2.sent_messages) == 2
    assert len(ws3.sent_messages) == 1

    # Clean up
    await manager.disconnect(ws1)
    await manager.disconnect(ws2)
    await manager.disconnect(ws3)
    assert manager.get_stats()["active_connections"] == 0


@pytest.mark.asyncio
async def test_websocket_dead_connection_pruning():
    manager = ConnectionManager()
    ws = MockWebSocket()
    await manager.connect(ws, client_id="dead_test")
    await manager.subscribe(ws, "alerts")

    # Simulate connection drop
    ws.closed = True

    # Broadcast should detect error and prune
    sent = await manager.broadcast("alerts", {"type": "ALERT"})
    assert sent == 0
    assert ws not in manager.active_connections
