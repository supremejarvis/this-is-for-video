import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from '../websocketService';

// Mock browser WebSocket
class MockBrowserWebSocket {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSING = 2;
  public readonly CLOSED = 3;

  public static instances: MockBrowserWebSocket[] = [];
  public readyState: number = 0; // CONNECTING
  public url: string;
  public sentMessages: string[] = [];

  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onerror: ((error: unknown) => void) | null = null;
  public onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockBrowserWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 10);
  }

  public send(data: string) {
    this.sentMessages.push(data);
  }

  public close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  public simulateMessage(data: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('Apollo WebSocket Service', () => {
  let originalWebSocket: typeof globalThis.WebSocket;

  beforeEach(() => {
    WebSocketService.resetInstanceForTesting();
    originalWebSocket = globalThis.WebSocket;
    MockBrowserWebSocket.instances = [];
    // @ts-expect-error Mocking global WebSocket
    globalThis.WebSocket = MockBrowserWebSocket;
    vi.useFakeTimers();
  });

  afterEach(() => {
    WebSocketService.resetInstanceForTesting();
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it('instantiates and initiates connection to WebSocket server', () => {
    const service = WebSocketService.getInstance();
    expect(service).toBeDefined();
    expect(service.getStatus()).toBe('CONNECTING');

    // Advance timers to trigger open
    vi.advanceTimersByTime(20);
    expect(service.getStatus()).toBe('OPEN');
    expect(service.isConnected()).toBe(true);
  });

  it('subscribes to channels and sends SUBSCRIBE frame to server', () => {
    const service = WebSocketService.getInstance();
    vi.advanceTimersByTime(20);

    const wsInstance = MockBrowserWebSocket.instances[0];
    expect(wsInstance).toBeDefined();

    const listener = vi.fn();
    const unsubscribe = service.subscribe('orders', listener);

    expect(wsInstance.sentMessages).toContain(JSON.stringify({ type: 'SUBSCRIBE', channel: 'orders' }));

    // Simulate incoming message on channel
    wsInstance.simulateMessage({
      type: 'ORDER_UPDATED',
      channel: 'orders',
      order_id: 'ORD-123',
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ORDER_UPDATED',
        channel: 'orders',
        order_id: 'ORD-123',
      })
    );

    // Unsubscribe
    unsubscribe();
    expect(wsInstance.sentMessages).toContain(JSON.stringify({ type: 'UNSUBSCRIBE', channel: 'orders' }));
  });

  it('handles trackOrder helper by sending TRACK_ORDER command', () => {
    const service = WebSocketService.getInstance();
    vi.advanceTimersByTime(20);

    const wsInstance = MockBrowserWebSocket.instances[0];
    expect(wsInstance).toBeDefined();
    const listener = vi.fn();

    service.trackOrder('APE-SPEED-POST-001', listener);

    expect(wsInstance.sentMessages).toContain(
      JSON.stringify({ type: 'TRACK_ORDER', order_id: 'APE-SPEED-POST-001' })
    );

    // Deliver tracking event
    wsInstance.simulateMessage({
      type: 'STATUS_UPDATE',
      channel: 'tracking:APE-SPEED-POST-001',
      status: 'DISPATCHED',
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'STATUS_UPDATE',
        status: 'DISPATCHED',
      })
    );
  });
});
