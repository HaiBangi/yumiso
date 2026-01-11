/**
 * SSE Manager Singleton
 * Gère les connexions Server-Sent Events de manière centralisée
 * - Évite les connexions multiples
 * - Reconnexion automatique avec backoff exponentiel plafonné
 * - Partage de connexion entre composants
 * - Heartbeat pour détecter les connexions mortes
 * - Page Visibility API pour gérer le background/foreground
 */

type SSEListener = (data: unknown) => void;
type ErrorListener = (error: Error) => void;

interface SSEConnection {
  eventSource: EventSource;
  listeners: Set<SSEListener>;
  errorListeners: Set<ErrorListener>;
  reconnectAttempts: number;
  reconnectTimer?: NodeJS.Timeout;
  heartbeatTimer?: NodeJS.Timeout;
  lastHeartbeat?: number;
  isReconnecting?: boolean;
}

class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private maxReconnectAttempts = Infinity; // Reconnexion illimitée
  private baseReconnectDelay = 1000; // 1 seconde
  private maxReconnectDelay = 30000; // 30 secondes max
  private heartbeatInterval = 35000; // 35 secondes (serveur envoie toutes les 30s)
  private heartbeatTimeout = 45000; // 45 secondes avant de considérer la connexion morte

  constructor() {
    // Gérer la Page Visibility API pour PWA/mobile
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('[SSEManager] 📱 App is now visible, checking connections...');
          this.onAppForeground();
        } else {
          console.log('[SSEManager] 📱 App is now hidden');
          this.onAppBackground();
        }
      });
    }
  }

  /**
   * Appelé quand l'app passe au premier plan
   */
  private onAppForeground(): void {
    // Vérifier toutes les connexions et forcer une reconnexion si nécessaire
    this.connections.forEach((connection, url) => {
      const timeSinceLastHeartbeat = Date.now() - (connection.lastHeartbeat || 0);

      // Si pas de heartbeat depuis longtemps, forcer reconnexion
      if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
        console.log(`[SSEManager] 🔄 Forcing reconnect after foreground (no heartbeat for ${timeSinceLastHeartbeat}ms):`, url);

        if (!connection.isReconnecting) {
          connection.isReconnecting = true;
          this.attemptReconnect(url, connection);
        }
      }
    });
  }

  /**
   * Appelé quand l'app passe en arrière-plan
   */
  private onAppBackground(): void {
    // Sur mobile, les connexions peuvent être suspendues
    // On ne fait rien ici, on laisse le heartbeat détecter les problèmes au retour
  }

  /**
   * S'abonner à un flux SSE
   */
  subscribe(
    url: string,
    onMessage: SSEListener,
    onError?: ErrorListener
  ): () => void {
    let connection = this.connections.get(url);

    if (!connection) {
      // Créer une nouvelle connexion
      connection = this.createConnection(url);
      this.connections.set(url, connection);
    }

    // Ajouter les listeners
    connection.listeners.add(onMessage);
    if (onError) {
      connection.errorListeners.add(onError);
    }

    // Retourner une fonction de cleanup
    return () => {
      this.unsubscribe(url, onMessage, onError);
    };
  }

  /**
   * Se désabonner d'un flux SSE
   */
  private unsubscribe(
    url: string,
    onMessage: SSEListener,
    onError?: ErrorListener
  ): void {
    const connection = this.connections.get(url);
    if (!connection) return;

    connection.listeners.delete(onMessage);
    if (onError) {
      connection.errorListeners.delete(onError);
    }

    // Si plus aucun listener, fermer la connexion
    if (connection.listeners.size === 0) {
      this.closeConnection(url);
    }
  }

  /**
   * Créer une nouvelle connexion SSE
   */
  private createConnection(url: string): SSEConnection {
    const eventSource = new EventSource(url);
    const connection: SSEConnection = {
      eventSource,
      listeners: new Set(),
      errorListeners: new Set(),
      reconnectAttempts: 0,
      lastHeartbeat: Date.now(),
      isReconnecting: false,
    };

    // Gérer les messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Détecter les heartbeats
        if (data.type === 'heartbeat' || data.type === 'ping') {
          console.log('[SSEManager] ❤️ Heartbeat received:', url);
          connection.lastHeartbeat = Date.now();
          // Reset reconnect attempts sur heartbeat
          connection.reconnectAttempts = 0;
          return;
        }

        // Message normal
        connection.listeners.forEach((listener) => listener(data));
        // Reset reconnect attempts sur message réussi
        connection.reconnectAttempts = 0;
        connection.lastHeartbeat = Date.now();
      } catch (error) {
        console.error('[SSEManager] Failed to parse message:', error);
      }
    };

    // Gérer les événements open
    eventSource.onopen = () => {
      console.log('[SSEManager] ✅ Connection opened:', url);
      connection.reconnectAttempts = 0;
      connection.lastHeartbeat = Date.now();
      connection.isReconnecting = false;

      // Démarrer le monitoring heartbeat
      this.startHeartbeatMonitoring(url, connection);
    };

    // Gérer les erreurs
    eventSource.onerror = (event) => {
      // Différencier les types d'erreurs
      const readyState = eventSource.readyState;

      if (readyState === EventSource.CLOSED) {
        console.error('[SSEManager] ❌ Connection closed:', url);
      } else if (readyState === EventSource.CONNECTING) {
        console.warn('[SSEManager] ⚠️ Connection interrupted, reconnecting...:', url);
      }

      const error = new Error(`SSE connection error for ${url} (readyState: ${readyState})`);
      connection.errorListeners.forEach((listener) => listener(error));

      // Éviter de tenter une reconnexion si déjà en cours
      if (!connection.isReconnecting) {
        connection.isReconnecting = true;
        this.attemptReconnect(url, connection);
      }
    };

    console.log('[SSEManager] 🔌 Created connection:', url);
    return connection;
  }

  /**
   * Démarrer le monitoring du heartbeat
   */
  private startHeartbeatMonitoring(url: string, connection: SSEConnection): void {
    // Nettoyer le timer précédent
    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
    }

    // Vérifier périodiquement si on reçoit des heartbeats
    connection.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - (connection.lastHeartbeat || 0);

      if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
        console.error(
          `[SSEManager] 💀 No heartbeat for ${timeSinceLastHeartbeat}ms, reconnecting:`,
          url
        );

        // Connexion morte, forcer une reconnexion
        if (!connection.isReconnecting) {
          connection.isReconnecting = true;
          this.attemptReconnect(url, connection);
        }
      } else {
        console.log(
          `[SSEManager] ✓ Heartbeat OK (${timeSinceLastHeartbeat}ms ago):`,
          url
        );
      }
    }, this.heartbeatInterval);
  }

  /**
   * Tenter une reconnexion avec backoff exponentiel plafonné
   */
  private attemptReconnect(url: string, connection: SSEConnection): void {
    // Nettoyer le heartbeat timer
    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
      connection.heartbeatTimer = undefined;
    }

    // Calculer le délai avec backoff exponentiel plafonné
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, connection.reconnectAttempts);
    const delay = Math.min(exponentialDelay, this.maxReconnectDelay);
    connection.reconnectAttempts++;

    console.log(
      `[SSEManager] 🔄 Reconnecting in ${delay}ms (attempt ${connection.reconnectAttempts})`
    );

    // Fermer l'ancienne connexion proprement
    try {
      connection.eventSource.close();
    } catch (error) {
      console.warn('[SSEManager] Error closing EventSource:', error);
    }

    // Attendre avant de recréer
    connection.reconnectTimer = setTimeout(() => {
      const listeners = Array.from(connection.listeners);
      const errorListeners = Array.from(connection.errorListeners);

      // Retirer l'ancienne connexion
      this.connections.delete(url);

      // Recréer la connexion
      const newConnection = this.createConnection(url);
      listeners.forEach((listener) => newConnection.listeners.add(listener));
      errorListeners.forEach((listener) => newConnection.errorListeners.add(listener));
      newConnection.reconnectAttempts = connection.reconnectAttempts; // Conserver le compteur

      this.connections.set(url, newConnection);
    }, delay);
  }

  /**
   * Fermer une connexion
   */
  private closeConnection(url: string): void {
    const connection = this.connections.get(url);
    if (!connection) return;

    if (connection.reconnectTimer) {
      clearTimeout(connection.reconnectTimer);
    }

    if (connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
    }

    try {
      connection.eventSource.close();
    } catch (error) {
      console.warn('[SSEManager] Error closing EventSource:', error);
    }

    connection.listeners.clear();
    connection.errorListeners.clear();
    this.connections.delete(url);

    console.log('[SSEManager] 🔌 Closed connection:', url);
  }

  /**
   * Fermer toutes les connexions
   */
  closeAll(): void {
    this.connections.forEach((_, url) => {
      this.closeConnection(url);
    });
  }

  /**
   * Obtenir le statut d'une connexion
   */
  getStatus(url: string): {
    connected: boolean;
    listeners: number;
    reconnectAttempts: number;
  } | null {
    const connection = this.connections.get(url);
    if (!connection) return null;

    return {
      connected: connection.eventSource.readyState === EventSource.OPEN,
      listeners: connection.listeners.size,
      reconnectAttempts: connection.reconnectAttempts,
    };
  }
}

// Export singleton instance
export const sseManager = new SSEManager();

// Hook React pour utiliser SSE facilement
import { useEffect, useRef } from 'react';

export function useSSE<T = unknown>(
  url: string | null,
  onMessage: (data: T) => void,
  onError?: (error: Error) => void
): void {
  // Utiliser des refs pour éviter les re-subscriptions quand les callbacks changent
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!url) return;

    // Créer des wrappers stables qui utilisent les refs
    const messageHandler = (data: unknown) => {
      onMessageRef.current(data as T);
    };

    const errorHandler = (error: Error) => {
      onErrorRef.current?.(error);
    };

    const unsubscribe = sseManager.subscribe(
      url,
      messageHandler as SSEListener,
      errorHandler
    );

    return unsubscribe;
  }, [url]); // Seulement url comme dépendance
}
