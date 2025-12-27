import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addClient, removeClient } from "@/lib/sse-clients";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response("Non authentifié", { status: 401 });
  }

  const { planId: planIdStr } = await params;
  const planId = parseInt(planIdStr);

  // Vérifier l'accès au plan
  const plan = await db.weeklyMealPlan.findUnique({
    where: { id: planId },
    include: {
      contributors: true,
    },
  });

  if (!plan) {
    return new Response("Plan non trouvé", { status: 404 });
  }

  const isOwner = plan.userId === session.user.id;
  const isContributor = plan.contributors.some(
    (c) => c.userId === session.user.id
  );

  if (!isOwner && !isContributor) {
    return new Response("Accès refusé", { status: 403 });
  }

  // Créer un ReadableStream pour SSE
  const stream = new ReadableStream({
    start(controller) {
      // Ajouter le client à la liste
      addClient(planId, controller);

      // Envoyer un message de connexion
      const data = JSON.stringify({
        type: "connected",
        planId,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(`data: ${data}\n\n`);

      // Envoyer les données initiales
      db.shoppingListItem
        .findMany({
          where: { weeklyMealPlanId: planId },
          include: {
            checkedByUser: {
              select: {
                id: true,
                pseudo: true,
                name: true,
              },
            },
          },
        })
        .then((items) => {
          const data = JSON.stringify({
            type: "initial",
            items,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(`data: ${data}\n\n`);
        });

      // Heartbeat pour garder la connexion vivante
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // Toutes les 30 secondes

      // Nettoyage à la déconnexion
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeClient(planId, controller);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
