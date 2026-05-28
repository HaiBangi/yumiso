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

// Helper pour extraire les ingrÃ©dients proprement des repas
function extractIngredientsFromMeals(meals: any[]): string[] {
  const allIngredients: string[] = [];
  let skippedCount = 0;
  const skippedReasons: Record<string, number> = {};

  // Liste des noms de groupes/catÃ©gories Ã  ignorer (pas des vrais ingrÃ©dients)
  const groupNamesToIgnore = new Set([
    // Noms de sections gÃ©nÃ©riques
    'pÃ¢te', 'garniture', 'assaisonnements', 'assaisonnement', 'lÃ©gumineuses',
    'lÃ©gumes & aromates', 'lÃ©gumes', 'Ã©pices & liquides', 'Ã©pices', 'liquides',
    'base', 'toppings & assaisonnement', 'toppings', 'poisson', 'sauce',
    'accompagnement', 'viande', 'viandes', 'protÃ©ines', 'autres', 'divers',
    'ingrÃ©dients', 'pour la sauce', 'pour la garniture', 'pour la pÃ¢te',
    'aromates', 'herbes', 'condiments',
    // Noms de repas/plats
    'additions', 'pour servir', 'smoothie', 'tartines', 'oeufs pochÃ©s',
    'Å“ufs pochÃ©s', 'finition', 'prÃ©paration', 'cuisson', 'montage',
    'pour le service', 'pour finir', 'dÃ©coration', 'topping',
    'marinade', 'pour la marinade', 'bouillon', 'pour le bouillon',
    'vinaigrette', 'pour la vinaigrette', 'crÃ¨me', 'pour la crÃ¨me'
  ]);

  const logSkip = (reason: string, value?: any) => {
    skippedCount++;
    skippedReasons[reason] = (skippedReasons[reason] || 0) + 1;
    if (skippedCount <= 10) { // Log les 10 premiers skips pour debug
      console.log(`â­ï¸ [Extract] Skip (${reason}):`, typeof value === 'string' ? value.substring(0, 50) : value);
    }
  };

  meals.forEach((meal, mealIndex) => {
    if (!meal.ingredients) {
      console.log(`âš ï¸ [Extract] Meal ${mealIndex} (${meal.name}) has no ingredients`);
      return;
    }

    if (!Array.isArray(meal.ingredients)) {
      console.log(`âš ï¸ [Extract] Meal ${mealIndex} (${meal.name}) ingredients is not an array:`, typeof meal.ingredients);
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
        // IMPORTANT: D'abord vÃ©rifier si c'est un groupe d'ingrÃ©dients avec items
        // (un groupe a souvent name + items, il faut prendre les items pas le name)
        if (ing.items && Array.isArray(ing.items)) {
          // C'est un groupe - extraire les items
          console.log(`ðŸ“¦ [Extract] Groupe trouvÃ©: "${ing.name || 'sans nom'}" avec ${ing.items.length} items`);
          ing.items.forEach((item: any) => {
            if (typeof item === 'string' && item.trim()) {
              const trimmed = item.trim();
              // VÃ©rifier que ce n'est pas un nom de groupe
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
          return; // On a traitÃ© les items, on passe au suivant
        }
        // Objet avec propriÃ©tÃ© name (sans items) - c'est un ingrÃ©dient simple
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
      // Si c'est une chaÃ®ne
      else if (typeof ing === 'string') {
        ingredientStr = ing.trim();
      }
      // Si c'est un nombre (rare mais possible)
      else if (typeof ing === 'number') {
        ingredientStr = String(ing);
      }
      // Autre type non supportÃ©
      else {
        logSkip('unsupported-type', typeof ing);
        return;
      }

      // VÃ©rifier que la chaÃ®ne est valide
      if (!ingredientStr) {
        logSkip('empty-string', '');
        return;
      }

      if (ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') {
        logSkip('invalid-string-value', ingredientStr);
        return;
      }

      // VÃ©rifier que ce n'est pas un nom de groupe/catÃ©gorie
      if (groupNamesToIgnore.has(ingredientStr.toLowerCase())) {
        logSkip('group-name', ingredientStr);
        return;
      }

      allIngredients.push(ingredientStr);
    });
  });

  // Log du rÃ©sumÃ© des skips
  if (skippedCount > 0) {
    console.log(`âš ï¸ [Extract] ${skippedCount} ingrÃ©dients ignorÃ©s:`);
    Object.entries(skippedReasons).forEach(([reason, count]) => {
      console.log(`   - ${reason}: ${count}`);
    });
  }

  console.log(`âœ… [Extract] ${allIngredients.length} ingrÃ©dients extraits de ${meals.length} repas`);

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
      return NextResponse.json({ error: "Non authentifiÃ©" }, { status: 401 });
    }

    // VÃ©rifier que l'utilisateur est Premium
    const { isPremium } = await checkUserPremium(session.user.id);
    if (!isPremium) {
      return NextResponse.json(
        { error: "Cette fonctionnalitÃ© nÃ©cessite un abonnement Premium" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId } = body;

    console.log(`ðŸ›’ [Optimisation Liste] DÃ©marrage pour planId: ${planId}`);

    const plan = await db.weeklyMealPlan.findUnique({
      where: { id: planId },
      include: { meals: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan non trouvÃ©" }, { status: 404 });
    }

    // Extraire tous les ingrÃ©dients avec la fonction amÃ©liorÃ©e
    const allIngredients = extractIngredientsFromMeals(plan.meals);

    if (allIngredients.length === 0) {
      return NextResponse.json({
        error: "Aucun ingrÃ©dient Ã  traiter",
        shoppingList: {},
        stats: { originalCount: 0, optimizedCount: 0 }
      });
    }

    console.log(`ðŸ“ [Optimisation Liste] ${allIngredients.length} ingrÃ©dients valides Ã  traiter`);

    // Formater les ingrÃ©dients avec un tiret (sans numÃ©ro pour Ã©viter confusion avec quantitÃ©s)
    const formattedIngredients = allIngredients.map((ing) => `- ${ing}`).join('\n');

    // Prompt trÃ¨s strict et dÃ©taillÃ©
    const prompt = `Tu es un assistant qui consolide une liste de courses. Tu dois UNIQUEMENT regrouper et additionner les ingrÃ©dients fournis.

## LISTE DES INGRÃ‰DIENTS Ã€ TRAITER (${allIngredients.length} items):
${formattedIngredients}

## RÃˆGLES STRICTES:
1. **NE PAS INVENTER** d'ingrÃ©dients qui ne sont pas dans la liste ci-dessus
2. **NE PAS SUPPRIMER** d'ingrÃ©dients - tous doivent apparaÃ®tre dans le rÃ©sultat
3. **ADDITIONNER** les quantitÃ©s du mÃªme ingrÃ©dient (ex: "2 oeufs" + "4 Å“ufs" = "Oeufs (6)", "2.5 c.a.s sauce poisson" + "1.5 c.a.s sauce poisson" + "4 c.a.s sauce poisson" = "8 c.a.s sauce poisson")
3.5. IL NE FAUT AUCUN INGREDIENT EN DOUBLE, il faut que tout soit additionnÃ© et consolidÃ©. Par exemple je ne veux pas voir Ail (3 gousses), Ail et Ail (5 gousses d'ail).
4. **CONVERTIR** les unitÃ©s similaires (c.Ã .s = cuillÃ¨re Ã  soupe, c.Ã .c = cuillÃ¨re Ã  cafÃ©)
5. **GARDER** les ingrÃ©dients uniques tels quels avec leur quantitÃ©
6. **FORMAT**: "Nom de l'ingrÃ©dient (quantitÃ© totale)" ou juste "Nom" si pas de quantitÃ©

## CATÃ‰GORIES (utiliser exactement ces noms):
- "Fruits & LÃ©gumes": lÃ©gumes, fruits, herbes fraÃ®ches (basilic, coriandre, menthe, persil), ail, oignon, tomate, carotte, etc.
- "Viandes & Poissons": viandes, volailles, poissons, fruits de mer, charcuterie
- "Produits Laitiers": lait, fromage, yaourt, crÃ¨me, beurre, Å“ufs
- "Pain & Boulangerie": pain, baguette, brioche, tortillas, pita
- "Ã‰picerie": pÃ¢tes, riz, farine, sucre, sel, conserves, lÃ©gumineuses, nouilles, vermicelles
- "Condiments & Sauces": sauces (soja, huÃ®tre, poisson), huiles, vinaigres, Ã©pices, moutarde, bouillon
- "SurgelÃ©s": produits surgelÃ©s
- "Snacks & SucrÃ©": biscuits, chocolat, confiture, miel
- "Boissons": eau, jus, vin, alcool
- "Autres": ce qui ne rentre pas ailleurs

## EXEMPLES DE CONSOLIDATION:
- "4 Å“ufs" + "2 Å“ufs" + "3 oeufs" â†’ "Å’ufs (9)"
- "5 Gousses d'ail" + "3 Gousses d'ail" + "2 gousses d'ail" â†’ "Ail (10 gousses)"
- "2 Ã©chalote hachÃ©" + "2 Ã©chalote" + "2 Echalotes" â†’ "Ã‰chalotes (6)"
- "2 c.Ã .s sauce soja" + "1 c. Ã  soupe Sauce soja claire" â†’ "Sauce soja (3 c.Ã .s)"
- "riz jasmin 120g" seul â†’ "Riz jasmin (120 g)"

Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{"shoppingList":{"Fruits & LÃ©gumes":[],"Viandes & Poissons":[],"Produits Laitiers":[],"Pain & Boulangerie":[],"Ã‰picerie":[],"Condiments & Sauces":[],"SurgelÃ©s":[],"Snacks & SucrÃ©":[],"Boissons":[],"Autres":[]}}`;

    console.log(`ðŸ¤– [Optimisation Liste] Appel OpenAI avec ${allIngredients.length} ingrÃ©dients...`);

    // Log du prompt complet pour debug
    console.log(`\n========== PROMPT ENVOYÃ‰ Ã€ CHATGPT (${prompt.length} chars, ${allIngredients.length} ingrÃ©dients) ==========`);
    console.log(prompt);
    console.log(`========== FIN DU PROMPT ==========\n`);

    const apiStartTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant de courses qui consolide des listes d'ingrÃ©dients.
RÃˆGLES ABSOLUES:
- Tu ne dois JAMAIS inventer d'ingrÃ©dients
- Tu ne dois JAMAIS supprimer d'ingrÃ©dients
- Tu dois additionner les quantitÃ©s du mÃªme ingrÃ©dient et convertir les unitÃ©s similaires
- Tu retournes UNIQUEMENT du JSON valide, sans commentaires ni explications`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1, // TempÃ©rature standard
      max_completion_tokens: 20000, // Plus de tokens pour une liste complÃ¨te
    });

    const apiTime = Date.now() - apiStartTime;
    const content = completion.choices[0]?.message?.content;

    console.log(`ðŸ“¥ [Optimisation Liste] RÃ©ponse en ${formatDuration(apiTime)}, ${content?.length || 0} chars`);

    if (!content) {
      throw new Error("Pas de rÃ©ponse de ChatGPT");
    }

    const result = parseGPTJson(content);

    if (!result || !result.shoppingList) {
      console.error(`âŒ [Optimisation Liste] RÃ©sultat invalide:`, content.substring(0, 300));
      throw new Error("RÃ©ponse ChatGPT invalide - shoppingList manquant");
    }

    // Compter le nombre d'items optimisÃ©s
    const optimizedCount = countShoppingListItems(result.shoppingList);

    // Validation: le nombre d'items optimisÃ©s ne devrait pas Ãªtre trop diffÃ©rent du nombre d'ingrÃ©dients
    // (il peut Ãªtre plus petit car on consolide, mais pas trop petit)
    const minExpectedItems = Math.floor(allIngredients.length * 0.3); // Au moins 30% des items originaux
    if (optimizedCount < minExpectedItems) {
      console.warn(`âš ï¸ [Optimisation Liste] Nombre d'items optimisÃ©s (${optimizedCount}) est trÃ¨s infÃ©rieur aux ingrÃ©dients originaux (${allIngredients.length}). Possible perte de donnÃ©es.`);
    }

    // Log dÃ©taillÃ© pour debug
    console.log(`ðŸ“‹ [Optimisation Liste] RÃ©sultat par catÃ©gorie:`);
    Object.entries(result.shoppingList).forEach(([category, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        console.log(`   ${category}: ${items.length} items`);
      }
    });

    // ============================================================
    // CRÃ‰ER LES ShoppingListItem EN DB (source unique de vÃ©ritÃ©)
    // ============================================================
    console.log(`ðŸ’¾ [Optimisation Liste] Synchronisation avec la base de donnÃ©es...`);

    // 1. RÃ©cupÃ©rer les items existants pour conserver leur Ã©tat isChecked
    const existingItems = await db.shoppingListItem.findMany({
      where: { weeklyMealPlanId: planId },
      select: { ingredientName: true, category: true, isChecked: true, checkedByUserId: true, checkedAt: true, isManuallyAdded: true }
    });

    // CrÃ©er un map pour retrouver rapidement l'Ã©tat des items existants
    const existingItemsMap = new Map<string, typeof existingItems[0]>();
    existingItems.forEach(item => {
      // ClÃ© normalisÃ©e (lowercase) pour la comparaison
      const key = `${item.ingredientName.toLowerCase()}|${item.category}`;
      existingItemsMap.set(key, item);
    });

    // 2. Supprimer tous les anciens items NON manuellement ajoutÃ©s
    await db.shoppingListItem.deleteMany({
      where: {
        weeklyMealPlanId: planId,
        isManuallyAdded: false // Garder les items ajoutÃ©s manuellement par l'utilisateur
      }
    });

    // 3. PrÃ©parer les nouveaux items Ã  crÃ©er
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

        // Chercher si cet item existait dÃ©jÃ  (pour conserver isChecked)
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

    // 4. CrÃ©er tous les nouveaux items en batch
    if (itemsToCreate.length > 0) {
      await db.shoppingListItem.createMany({
        data: itemsToCreate,
        skipDuplicates: true // Ã‰viter les erreurs si un item existe dÃ©jÃ 
      });
    }

    // Note: optimizedShoppingList n'est plus utilisÃ©, les ShoppingListItem sont la source unique de vÃ©ritÃ©

    // Compter les items manuels qui ont Ã©tÃ© conservÃ©s
    const manualItemsCount = await db.shoppingListItem.count({
      where: { weeklyMealPlanId: planId, isManuallyAdded: true }
    });

    const totalDbItems = itemsToCreate.length + manualItemsCount;
    console.log(`âœ… [Optimisation Liste] ${itemsToCreate.length} items crÃ©Ã©s en DB + ${manualItemsCount} items manuels conservÃ©s = ${totalDbItems} total`);

    // ============================================================
    // BROADCASTER les nouveaux items via SSE pour mise Ã  jour temps rÃ©el
    // ============================================================

    // RÃ©cupÃ©rer tous les items actuels (optimisÃ©s + manuels) pour les envoyer au frontend
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

    // Broadcaster un Ã©vÃ©nement "initial" pour remplacer tous les items du frontend
    console.log(`ðŸ“¡ [Optimisation Liste] Broadcast de ${mappedItems.length} items via SSE`);
    broadcastToClients(planId, {
      type: "initial",
      items: mappedItems,
      timestamp: new Date().toISOString(),
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`âœ… [Optimisation Liste] TerminÃ©e en ${formatDuration(elapsedTime)}`);
    console.log(`ðŸ“Š [Optimisation Liste] ${allIngredients.length} ingrÃ©dients bruts â†’ ${optimizedCount} articles optimisÃ©s`);

    // Logger l'activitÃ©
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
    console.error(`âŒ [Optimisation Liste] Ã‰chec aprÃ¨s ${formatDuration(elapsedTime)}:`, error);

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
        error: "Erreur lors de la gÃ©nÃ©ration de la liste de courses",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

