import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";
import { broadcastToClients } from "@/lib/sse-clients";
import { logActivity, ActivityAction, EntityType } from "@/lib/activity-logger";
import { checkUserPremium } from "@/lib/premium";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est Premium
    const { isPremium } = await checkUserPremium(session.user.id);
    if (!isPremium) {
      return NextResponse.json(
        { error: "Cette fonctionnalité nécessite un abonnement Premium" },
        { status: 403 }
      );
    }

    const { listId } = await params;
    const listIdNum = parseInt(listId);

    if (isNaN(listIdNum)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier les droits sur la liste
    const list = await db.shoppingList.findFirst({
      where: {
        id: listIdNum,
        OR: [
          { userId: session.user.id },
          { contributors: { some: { userId: session.user.id, role: { not: "VIEWER" } } } }
        ],
        deletedAt: null,
      },
    });

    if (!list) {
      return NextResponse.json(
        { error: "Liste non trouvée ou accès refusé" },
        { status: 404 }
      );
    }

    console.log(`[Optimize List] Optimisation de la liste #${listIdNum}`);

    // Récupérer tous les items actuels
    const currentItems = await db.standaloneShoppingItem.findMany({
      where: { shoppingListId: listIdNum },
      select: {
        name: true,
        quantity: true,
        category: true,
      },
    });

    if (currentItems.length === 0) {
      return NextResponse.json(
        { error: "La liste est vide, rien à optimiser" },
        { status: 400 }
      );
    }

    console.log(`[Optimize List] ${currentItems.length} items à optimiser`);

    // Formater les items comme des ingrédients simples
    const allIngredients = currentItems.map(item => {
      const quantity = item.quantity ? ` ${item.quantity}` : '';
      return `${item.name}${quantity}`;
    });

    // Formater avec un tiret (comme dans meal-planner)
    const formattedIngredients = allIngredients.map((ing) => `- ${ing}`).join('\n');

    // EXACTEMENT le même prompt que meal-planner/generate-shopping-list
    const prompt = `Tu es un assistant qui consolide une liste de courses. Tu dois UNIQUEMENT regrouper et additionner les ingrédients fournis.

## LISTE DES INGRÉDIENTS À TRAITER (${allIngredients.length} items):
${formattedIngredients}

## RÈGLES STRICTES:
1. **NE PAS INVENTER** d'ingrédients qui ne sont pas dans la liste ci-dessus
2. **NE PAS SUPPRIMER** d'ingrédients - tous doivent apparaître dans le résultat
3. **ADDITIONNER** les quantités du même ingrédient (ex: "2 oeufs" + "4 œufs" = "Oeufs (6)", "2.5 c.a.s sauce poisson" + "1.5 c.a.s sauce poisson" + "4 c.a.s sauce poisson" = "8 c.a.s sauce poisson")
3.5. IL NE FAUT AUCUN INGREDIENT EN DOUBLE, il faut que tout soit additionné et consolidé. Par exemple je ne veux pas voir Ail (3 gousses), Ail et Ail (5 gousses d'ail).
4. **CONVERTIR** les unités similaires (c.à.s = cuillère à soupe, c.à.c = cuillère à café)
5. **GARDER** les ingrédients uniques tels quels avec leur quantité
6. **FORMAT**: "Nom de l'ingrédient (quantité totale)" ou juste "Nom" si pas de quantité

## CATÉGORIES (utiliser exactement ces noms):
- "Fruits & Légumes": légumes, fruits, herbes fraîches (basilic, coriandre, menthe, persil), ail, oignon, tomate, carotte, etc.
- "Viandes & Poissons": viandes, volailles, poissons, fruits de mer, charcuterie
- "Produits Laitiers": lait, fromage, yaourt, crème, beurre, œufs
- "Pain & Boulangerie": pain, baguette, brioche, tortillas, pita
- "Épicerie": pâtes, riz, farine, sucre, sel, conserves, légumineuses, nouilles, vermicelles
- "Condiments & Sauces": sauces (soja, huître, poisson), huiles, vinaigres, épices, moutarde, bouillon
- "Surgelés": produits surgelés
- "Snacks & Sucré": biscuits, chocolat, confiture, miel
- "Boissons": eau, jus, vin, alcool
- "Autres": ce qui ne rentre pas ailleurs

## EXEMPLES DE CONSOLIDATION:
- "4 œufs" + "2 œufs" + "3 oeufs" → "Œufs (9)"
- "5 Gousses d'ail" + "3 Gousses d'ail" + "2 gousses d'ail" → "Ail (10 gousses)"
- "2 échalote haché" + "2 échalote" + "2 Echalotes" → "Échalotes (6)"
- "2 c.à.s sauce soja" + "1 c. à soupe Sauce soja claire" → "Sauce soja (3 c.à.s)"
- "riz jasmin 120g" seul → "Riz jasmin (120 g)"

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{"shoppingList":{"Fruits & Légumes":[],"Viandes & Poissons":[],"Produits Laitiers":[],"Pain & Boulangerie":[],"Épicerie":[],"Condiments & Sauces":[],"Surgelés":[],"Snacks & Sucré":[],"Boissons":[],"Autres":[]}}`;

    console.log("[Optimize List] Appel à ChatGPT...");
    console.log(`\n========== PROMPT ENVOYÉ À CHATGPT (${prompt.length} chars, ${allIngredients.length} ingrédients) ==========`);
    console.log(prompt);
    console.log(`========== FIN DU PROMPT ==========\n`);

    const startTime = Date.now();

    // EXACTEMENT les mêmes paramètres que meal-planner/generate-shopping-list
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant de courses qui consolide des listes d'ingrédients.
RÈGLES ABSOLUES:
- Tu ne dois JAMAIS inventer d'ingrédients
- Tu ne dois JAMAIS supprimer d'ingrédients
- Tu dois additionner les quantités du même ingrédient et convertir les unités similaires
- Tu retournes UNIQUEMENT du JSON valide, sans commentaires ni explications`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1, // Température standard
      max_completion_tokens: 20000, // Plus de tokens pour une liste complète
    });

    const duration = Date.now() - startTime;
    console.log(`[Optimize List] Réponse reçue en ${Math.round(duration / 1000)}s`);

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    // Parser la réponse JSON (format shoppingList comme meal-planner)
    const parsed = parseGPTJson(response);
    if (!parsed || !parsed.shoppingList || typeof parsed.shoppingList !== 'object') {
      console.error("[Optimize List] Réponse invalide:", response.substring(0, 500));
      throw new Error("Format de réponse invalide");
    }

    // Extraire tous les items de toutes les catégories
    const allOptimizedItems: Array<{ name: string; category: string }> = [];
    Object.entries(parsed.shoppingList).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach((itemName: string) => {
          allOptimizedItems.push({ name: itemName, category });
        });
      }
    });

    console.log(`[Optimize List] ${allOptimizedItems.length} items optimisés`);

    // Supprimer tous les items actuels
    await db.standaloneShoppingItem.deleteMany({
      where: { shoppingListId: listIdNum },
    });

    // Créer les nouveaux items optimisés
    await db.standaloneShoppingItem.createMany({
      data: allOptimizedItems.map((item, index) => ({
        shoppingListId: listIdNum,
        name: item.name,
        quantity: null, // ChatGPT inclut la quantité dans le nom (ex: "Œufs (6)")
        category: item.category,
        isChecked: false,
        isManuallyAdded: false, // false car optimisé par ChatGPT
        order: index,
      })),
    });

    // Récupérer les items créés pour les broadcaster
    const createdItems = await db.standaloneShoppingItem.findMany({
      where: { shoppingListId: listIdNum },
      include: {
        checkedByUser: {
          select: { id: true, pseudo: true, name: true },
        },
      },
      orderBy: { order: "asc" },
    });

    // Mapper vers le format ShoppingListItem
    const mappedItems = createdItems.map(item => ({
      id: item.id,
      ingredientName: item.name,
      category: item.category,
      isChecked: item.isChecked,
      isManuallyAdded: item.isManuallyAdded,
      checkedAt: item.checkedAt,
      checkedByUserId: item.checkedByUserId,
      checkedByUser: item.checkedByUser,
    }));

    console.log(`[Optimize List] ✅ ${createdItems.length} items créés`);

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.SHOPPING_LIST_OPTIMIZE,
      entityType: EntityType.SHOPPING_LIST,
      entityId: listIdNum.toString(),
      entityName: list.name,
      details: {
        originalCount: currentItems.length,
        optimizedCount: createdItems.length,
      },
    });

    // Broadcaster un événement "initial" pour remplacer tous les items du frontend
    broadcastToClients(listIdNum, {
      type: "initial",
      items: mappedItems,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      stats: {
        originalCount: currentItems.length,
        optimizedCount: createdItems.length,
      },
    });
  } catch (error) {
    console.error("[Optimize List] Erreur:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur lors de l'optimisation",
      },
      { status: 500 }
    );
  }
}
