// Utiliser globalThis pour persister entre les hot reloads en dev
declare global {
  var sseClients: Map<number, Set<ReadableStreamDefaultController>> | undefined;
}

// Map pour stocker les clients connectés par planId - persiste entre les requêtes
const clients = globalThis.sseClients ?? new Map<number, Set<ReadableStreamDefaultController>>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.sseClients = clients;
}

export function addClient(planId: number, controller: ReadableStreamDefaultController) {
  if (!clients.has(planId)) {
    clients.set(planId, new Set());
  }
  clients.get(planId)!.add(controller);
}

export function removeClient(planId: number, controller: ReadableStreamDefaultController) {
  const clientSet = clients.get(planId);
  if (clientSet) {
    clientSet.delete(controller);
    if (clientSet.size === 0) {
      clients.delete(planId);
    }
  }
}

export function broadcastToClients(planId: number, data: any) {
  const clientSet = clients.get(planId);
  
  if (clientSet && clientSet.size > 0) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const deadClients: ReadableStreamDefaultController[] = [];
    
    clientSet.forEach((controller) => {
      try {
        controller.enqueue(message);
      } catch (error) {
        deadClients.push(controller);
      }
    });

    // Nettoyer les clients déconnectés
    deadClients.forEach((controller) => {
      clientSet.delete(controller);
    });

    if (clientSet.size === 0) {
      clients.delete(planId);
    }
  }
}

export function getClientCount(planId: number): number {
  return clients.get(planId)?.size || 0;
}