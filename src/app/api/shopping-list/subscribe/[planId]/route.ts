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

  const { planId: idStr } = await params;
  const id = parseInt(idStr);

  // Lire le paramètre type de l'URL pour savoir si c'est un planId ou listId
  const url = new URL(req.url);
  const type = url.searchParams.get('type'); // 'plan' ou 'list'

  let isValidAccess = false;
  let useStandaloneItems = false;

  if (type === 'list') {
    // C'est explicitement une ShoppingList indépendante
    const list = await db.shoppingList.findUnique({
      where: { id },
      include: {
        contributors: true,
      },
    });

    if (list) {
      const isOwner = list.userId === session.user.id;
      const isContributor = list.contributors.some(
        (c) => c.userId === session.user.id
      );
      isValidAccess = isOwner || isContributor;
      useStandaloneItems = true;
    }
  } else {
    // C'est un WeeklyMealPlan (type === 'plan' ou pas de type spécifié pour rétrocompatibilité)
    const plan = await db.weeklyMealPlan.findUnique({
      where: { id },
      include: {
        contributors: true,
      },
    });

    if (plan) {
      const isOwner = plan.userId === session.user.id;
      const isContributor = plan.contributors.some(
        (c) => c.userId === session.user.id
      );
      isValidAccess = isOwner || isContributor;
    }
  }

  if (!isValidAccess) {
    return new Response("Plan ou liste non trouvé(e) ou accès refusé", { status: 404 });
  }

  // Créer un ReadableStream pour SSE
  const stream = new ReadableStream({
    start(controller) {
      // Ajouter le client à la liste
      addClient(id, controller);

      // Envoyer un message de connexion
      const data = JSON.stringify({
        type: "connected",
        planId: id,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(`data: ${data}\n\n`);

      // Envoyer les données initiales
      if (useStandaloneItems) {
        // Pour les listes indépendantes, utiliser StandaloneShoppingItem
        db.standaloneShoppingItem
          .findMany({
            where: { shoppingListId: id },
            include: {
              checkedByUser: {
                select: {
                  id: true,
                  pseudo: true,
                  name: true,
                },
              },
              storeRelation: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true,
                  color: true,
                },
              },
            },
          })
          .then((standaloneItems) => {
            try {
              // Mapper vers le format ShoppingListItem
              const items = standaloneItems.map(item => ({
                id: item.id,
                ingredientName: item.name,
                category: item.category,
                storeId: item.storeId,
                store: item.storeRelation,
                isChecked: item.isChecked,
                isManuallyAdded: item.isManuallyAdded,
                checkedAt: item.checkedAt,
                checkedByUserId: item.checkedByUserId,
                checkedByUser: item.checkedByUser,
              }));

              const data = JSON.stringify({
                type: "initial",
                items,
                timestamp: new Date().toISOString(),
              });
              controller.enqueue(`data: ${data}\n\n`);
            } catch {
              // Controller already closed, ignore
            }
          });
      } else {
        // Pour les listes liées à un menu, utiliser ShoppingListItem
        db.shoppingListItem
          .findMany({
            where: { weeklyMealPlanId: id },
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
            try {
              // Mapper storeRelation → store pour compatibilité frontend
              const mappedItems = items.map((item: any) => ({
                ...item,
                store: item.storeRelation,
                storeRelation: undefined,
              }));

              const data = JSON.stringify({
                type: "initial",
                items: mappedItems,
                timestamp: new Date().toISOString(),
              });
              controller.enqueue(`data: ${data}\n\n`);
            } catch {
              // Controller already closed, ignore
            }
          });
      }

      // Heartbeat pour garder la connexion vivante
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(`: heartbeat\n\n`);
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000); // Toutes les 30 secondes

      // Nettoyage à la déconnexion
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeClient(id, controller);
        try {
          controller.close();
        } catch {
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
