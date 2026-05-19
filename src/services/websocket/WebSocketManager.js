/**
 * WebSocket Connection Manager
 * Handles real-time updates for cost tracking, notifications, and collaboration
 */

import { resolveWebSocketOrigin } from '../../config/apiEnv';

const getDefaultWebSocketBaseUrl = () => resolveWebSocketOrigin();

class WebSocketManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || getDefaultWebSocketBaseUrl();
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.messageHandlers = new Map();
    this.isConnecting = false;
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.pendingMessages = [];
  }

  /**
   * Connect to WebSocket server
   */
  connect(token) {
    return new Promise((resolve, reject) => {
      if (this.isConnected || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        const url = `${this.baseUrl}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
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
          console.log('[WebSocket] Disconnected');
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();
          this.attemptReconnect(token);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(data) {
    const { type, payload } = data;
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[WebSocket] Handler error for ${type}:`, error);
      }
    });
  }

  /**
   * Subscribe to message type
   */
  subscribe(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Send message to WebSocket server
   */
  send(type, payload = {}) {
    const message = JSON.stringify({ type, payload });

    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Queue message if not connected
      this.pendingMessages.push(message);
      console.warn('[WebSocket] Message queued (not connected)');
    }
  }

  /**
   * Send cost update to server
   */
  sendCostUpdate(toolId, cost, metadata = {}) {
    this.send('COST_UPDATE', {
      toolId,
      cost,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Send collaboration event
   */
  sendCollaborationEvent(eventType, data) {
    this.send('COLLABORATION_EVENT', {
      eventType,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Flush pending messages when reconnected
   */
  flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send('PING');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect(token).catch((error) => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  /**
   * Disconnect WebSocket
   */
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

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      pendingMessages: this.pendingMessages.length,
    };
  }
}

// Singleton instance
let instance = null;

export function getWebSocketManager(baseUrl) {
  if (!instance) {
    instance = new WebSocketManager(baseUrl);
  }
  return instance;
}

export default WebSocketManager;
