"""WebSocket Endpoints for Apollo Engineering Real-Time Operations.

Handles bi-directional communication between frontend clients (storefront, tracking, admin)
and backend domain services.
"""
from __future__ import annotations

from datetime import UTC, datetime
import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.api.deps import require_roles
from app.core.websocket import ws_manager
from app.models.auth import User, UserRole

logger = logging.getLogger("apollo.api.websocket")

router = APIRouter()


class BroadcastRequest(BaseModel):
    channel: str = "orders"
    event_type: str = "GENERIC_EVENT"
    payload: dict[str, Any] = {}


@router.websocket("/ws")
@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str | None = None,
    token: str | None = Query(None),
) -> None:
    """Bi-directional real-time communication channel.

    Supports:
    - Heartbeat keep-alive ('PING' -> 'PONG')
    - Dynamic channel subscriptions ('SUBSCRIBE', 'UNSUBSCRIBE')
    - Order tracking registration ('TRACK_ORDER')
    """
    cid = client_id or f"anon_{datetime.now(UTC).timestamp()}"
    await ws_manager.connect(websocket, client_id=cid)

    # Send initial welcome payload
    await ws_manager.send_personal_message(
        websocket,
        {
            "type": "CONNECTION_ESTABLISHED",
            "client_id": cid,
            "server_time": datetime.now(UTC).isoformat(),
            "channels_available": ["orders", "inventory", "tracking", "admin_alerts"],
        },
    )

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                message = json.loads(raw_data)
            except json.JSONDecodeError:
                await ws_manager.send_personal_message(
                    websocket,
                    {"type": "ERROR", "message": "Invalid JSON format"},
                )
                continue

            msg_type = str(message.get("type", "")).upper()

            if msg_type == "PING":
                await ws_manager.send_personal_message(
                    websocket,
                    {
                        "type": "PONG",
                        "timestamp": datetime.now(UTC).isoformat(),
                        "echo": message.get("payload"),
                    },
                )

            elif msg_type == "SUBSCRIBE":
                channel = message.get("channel")
                if channel and isinstance(channel, str):
                    await ws_manager.subscribe(websocket, channel)
                    await ws_manager.send_personal_message(
                        websocket,
                        {
                            "type": "SUBSCRIBED",
                            "channel": channel,
                            "timestamp": datetime.now(UTC).isoformat(),
                        },
                    )

            elif msg_type == "UNSUBSCRIBE":
                channel = message.get("channel")
                if channel and isinstance(channel, str):
                    await ws_manager.unsubscribe(websocket, channel)
                    await ws_manager.send_personal_message(
                        websocket,
                        {
                            "type": "UNSUBSCRIBED",
                            "channel": channel,
                            "timestamp": datetime.now(UTC).isoformat(),
                        },
                    )

            elif msg_type == "TRACK_ORDER":
                order_id = message.get("order_id") or message.get("order_number")
                if order_id:
                    channel = f"tracking:{order_id}"
                    await ws_manager.subscribe(websocket, channel)
                    await ws_manager.send_personal_message(
                        websocket,
                        {
                            "type": "ORDER_TRACKING_ATTACHED",
                            "order_id": order_id,
                            "channel": channel,
                            "timestamp": datetime.now(UTC).isoformat(),
                        },
                    )

            else:
                # Echo receipt of unhandled custom actions
                logger.debug("[WebSocket] Received action '%s' from %s", msg_type, cid)

    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
        logger.info("[WebSocket] Disconnected cleanly: %s", cid)
    except Exception as exc:
        logger.warning("[WebSocket] Error in connection loop for %s: %s", cid, exc)
        await ws_manager.disconnect(websocket)


@router.get("/ws/stats")
async def get_websocket_stats(
    _current_user: Annotated[User, Depends(require_roles([UserRole.OWNER, UserRole.AUDITOR]))],
) -> dict[str, Any]:
    """Health & Telemetry endpoint for active WebSocket channels."""
    return {
        "status": "healthy",
        "telemetry": ws_manager.get_stats(),
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.post("/ws/broadcast")
async def trigger_broadcast(
    req: BroadcastRequest,
    _current_user: Annotated[User, Depends(require_roles([UserRole.OWNER, UserRole.ORDER_OPERATIONS]))],
) -> dict[str, Any]:
    """Admin / Internal webhook helper to broadcast messages to subscribers."""
    recipients = await ws_manager.broadcast(
        channel=req.channel,
        message={
            "type": req.event_type,
            "data": req.payload,
            "timestamp": datetime.now(UTC).isoformat(),
        },
    )
    return {
        "channel": req.channel,
        "event_type": req.event_type,
        "recipients_delivered": recipients,
        "timestamp": datetime.now(UTC).isoformat(),
    }
