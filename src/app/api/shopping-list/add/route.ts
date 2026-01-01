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
    const { planId, listId, ingredientName, ingredientNames, category, isManuallyAdded = true } = body;

    console.log('[Add Items] 📥 Requête reçue:', {
      planId,
      listId,
      hasIngredientName: !!ingredientName,
      ingredientNamesCount: ingredientNames?.length || 0,
      isManuallyAdded,
    });

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
      console.log('[Add Items] 📦 Ingrédients traités:', ingredients.length);
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

      // Filtrer les ingrédients qui existent déjà (vérifier ingredientName + category)
      const existingItems = await db.shoppingListItem.findMany({
        where: {
          weeklyMealPlanId: planIdNum,
        },
        select: { ingredientName: true, category: true },
      });

      // Créer un Set de clés "ingredientName-category" pour vérifier les doublons
      const existingKeys = new Set(
        existingItems.map(i => `${i.ingredientName.toLowerCase()}-${i.category}`)
      );

      const newIngredients = ingredients.filter(i => {
        const key = `${i.name.toLowerCase()}-${i.category}`;
        return !existingKeys.has(key);
      });

      if (newIngredients.length === 0) {
        return NextResponse.json(
          {
            success: true,
            message: "Tous les articles sont déjà dans la liste",
            addedCount: 0,
            existingCount: ingredients.length,
            items: []
          },
          { status: 200 }
        );
      }

      // Créer tous les items en batch avec gestion d'erreur individuelle
      const createdItems = [];
      const errors = [];

      for (const ing of newIngredients) {
        try {
          const item = await db.shoppingListItem.create({
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

          createdItems.push(item);

          // Broadcaster l'ajout
          broadcastToClients(planIdNum, {
            type: "item_added",
            item,
            userName,
            userId: session.user.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          // Gérer les erreurs de contrainte d'unicité sans faire échouer toute la requête
          if (error?.code === 'P2002') {
            console.log(`[Add Item] Item déjà existant: ${ing.name} (${ing.category})`);
            errors.push({ name: ing.name, reason: 'already_exists' });
          } else {
            console.error(`[Add Item] Erreur création item "${ing.name}":`, error);
            errors.push({ name: ing.name, reason: 'error', error: error.message });
          }
        }
      }

      console.log(`[Add Items] 📊 Résumé: ${createdItems.length} créés, ${errors.length} erreurs`);

      return NextResponse.json({
        success: true,
        items: createdItems,
        addedCount: createdItems.length,
        skippedCount: ingredients.length - newIngredients.length,
        failedCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        userName,
      });
    }

    // ========== CAS 2: Liste indépendante (listId) ==========
    if (listId) {
      const listIdNum = parseInt(listId);
      console.log(`[Add Items] 📋 Liste indépendante ID: ${listIdNum}`);
      console.log(`[Add Items] 📦 ${ingredients.length} ingrédient(s) à ajouter:`, ingredients.map(i => i.name));

      const list = await db.shoppingList.findUnique({
        where: { id: listIdNum },
        include: { contributors: true },
      });

      if (!list) {
        console.log(`[Add Items] ❌ Liste ${listIdNum} non trouvée`);
        return NextResponse.json({ error: "Liste non trouvée" }, { status: 404 });
      }

      const isOwner = list.userId === session.user.id;
      const isContributor = list.contributors.some(
        (c) => c.userId === session.user.id && c.role === "CONTRIBUTOR"
      );

      if (!isOwner && !isContributor) {
        console.log(`[Add Items] ❌ Accès refusé pour user ${session.user.id}`);
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }

      console.log(`[Add Items] ✅ Accès autorisé (owner: ${isOwner}, contributor: ${isContributor})`);

      // Créer tous les items avec gestion d'erreur individuelle
      const createdItems = [];
      const errors = [];

      for (const ing of ingredients) {
        try {
          console.log(`[Add Items] ➕ Création de "${ing.name}" (${ing.category})...`);
          const standaloneItem = await db.standaloneShoppingItem.create({
            data: {
              shoppingListId: listIdNum,
              name: ing.name,
              category: ing.category,
              isChecked: false,
              isManuallyAdded: isManuallyAdded,
            },
            include: {
              checkedByUser: {
                select: { id: true, pseudo: true, name: true },
              },
            },
          });

          // Mapper vers le format ShoppingListItem
          const mappedItem = {
            id: standaloneItem.id,
            ingredientName: standaloneItem.name,
            category: standaloneItem.category,
            isChecked: standaloneItem.isChecked,
            isManuallyAdded: standaloneItem.isManuallyAdded,
            checkedAt: standaloneItem.checkedAt,
            checkedByUserId: standaloneItem.checkedByUserId,
            checkedByUser: standaloneItem.checkedByUser,
          };

          createdItems.push(mappedItem);

          // Broadcaster l'ajout
          broadcastToClients(listIdNum, {
            type: "item_added",
            item: mappedItem,
            userName,
            userId: session.user.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          console.error(`[Add Item] Erreur création item "${ing.name}":`, error);
          errors.push({ name: ing.name, reason: 'error', error: error.message });
        }
      }

      return NextResponse.json({
        success: true,
        items: createdItems,
        addedCount: createdItems.length,
        failedCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        userName,
      });
    }

    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
