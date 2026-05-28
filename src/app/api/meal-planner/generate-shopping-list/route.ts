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

// Helper pour formater le temps en "Xmin Ys"
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }
  return `${seconds}s`;
}

// Helper pour extraire les ingrédients proprement des repas
function extractIngredientsFromMeals(meals: any[]): string[] {
  const allIngredients: string[] = [];
  let skippedCount = 0;
  const skippedReasons: Record<string, number> = {};

  // Liste des noms de groupes/catégories à ignorer (pas des vrais ingrédients)
  const groupNamesToIgnore = new Set([
    // Noms de sections génériques
    'pâte', 'garniture', 'assaisonnements', 'assaisonnement', 'légumineuses',
    'légumes & aromates', 'légumes', 'épices & liquides', 'épices', 'liquides',
    'base', 'toppings & assaisonnement', 'toppings', 'poisson', 'sauce',
    'accompagnement', 'viande', 'viandes', 'protéines', 'autres', 'divers',
    'ingrédients', 'pour la sauce', 'pour la garniture', 'pour la pâte',
    'aromates', 'herbes', 'condiments',
    // Noms de repas/plats
    'additions', 'pour servir', 'smoothie', 'tartines', 'oeufs pochés',
    'œufs pochés', 'finition', 'préparation', 'cuisson', 'montage',
    'pour le service', 'pour finir', 'décoration', 'topping',
    'marinade', 'pour la marinade', 'bouillon', 'pour le bouillon',
    'vinaigrette', 'pour la vinaigrette', 'crème', 'pour la crème'
  ]);

  const logSkip = (reason: string, value?: any) => {
    skippedCount++;
    skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
    if (skippedCount <= 10) { // Log les 10 premiers skips pour debug
      console.log(`⏭️ [Extract] Skip (${reason}):`, typeof value === 'string' ? value.substring(0, 50) : value);
    }
  };

  meals.forEach((meal, mealIndex) => {
    if (!meal.ingredients) {
      console.log(`⚠️ [Extract] Meal ${mealIndex} (${meal.name}) has no ingredients`);
      return;
    }

    if (!Array.isArray(meal.ingredients)) {
      console.log(`⚠️ [Extract] Meal ${mealIndex} (${meal.name}) ingredients is not an array:`, typeof meal.ingredients);
      return;
    }

    meal.ingredients.forEach((ing: any) => {
      // Ignorer les valeurs nulles, undefined
      if (ing === null) {
        logSkip('null', null);
        return;
      }
      if (ing === undefined) {
        logSkip('undefined', undefined);
        return;
      }

      let ingredientStr: string | null = null;

      // Si c'est un objet
      if (typeof ing === 'object' && ing !== null) {
        // IMPORTANT: D'abord vérifier si c'est un groupe d'ingrédients avec items
        // (un groupe a souvent name + items, il faut prendre les items pas le name)
        if (ing.items && Array.isArray(ing.items)) {
          // C'est un groupe - extraire les items
          console.log(`📦 [Extract] Groupe trouvé: "${ing.name || 'sans nom'}" avec ${ing.items.length} items`);
          ing.items.forEach((item: any) => {
            if (typeof item === 'string' && item.trim()) {
              const trimmed = item.trim();
              // Vérifier que ce n'est pas un nom de groupe
              if (!groupNamesToIgnore.has(trimmed.toLowerCase())) {
                allIngredients.push(trimmed);
              } else {
                logSkip('group-name-in-items', trimmed);
              }
            } else if (typeof item === 'object' && item?.name) {
              const trimmed = item.name.trim();
              if (!groupNamesToIgnore.has(trimmed.toLowerCase())) {
                allIngredients.push(trimmed);
              } else {
                logSkip('group-name-in-items', trimmed);
              }
            }
          });
          return; // On a traité les items, on passe au suivant
        }
        // Objet avec propriété name (sans items) - c'est un ingrédient simple
        else if (ing.name && typeof ing.name === 'string') {
          ingredientStr = ing.name.trim();
        }
        // Essayer de convertir en string si possible
        else {
          const str = String(ing);
          if (str && str !== '[object Object]' && str !== 'undefined' && str !== 'null') {
            ingredientStr = str.trim();
          } else {
            logSkip('object-no-name', ing);
            return;
          }
        }
      }
      // Si c'est une chaîne
      else if (typeof ing === 'string') {
        ingredientStr = ing.trim();
      }
      // Si c'est un nombre (rare mais possible)
      else if (typeof ing === 'number') {
        ingredientStr = String(ing);
      }
      // Autre type non supporté
      else {
        logSkip('unsupported-type', typeof ing);
        return;
      }

      // Vérifier que la chaîne est valide
      if (!ingredientStr) {
        logSkip('empty-string', '');
        return;
      }

      if (ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') {
        logSkip('invalid-string-value', ingredientStr);
        return;
      }

      // Vérifier que ce n'est pas un nom de groupe/catégorie
      if (groupNamesToIgnore.has(ingredientStr.toLowerCase())) {
        logSkip('group-name', ingredientStr);
        return;
      }

      allIngredients.push(ingredientStr);
    });
  });

  // Log du résumé des skips
  if (skippedCount > 0) {
    console.log(`⚠️ [Extract] ${skippedCount} ingrédients ignorés:`);
    Object.entries(skippedReasons).forEach(([reason, count]) => {
      console.log(`   - ${reason}: ${count}`);
    });
  }

  console.log(`✅ [Extract] ${allIngredients.length} ingrédients extraits de ${meals.length} repas`);

  return allIngredients;
}

// Helper pour compter le nombre total d'items dans une liste de courses
function countShoppingListItems(shoppingList: Record<string, string[]>): number {
  let count = 0;
  Object.values(shoppingList).forEach(items => {
    if (Array.isArray(items)) {
      count += items.length;
    }
  });
  return count;
}

export async function POST(request: Request) {
  const startTime = Date.now();

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

    const body = await request.json();
    const { planId } = body;

    console.log(`🛒 [Optimisation Liste] Démarrage pour planId: ${planId}`);

    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      include: { meals: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 });
    }

    // Extraire tous les ingrédients avec la fonction améliorée
    const allIngredients = extractIngredientsFromMeals(plan.meals);

    if (allIngredients.length === 0) {
      return NextResponse.json({
        error: "Aucun ingrédient à traiter",
        shoppingList: {},
        stats: { originalCount: 0, optimizedCount: 0 }
      });
    }

    console.log(`📝 [Optimisation Liste] ${allIngredients.length} ingrédients valides à traiter`);

    // Formater les ingrédients avec un tiret (sans numéro pour éviter confusion avec quantités)
    const formattedIngredients = allIngredients.map((ing) => `- ${ing}`).join('\n');

    // Prompt très strict et détaillé
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

    console.log(`🤖 [Optimisation Liste] Appel OpenAI avec ${allIngredients.length} ingrédients...`);

    // Log du prompt complet pour debug
    console.log(`\n========== PROMPT ENVOYÉ À CHATGPT (${prompt.length} chars, ${allIngredients.length} ingrédients) ==========`);
    console.log(prompt);
    console.log(`========== FIN DU PROMPT ==========\n`);

    const apiStartTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
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

    const apiTime = Date.now() - apiStartTime;
    const content = completion.choices[0]?.message?.content;

    console.log(`📥 [Optimisation Liste] Réponse en ${formatDuration(apiTime)}, ${content?.length || 0} chars`);

    if (!content) {
      throw new Error("Pas de réponse de ChatGPT");
    }

    const result = parseGPTJson(content);

    if (!result || !result.shoppingList) {
      console.error(`❌ [Optimisation Liste] Résultat invalide:`, content.substring(0, 300));
      throw new Error("Réponse ChatGPT invalide - shoppingList manquant");
    }

    // Compter le nombre d'items optimisés
    const optimizedCount = countShoppingListItems(result.shoppingList);

    // Validation: le nombre d'items optimisés ne devrait pas être trop différent du nombre d'ingrédients
    // (il peut être plus petit car on consolide, mais pas trop petit)
    const minExpectedItems = Math.floor(allIngredients.length * 0.3); // Au moins 30% des items originaux
    if (optimizedCount < minExpectedItems) {
      console.warn(`⚠️ [Optimisation Liste] Nombre d'items optimisés (${optimizedCount}) est très inférieur aux ingrédients originaux (${allIngredients.length}). Possible perte de données.`);
    }

    // Log détaillé pour debug
    console.log(`📋 [Optimisation Liste] Résultat par catégorie:`);
    Object.entries(result.shoppingList).forEach(([category, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        console.log(`   ${category}: ${items.length} items`);
      }
    });

    // ============================================================
    // CRÉER LES ShoppingListItem EN DB (source unique de vérité)
    // ============================================================
    console.log(`💾 [Optimisation Liste] Synchronisation avec la base de données...`);

    // 1. Récupérer les items existants pour conserver leur état isChecked
    const existingItems = await db.shoppingListItem.findMany({
      where: { weeklyMealPlanId: planId },
      select: { ingredientName: true, category: true, isChecked: true, checkedByUserId: true, checkedAt: true, isManuallyAdded: true }
    });

    // Créer un map pour retrouver rapidement l'état des items existants
    const existingItemsMap = new Map<string, typeof existingItems[0]>();
    existingItems.forEach(item => {
      // Clé normalisée (lowercase) pour la comparaison
      const key = `${item.ingredientName.toLowerCase()}|${item.category}`;
      existingItemsMap.set(key, item);
    });

    // 2. Supprimer tous les anciens items NON manuellement ajoutés
    await db.shoppingListItem.deleteMany({
      where: {
        weeklyMealPlanId: planId,
        isManuallyAdded: false // Garder les items ajoutés manuellement par l'utilisateur
      }
    });

    // 3. Préparer les nouveaux items à créer
    const itemsToCreate: Array<{
      ingredientName: string;
      category: string;
      isChecked: boolean;
      checkedAt: Date | null;
      checkedByUserId: string | null;
      isManuallyAdded: boolean;
      weeklyMealPlanId: number;
    }> = [];

    Object.entries(result.shoppingList).forEach(([category, items]) => {
      if (!Array.isArray(items)) return;

      items.forEach((itemName: string) => {
        if (!itemName || typeof itemName !== 'string') return;

        const trimmedName = itemName.trim();
        if (!trimmedName) return;

        // Chercher si cet item existait déjà (pour conserver isChecked)
        const key = `${trimmedName.toLowerCase()}|${category}`;
        const existingItem = existingItemsMap.get(key);

        itemsToCreate.push({
          ingredientName: trimmedName,
          category: category,
          isChecked: existingItem?.isChecked || false,
          checkedAt: existingItem?.checkedAt || null,
          checkedByUserId: existingItem?.checkedByUserId || null,
          isManuallyAdded: false,
          weeklyMealPlanId: planId
        });
      });
    });

    // 4. Créer tous les nouveaux items en batch
    if (itemsToCreate.length > 0) {
      await db.shoppingListItem.createMany({
        data: itemsToCreate,
        skipDuplicates: true // Éviter les erreurs si un item existe déjà
      });
    }

    // Note: optimizedShoppingList n'est plus utilisé, les ShoppingListItem sont la source unique de vérité

    // Compter les items manuels qui ont été conservés
    const manualItemsCount = await db.shoppingListItem.count({
      where: { weeklyMealPlanId: planId, isManuallyAdded: true }
    });

    const totalDbItems = itemsToCreate.length + manualItemsCount;
    console.log(`✅ [Optimisation Liste] ${itemsToCreate.length} items créés en DB + ${manualItemsCount} items manuels conservés = ${totalDbItems} total`);

    // ============================================================
    // BROADCASTER les nouveaux items via SSE pour mise à jour temps réel
    // ============================================================

    // Récupérer tous les items actuels (optimisés + manuels) pour les envoyer au frontend
    const allCurrentItems = await db.shoppingListItem.findMany({
      where: { weeklyMealPlanId: planId },
      include: {
        checkedByUser: {
          select: {
            id: true,
            pseudo: true,
            name: true,
          }
        }
      }
    });

    // Mapper les items au format attendu par le frontend
    const mappedItems = allCurrentItems.map(item => ({
      id: item.id,
      ingredientName: item.ingredientName,
      category: item.category,
      isChecked: item.isChecked,
      isManuallyAdded: item.isManuallyAdded,
      checkedAt: item.checkedAt,
      checkedByUserId: item.checkedByUserId,
      checkedByUser: item.checkedByUser ? {
        pseudo: item.checkedByUser.pseudo,
        name: item.checkedByUser.name,
      } : null,
    }));

    // Broadcaster un événement "initial" pour remplacer tous les items du frontend
    console.log(`📡 [Optimisation Liste] Broadcast de ${mappedItems.length} items via SSE`);
    broadcastToClients(planId, {
      type: "initial",
      items: mappedItems,
      timestamp: new Date().toISOString(),
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ [Optimisation Liste] Terminée en ${formatDuration(elapsedTime)}`);
    console.log(`📊 [Optimisation Liste] ${allIngredients.length} ingrédients bruts → ${optimizedCount} articles optimisés`);

    // Logger l'activité
    await logActivity({
      userId: session.user.id,
      action: ActivityAction.MEAL_PLAN_OPTIMIZE,
      entityType: EntityType.MEAL_PLAN,
      entityId: planId.toString(),
      entityName: plan.name,
      details: {
        originalCount: allIngredients.length,
        optimizedCount: optimizedCount,
        duration: elapsedTime,
      },
    });

    return NextResponse.json({
      ...result,
      stats: {
        originalCount: allIngredients.length,
        optimizedCount: optimizedCount,
        dbItemsCreated: itemsToCreate.length,
        manualItemsKept: manualItemsCount,
        duration: elapsedTime
      }
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ [Optimisation Liste] Échec après ${formatDuration(elapsedTime)}:`, error);

    let errorMessage = "Erreur inconnue";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";

      if ('response' in error) {
        const openAIError = error as Error & { type?: string; code?: string; status?: number };
        errorDetails = JSON.stringify({
          message: openAIError.message,
          type: openAIError.type,
          code: openAIError.code,
          status: openAIError.status,
        }, null, 2);
      }
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la génération de la liste de courses",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

