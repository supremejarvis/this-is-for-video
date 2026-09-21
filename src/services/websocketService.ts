/**
 * Apollo Engineering Real-Time WebSocket Service.
 * 
 * Invariants:
 * 1. Resilient Auto-Reconnect with exponential backoff & jitter.
 * 2. Automatic channel re-subscription on reconnection.
 * 3. Keep-alive heartbeat (PING -> PONG) every 25 seconds.
 * 4. Strongly typed channel subscriptions & topic routing ('orders', 'inventory', 'tracking').
 * 5. Non-authoritative client projection (PostgreSQL FastAPI remains single source of truth).
 */

export type WebSocketConnectionStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

export interface WebSocketEventMessage<T = unknown> {
  type: string;
  channel?: string;
  data?: T;
  payload?: T;
  order_id?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export type WebSocketEventListener<T = unknown> = (message: WebSocketEventMessage<T>) => void;

function resolveWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      // Connect to local FastAPI uvicorn instance
      return 'ws://127.0.0.1:8000/api/v1/ws';
    }
    const protocol = isHttps ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/v1/ws`;
  }
  return 'ws://127.0.0.1:8000/api/v1/ws';
}

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private ws: WebSocket | null = null;
  private status: WebSocketConnectionStatus = 'CLOSED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private hasReceivedPong = true;

  // Active channel subscriptions: channel -> Set of listener callbacks
  private channelListeners: Map<string, Set<WebSocketEventListener>> = new Map();
  // Event-type listeners: eventType -> Set of listener callbacks
  private eventListeners: Map<string, Set<WebSocketEventListener>> = new Map();
  // Status change listeners
  private statusListeners: Set<(status: WebSocketConnectionStatus) => void> = new Set();

  private constructor() {
    // Lazy connect when in browser
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public static resetInstanceForTesting(): void {
    if (WebSocketService.instance) {
      WebSocketService.instance.disconnect();
      WebSocketService.instance = null;
    }
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const url = resolveWebSocketUrl();
    this.setStatus('CONNECTING');

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('OPEN');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        // Resubscribe to all existing channels
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = () => {
        // Handled in onclose
      };

      this.ws.onclose = () => {
        this.setStatus('CLOSED');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('CLOSED');
      this.scheduleReconnect();
    }
  }

  private setStatus(newStatus: WebSocketConnectionStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => {
      try {
        fn(newStatus);
      } catch (err) {
        console.error('[WebSocket] Status listener error:', err);
      }
    });
  }

  public getStatus(): WebSocketConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'OPEN';
  }

  public onStatusChange(callback: (status: WebSocketConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  public send(payload: Record<string, unknown>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Subscribe to a topic channel ('orders', 'inventory', 'tracking', etc.)
   */
  public subscribe<T = unknown>(channel: string, listener: WebSocketEventListener<T>): () => void {
    let set = this.channelListeners.get(channel);
    const isFirstSubscriber = !set || set.size === 0;

    if (!set) {
      set = new Set();
      this.channelListeners.set(channel, set);
    }
    set.add(listener as WebSocketEventListener);

    // If already open and this is the first listener for this channel, send SUBSCRIBE frame
    if (isFirstSubscriber && this.isConnected()) {
      this.send({ type: 'SUBSCRIBE', channel });
    }

    return () => {
      const currentSet = this.channelListeners.get(channel);
      if (currentSet) {
        currentSet.delete(listener as WebSocketEventListener);
        if (currentSet.size === 0) {
          this.channelListeners.delete(channel);
          if (this.isConnected()) {
            this.send({ type: 'UNSUBSCRIBE', channel });
          }
        }
      }
    };
  }

  /**
   * Subscribe to a specific event type (e.g. 'ORDER_CONFIRMED', 'TRACKING_EVENT')
   */
  public on<T = unknown>(eventType: string, listener: WebSocketEventListener<T>): () => void {
    const normType = eventType.toUpperCase();
    let set = this.eventListeners.get(normType);
    if (!set) {
      set = new Set();
      this.eventListeners.set(normType, set);
    }
    set.add(listener as WebSocketEventListener);

    return () => {
      const currentSet = this.eventListeners.get(normType);
      if (currentSet) {
        currentSet.delete(listener as WebSocketEventListener);
        if (currentSet.size === 0) {
          this.eventListeners.delete(normType);
        }
      }
    };
  }

  /**
   * Helper: Register live tracking for a specific order / shipment AWB
   */
  public trackOrder<T = unknown>(orderIdOrAwb: string, listener: WebSocketEventListener<T>): () => void {
    const channel = `tracking:${orderIdOrAwb}`;
    const unsubscribeChannel = this.subscribe<T>(channel, listener);
    
    // Also send explicit TRACK_ORDER command to backend
    if (this.isConnected()) {
      this.send({ type: 'TRACK_ORDER', order_id: orderIdOrAwb });
    }

    return unsubscribeChannel;
  }

  private handleMessage(raw: string): void {
    try {
      const parsed: WebSocketEventMessage = JSON.parse(raw);
      const msgType = String(parsed.type || '').toUpperCase();

      if (msgType === 'PONG') {
        this.hasReceivedPong = true;
        if (this.pingTimeout) {
          clearTimeout(this.pingTimeout);
          this.pingTimeout = null;
        }
        return;
      }

      // Notify channel listeners
      if (parsed.channel) {
        const listeners = this.channelListeners.get(parsed.channel);
        if (listeners) {
          listeners.forEach((fn) => {
            try {
              fn(parsed);
            } catch (err) {
              console.error(`[WebSocket] Listener error on channel ${parsed.channel}:`, err);
            }
          });
        }
      }

      // Notify event-type listeners
      if (msgType) {
        const listeners = this.eventListeners.get(msgType);
        if (listeners) {
          listeners.forEach((fn) => {
            try {
              fn(parsed);
            } catch (err) {
              console.error(`[WebSocket] Listener error on event ${msgType}:`, err);
            }
          });
        }
      }
    } catch {
      // Ignore unparseable frames
    }
  }

  private resubscribeAll(): void {
    this.channelListeners.forEach((_, channel) => {
      this.send({ type: 'SUBSCRIBE', channel });
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.hasReceivedPong = true;

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.hasReceivedPong = false;
        this.send({ type: 'PING', timestamp: Date.now() });

        // If PONG not received within 8 seconds, force reconnect
        this.pingTimeout = setTimeout(() => {
          if (!this.hasReceivedPong && this.ws) {
            console.warn('[WebSocket] Heartbeat timeout. Reconnecting...');
            this.ws.close();
          }
        }, 8000);
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached.');
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, up to 15s + random jitter
    const backoff = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    const jitter = Math.random() * 500;
    const delay = backoff + jitter;

    this.reconnectAttempts += 1;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('CLOSED');
  }
}

export const websocketService = WebSocketService.getInstance();
