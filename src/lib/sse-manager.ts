/**
 * SSE Manager Singleton
 * Gère les connexions Server-Sent Events de manière centralisée
 * - Évite les connexions multiples
 * - Reconnexion automatique avec backoff exponentiel
 * - Partage de connexion entre composants
 */

type SSEListener = (data: unknown) => void;
type ErrorListener = (error: Error) => void;

interface SSEConnection {
  eventSource: EventSource;
  listeners: Set<SSEListener>;
  errorListeners: Set<ErrorListener>;
  reconnectAttempts: number;
  reconnectTimer?: NodeJS.Timeout;
}

class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 seconde

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
    };

    // Gérer les messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        connection.listeners.forEach((listener) => listener(data));
        // Reset reconnect attempts sur message réussi
        connection.reconnectAttempts = 0;
      } catch (error) {
        console.error('[SSEManager] Failed to parse message:', error);
      }
    };

    // Gérer les erreurs
    eventSource.onerror = () => {
      console.error('[SSEManager] Connection error:', url);
      
      const error = new Error(`SSE connection error for ${url}`);
      connection.errorListeners.forEach((listener) => listener(error));

      // Tenter une reconnexion avec backoff exponentiel
      this.attemptReconnect(url, connection);
    };

    console.log('[SSEManager] Created connection:', url);
    return connection;
  }

  /**
   * Tenter une reconnexion avec backoff exponentiel
   */
  private attemptReconnect(url: string, connection: SSEConnection): void {
    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSEManager] Max reconnect attempts reached:', url);
      this.closeConnection(url);
      return;
    }

    // Calculer le délai avec backoff exponentiel
    const delay = this.baseReconnectDelay * Math.pow(2, connection.reconnectAttempts);
    connection.reconnectAttempts++;

    console.log(
      `[SSEManager] Reconnecting in ${delay}ms (attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    // Fermer l'ancienne connexion
    connection.eventSource.close();

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

    connection.eventSource.close();
    connection.listeners.clear();
    connection.errorListeners.clear();
    this.connections.delete(url);

    console.log('[SSEManager] Closed connection:', url);
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
import { useEffect } from 'react';

export function useSSE<T = unknown>(
  url: string | null,
  onMessage: (data: T) => void,
  onError?: (error: Error) => void
): void {
  useEffect(() => {
    if (!url) return;

    const unsubscribe = sseManager.subscribe(
      url,
      onMessage as SSEListener,
      onError
    );

    return unsubscribe;
  }, [url, onMessage, onError]);
}
