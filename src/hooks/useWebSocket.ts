'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  websocketService, 
  WebSocketConnectionStatus, 
  WebSocketEventListener, 
  WebSocketEventMessage 
} from '../services/websocketService';

export interface UseWebSocketReturn {
  status: WebSocketConnectionStatus;
  isConnected: boolean;
  subscribe: <T = unknown>(channel: string, listener: WebSocketEventListener<T>) => () => void;
  on: <T = unknown>(eventType: string, listener: WebSocketEventListener<T>) => () => void;
  trackOrder: <T = unknown>(orderIdOrAwb: string, listener: WebSocketEventListener<T>) => () => void;
  send: (payload: Record<string, unknown>) => boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<WebSocketConnectionStatus>(() => websocketService.getStatus());

  useEffect(() => {
    // Sync status and listen for live network transitions
    const unsubscribe = websocketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  const subscribe = useCallback(<T = unknown>(channel: string, listener: WebSocketEventListener<T>) => {
    return websocketService.subscribe<T>(channel, listener);
  }, []);

  const on = useCallback(<T = unknown>(eventType: string, listener: WebSocketEventListener<T>) => {
    return websocketService.on<T>(eventType, listener);
  }, []);

  const trackOrder = useCallback(<T = unknown>(orderIdOrAwb: string, listener: WebSocketEventListener<T>) => {
    return websocketService.trackOrder<T>(orderIdOrAwb, listener);
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    return websocketService.send(payload);
  }, []);

  return {
    status,
    isConnected: status === 'OPEN',
    subscribe,
    on,
    trackOrder,
    send,
  };
}
