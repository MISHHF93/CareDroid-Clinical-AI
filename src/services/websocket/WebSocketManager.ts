import { resolveWebSocketOrigin } from '../../config/api.config';

const getDefaultWebSocketBaseUrl = () => resolveWebSocketOrigin();

class WebSocketManager {
  baseUrl: string;
  ws: WebSocket | null = null;
  reconnectAttempts: number = 0;
  maxReconnectAttempts: number = 5;
  reconnectDelay: number = 3000;
  messageHandlers: Map<string, any[]> = new Map();
  isConnecting: boolean = false;
  isConnected: boolean = false;
  heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  pendingMessages: any[] = [];

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getDefaultWebSocketBaseUrl();
  }

  connect(token: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.isConnected || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        const url = `${this.baseUrl}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushPendingMessages();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();
          this.attemptReconnect(token);
        };
      } catch (error: any) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  handleMessage(data: any) {
    const { type, payload } = data;
    const handlers: any[] = this.messageHandlers.get(type) || [];
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error: any) {
        console.error(`[WebSocket] Handler error for ${type}:`, error);
      }
    });
  }

  subscribe(messageType: string, handler: (payload: any) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);

    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }

  send(type: string, payload: any = {}) {
    const message = JSON.stringify({ type, payload });

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.pendingMessages.push(message);
      console.warn('[WebSocket] Message queued (not connected)');
    }
  }

  sendCostUpdate(toolId: string, cost: number, metadata: any = {}) {
    this.send('COST_UPDATE', { toolId, cost, timestamp: new Date().toISOString(), ...metadata });
  }

  sendCollaborationEvent(eventType: string, data: any) {
    this.send('COLLABORATION_EVENT', { eventType, data, timestamp: new Date().toISOString() });
  }

  flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('PING');
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      setTimeout(() => {
        this.connect(token).catch((error) => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  disconnect() {
    this.stopHeartbeat();
    this.pendingMessages = [];
    this.messageHandlers.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      pendingMessages: this.pendingMessages.length,
    };
  }
}

let instance: WebSocketManager | null = null;

export function getWebSocketManager(baseUrl?: string): WebSocketManager {
  if (!instance) {
    instance = new WebSocketManager(baseUrl);
  }
  return instance;
}

export default WebSocketManager;
