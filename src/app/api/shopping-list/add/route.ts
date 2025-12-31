import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { broadcastToClients } from "@/lib/sse-clients";

// Helper pour catégoriser un ingrédient
function categorizeIngredient(ingredientName: string): string {
  const lowerName = ingredientName.toLowerCase();

  // ===== GESTION DES EDGE CASES EN PRIORITÉ =====

  // 1. Sauces et huiles vont TOUJOURS dans "Condiments & Sauces"
  if (lowerName.includes("sauce") || lowerName.includes("huile")) {
    return "Condiments & Sauces";
  }

  // 2. Vinaigre et moutarde
  if (lowerName.includes("vinaigre") || lowerName.includes("moutarde")) {
    return "Condiments & Sauces";
  }

  // 3. Bouillon, cube, fond (ex: "bouillon de légumes", "cube de bouillon")
  if (lowerName.includes("bouillon") || lowerName.includes("cube") || lowerName.includes("fond de")) {
    return "Condiments & Sauces";
  }

  // 4. Épices et aromates séchés (mais pas herbes fraîches)
  if ((lowerName.includes("épice") || lowerName.includes("poudre") || lowerName.includes("moulu"))
      && !lowerName.includes("pomme de terre")) {
    return "Condiments & Sauces";
  }

  // 5. Pâte (tartiner, curry, etc.) - sauf "pâte feuilletée", "pâte brisée"
  if (lowerName.includes("pâte") &&
      !lowerName.includes("pâtes") &&
      !lowerName.includes("feuilletée") &&
      !lowerName.includes("brisée") &&
      !lowerName.includes("sablée")) {
    return "Condiments & Sauces";
  }

  // 6. Lait de coco, crème de coco (pas produits laitiers)
  if (lowerName.includes("lait de coco") || lowerName.includes("crème de coco")) {
    return "Épicerie";
  }

  // 7. Farine, levure, bicarbonate
  if (lowerName.includes("farine") || lowerName.includes("levure") || lowerName.includes("bicarbonate")) {
    return "Épicerie";
  }

  // ===== CATÉGORISATION NORMALE (avec frontières de mots) =====
  const CATEGORIES: Record<string, string[]> = {
    "Fruits & Légumes": [
      "tomate", "carotte", "oignon", "ail", "poivron", "salade", "laitue", "chou",
      "courgette", "aubergine", "épinard", "brocoli", "pomme de terre", "patate",
      "pomme", "poire", "banane", "orange", "citron", "fraise", "avocat", "céleri",
      "concombre", "champignon", "poireau", "haricot vert", "petit pois"
    ],
    "Viandes & Poissons": [
      "viande", "boeuf", "veau", "porc", "agneau", "poulet", "dinde", "canard",
      "steak", "côte", "escalope", "filet", "jambon", "lard", "bacon", "saucisse",
      "poisson", "saumon", "thon", "cabillaud", "crevette", "gambas", "échine"
    ],
    "Produits Laitiers": [
      "lait", "fromage", "yaourt", "crème", "beurre", "oeuf", "œuf", "mozzarella",
      "parmesan", "gruyère", "emmental", "camembert", "chèvre", "feta"
    ],
    "Pain & Boulangerie": [
      "pain", "baguette", "brioche", "croissant", "pain de mie", "toast"
    ],
    "Épicerie": [
      "pâtes", "riz", "semoule", "quinoa", "lentilles", "pois chiche", "farine",
      "sucre", "sel", "conserve", "épice"
    ],
    "Boissons": [
      "eau", "jus", "soda", "coca", "thé", "café", "vin", "bière"
    ]
  };

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    for (const keyword of keywords) {
      // Recherche avec frontières de mots pour éviter les faux positifs
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');

      if (regex.test(lowerName)) {
        return category;
      }
    }
  }
  return "Autres";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId, listId, ingredientName, ingredientNames, category } = body;

    if (!planId && !listId) {
      return NextResponse.json(
        { error: "Paramètres manquants (planId ou listId requis)" },
        { status: 400 }
      );
    }

    // Supporter un seul ingrédient ou un tableau
    let ingredients: Array<{ name: string; category: string }> = [];

    if (ingredientNames && Array.isArray(ingredientNames)) {
      // Tableau d'ingrédients avec catégories auto-détectées
      ingredients = ingredientNames
        .map((name: string) => name.trim())
        .filter((name: string) => name.length > 0)
        .map((name: string) => ({
          name,
          category: categorizeIngredient(name),
        }));
    } else if (ingredientName) {
      // Un seul ingrédient
      ingredients = [{
        name: ingredientName.trim(),
        category: category || categorizeIngredient(ingredientName.trim()),
      }];
    }

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "Aucun ingrédient fourni" },
        { status: 400 }
      );
    }

    const userName = session.user.pseudo || session.user.name || "Anonyme";

    // ========== CAS 1: Liste liée à un menu (planId) ==========
    if (planId) {
      const planIdNum = parseInt(planId);

      // Vérifier que l'utilisateur a accès au plan
      const plan = await db.weeklyMealPlan.findUnique({
        where: { id: planIdNum },
        include: { contributors: true },
      });

      if (!plan) {
        return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
      }

      const isOwner = plan.userId === session.user.id;
      const isContributor = plan.contributors.some(
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      // Filtrer les ingrédients qui existent déjà
      const existingItems = await db.shoppingListItem.findMany({
        where: {
          weeklyMealPlanId: planIdNum,
          ingredientName: { in: ingredients.map(i => i.name) },
        },
        select: { ingredientName: true },
      });

      const existingNames = new Set(existingItems.map(i => i.ingredientName.toLowerCase()));
      const newIngredients = ingredients.filter(i => !existingNames.has(i.name.toLowerCase()));

      if (newIngredients.length === 0) {
        return NextResponse.json(
          { error: ingredients.length === 1 ? "Cet article existe déjà dans la liste" : "Tous les articles existent déjà" },
          { status: 409 }
        );
      }

      // Créer tous les items en batch
      const createdItems = await Promise.all(
        newIngredients.map(async (ing) => {
          return db.shoppingListItem.create({
            data: {
              weeklyMealPlanId: planIdNum,
              ingredientName: ing.name,
              category: ing.category,
              isChecked: false,
              isManuallyAdded: false, // false car vient des recettes, pas ajouté manuellement
            },
            include: {
              checkedByUser: {
                select: { id: true, pseudo: true, name: true },
              },
            },
          });
        })
      );

      // Broadcaster chaque ajout
      for (const item of createdItems) {
        broadcastToClients(planIdNum, {
          type: "item_added",
          item,
          userName,
          userId: session.user.id,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        items: createdItems,
        addedCount: createdItems.length,
        skippedCount: ingredients.length - newIngredients.length,
        userName,
      });
    }

    // ========== CAS 2: Liste indépendante (listId) ==========
    if (listId) {
      const listIdNum = parseInt(listId);

      const list = await db.shoppingList.findUnique({
        where: { id: listIdNum },
        include: { contributors: true },
      });

      if (!list) {
        return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
      }

      const isOwner = list.userId === session.user.id;
      const isContributor = list.contributors.some(
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      // Filtrer les ingrédients qui existent déjà
      const existingItems = await db.standaloneShoppingItem.findMany({
        where: {
          shoppingListId: listIdNum,
          name: { in: ingredients.map(i => i.name) },
        },
        select: { name: true },
      });

      const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()));
      const newIngredients = ingredients.filter(i => !existingNames.has(i.name.toLowerCase()));

      // Si tous les ingrédients existent déjà, retourner un succès au lieu d'une erreur
      if (newIngredients.length === 0) {
        return NextResponse.json(
          {
            message: "Tous les articles sont déjà dans la liste",
            addedCount: 0,
            existingCount: ingredients.length
          },
          { status: 200 }
        );
      }

      // Créer tous les items en batch
      const createdItems = await Promise.all(
        newIngredients.map(async (ing) => {
          const standaloneItem = await db.standaloneShoppingItem.create({
            data: {
              shoppingListId: listIdNum,
              name: ing.name,
              category: ing.category,
              isChecked: false,
            },
            include: {
              checkedByUser: {
                select: { id: true, pseudo: true, name: true },
              },
            },
          });

          // Mapper vers le format ShoppingListItem
          return {
            id: standaloneItem.id,
            ingredientName: standaloneItem.name,
            category: standaloneItem.category,
            isChecked: standaloneItem.isChecked,
            isManuallyAdded: true,
            checkedAt: standaloneItem.checkedAt,
            checkedByUserId: standaloneItem.checkedByUserId,
            checkedByUser: standaloneItem.checkedByUser,
          };
        })
      );

      // Broadcaster chaque ajout
      for (const item of createdItems) {
        broadcastToClients(listIdNum, {
          type: "item_added",
          item,
          userName,
          userId: session.user.id,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        items: createdItems,
        addedCount: createdItems.length,
        skippedCount: ingredients.length - newIngredients.length,
        userName,
      });
    }

    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
