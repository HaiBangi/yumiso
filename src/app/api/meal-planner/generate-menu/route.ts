import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseGPTJson } from "@/lib/chatgpt-helpers";

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

const MEAL_TYPE_MAP: Record<string, { time: string; label: string }> = {
  breakfast: { time: "08:00", label: "Petit-dÃ©jeuner" },
  lunch: { time: "12:00", label: "DÃ©jeuner" },
  snack: { time: "16:00", label: "Collation" },
  dinner: { time: "19:00", label: "DÃ®ner" },
};

/**
 * Traduit plusieurs noms de recettes en anglais en une seule requÃªte pour optimiser les appels API
 * @param recipeNames - Tableau des noms de recettes en franÃ§ais
 * @returns Map avec les traductions (clÃ©: nom FR, valeur: nom EN)
 */
async function translateMultipleToEnglish(recipeNames: string[]): Promise<Map<string, string>> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "You are a translator. Translate recipe names from French to English. Reply with a JSON object where keys are the original French names and values are the English translations. Keep translations short and natural for food photography search."
        },
        {
          role: "user",
          content: JSON.stringify(recipeNames)
        }
      ],
      temperature: 1,
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (content) {
      try {
        const translations = JSON.parse(content);
        const translationMap = new Map<string, string>();
        
        // Construire la Map avec les traductions
        for (const [fr, en] of Object.entries(translations)) {
          translationMap.set(fr, en as string);
          console.log(`ðŸŒ Traduction: "${fr}" â†’ "${en}"`);
        }
        
        return translationMap;
      } catch (parseError) {
        console.error("âŒ Erreur lors du parsing des traductions:", parseError);
        // Fallback: retourner les noms originaux
        const fallbackMap = new Map<string, string>();
        recipeNames.forEach(name => fallbackMap.set(name, name));
        return fallbackMap;
      }
    }
    
    // Fallback si pas de contenu
    const fallbackMap = new Map<string, string>();
    recipeNames.forEach(name => fallbackMap.set(name, name));
    return fallbackMap;
  } catch (error) {
    console.error("âŒ Erreur lors de la traduction:", error);
    // En cas d'erreur, retourner les noms originaux
    const fallbackMap = new Map<string, string>();
    recipeNames.forEach(name => fallbackMap.set(name, name));
    return fallbackMap;
  }
}

/**
 * RÃ©cupÃ¨re une image de haute qualitÃ© depuis Unsplash avec mÃ©tadonnÃ©es pour attribution
 * @param recipeName - Nom de la recette (pour les logs)
 * @param recipeNameEnglish - Nom traduit en anglais pour la recherche
 * @returns Objet avec URL de l'image et mÃ©tadonnÃ©es Unsplash, ou null
 */
async function fetchRecipeImage(recipeName: string, recipeNameEnglish: string): Promise<{
  imageUrl: string;
  unsplashData?: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    downloadLocation: string;
  };
} | null> {
  try {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (accessKey) {
      // Version avec clÃ© API (meilleure qualitÃ© et contrÃ´le)
      const searchQuery = encodeURIComponent(`${recipeNameEnglish} food dish`);
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=landscape`,
        {
          headers: {
            'Authorization': `Client-ID ${accessKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const photo = data.results[0];
          const imageUrl = photo.urls.regular;
          
          // DonnÃ©es nÃ©cessaires pour l'attribution Unsplash
          const unsplashData = {
            photographerName: photo.user.name,
            photographerUsername: photo.user.username,
            photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=yumiso&utm_medium=referral`,
            downloadLocation: photo.links.download_location, // Pour envoyer la requÃªte de download
          };
          
          console.log(`ðŸ“¸ Image Unsplash rÃ©cupÃ©rÃ©e pour "${recipeName}" (${recipeNameEnglish}) par ${unsplashData.photographerName}`);
          return { imageUrl, unsplashData };
        }
      }
    }
    
    // Fallback: utiliser l'API publique sans clÃ© (pas d'attribution requise pour ce endpoint)
    const query = recipeName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 3).join(',');
    const fallbackUrl = `https://source.unsplash.com/1600x900/?food,${query},dish,meal`;
    console.log(`ðŸ“¸ Image Unsplash fallback pour "${recipeName}"`);
    return { imageUrl: fallbackUrl };
    
  } catch (error) {
    console.error("âŒ Erreur lors de la rÃ©cupÃ©ration de l'image:", error);
    return { imageUrl: "https://source.unsplash.com/1600x900/?food,dish,meal" };
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifiÃ©" }, { status: 401 });
    }

    // VÃ©rifier que l'utilisateur est ADMIN ou OWNER
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "FonctionnalitÃ© rÃ©servÃ©e aux utilisateurs Premium (OWNER) et ADMIN" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      planId,
      numberOfPeople,
      mealTypes = [],
      cuisinePreferences = [],
      preferences = "",
      recipeMode = "mix", // "new", "existing", ou "mix"
      includeRecipes = [], // IDs des recettes Ã  inclure obligatoirement
    } = body;

    console.log("ðŸ¤– GÃ©nÃ©ration de menu:", { planId, numberOfPeople, mealTypes, cuisinePreferences, recipeMode, includeRecipes });

    // RÃ©cupÃ©rer les recettes existantes si le mode le permet
    let existingRecipes: any[] = [];
    if (recipeMode === "existing" || recipeMode === "mix") {
      existingRecipes = await db.recipe.findMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          category: true,
          preparationTime: true,
          cookingTime: true,
          servings: true,
        },
        take: 50,
      });
    }

    // RÃ©cupÃ©rer les recettes spÃ©cifiquement demandÃ©es AVEC TOUS LEURS DÃ‰TAILS
    let includedRecipes: any[] = [];
    if (includeRecipes.length > 0) {
      includedRecipes = await db.recipe.findMany({
        where: {
          id: { in: includeRecipes },
          userId: session.user.id,
          deletedAt: null,
        },
        include: {
          ingredients: {
            orderBy: { order: "asc" }
          },
          steps: {
            orderBy: { order: "asc" }
          },
        },
      });
      
      console.log(`ðŸ“Œ ${includedRecipes.length} recettes sÃ©lectionnÃ©es rÃ©cupÃ©rÃ©es avec dÃ©tails complets`);
    }

    // Construire le prompt pour ChatGPT
    const selectedMealLabels = mealTypes.map((m: string) => MEAL_TYPE_MAP[m]?.label).filter(Boolean);
    const selectedMealTimings = mealTypes.map((m: string) => `${MEAL_TYPE_MAP[m]?.label} (${MEAL_TYPE_MAP[m]?.time})`).filter(Boolean);
    
    // Instructions selon le mode
    let modeInstructions = "";
    if (recipeMode === "new") {
      modeInstructions = "- GÃ©nÃ¨re UNIQUEMENT de nouvelles recettes crÃ©atives";
    } else if (recipeMode === "existing") {
      modeInstructions = "- Utilise UNIQUEMENT les recettes existantes listÃ©es ci-dessous";
    } else {
      // Mode Mix: 50/50 alÃ©atoire pour CHAQUE type de repas
      modeInstructions = `- MÃ©lange ALÃ‰ATOIREMENT mes recettes et nouvelles recettes
- Pour chaque type de repas: environ 50% mes recettes, 50% nouvelles (ordre alÃ©atoire)
- RÃ©partis de faÃ§on IMPRÃ‰VISIBLE sur la semaine (pas d'alternance systÃ©matique)`;
    }
    
    // Prompt OPTIMISÃ‰ - beaucoup plus court pour accÃ©lÃ©rer la gÃ©nÃ©ration
    const prompt = `Menu semaine: ${numberOfPeople} pers, ${selectedMealLabels.join("/")} uniquement.
Horaires: ${selectedMealTimings.join(", ")}
${cuisinePreferences.length > 0 ? `Cuisines: ${cuisinePreferences.join(", ")}` : ""}
${preferences ? `Notes: ${preferences}` : ""}

${includedRecipes.length > 0 ? `RECETTES Ã€ PLACER: ${includedRecipes.map((r: any) => `ID:${r.id}"${r.name}"`).join(", ")}` : ""}
${existingRecipes.length > 0 && recipeMode !== "new" ? `MES RECETTES: ${existingRecipes.slice(0, 15).map((r: any) => `ID:${r.id}"${r.name}"`).join(", ")}` : ""}

MODE: ${recipeMode === "new" ? "nouvelles recettes" : recipeMode === "existing" ? "mes recettes" : "mix 50/50 alÃ©atoire"}
${modeInstructions}
TOTAL: ${mealTypes.length * 7} repas

JSON:
{"meals":[
{"useRecipeId":123,"dayOfWeek":"Lundi","timeSlot":"12:00","mealType":"DÃ©jeuner"},
{"dayOfWeek":"Mardi","timeSlot":"19:00","mealType":"DÃ®ner","name":"Poulet rÃ´ti","prepTime":15,"cookTime":45,"servings":${numberOfPeople},"calories":450,"ingredientGroups":[{"name":"Principal","items":["1 poulet","sel","poivre"]}],"steps":["PrÃ©chauffer four 200Â°C","Assaisonner","Cuire 45min"]}
]}`;

    console.log(`ðŸ¤– [GÃ©nÃ©ration Menu] Appel OpenAI...`);
    const apiStartTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        {
          role: "system",
          content: "Chef expert. JSON valide uniquement. Pour recettes existantes: {useRecipeId,dayOfWeek,timeSlot,mealType}. Pour nouvelles: ajoute name,prepTime,cookTime,servings,calories,ingredientGroups,steps dÃ©taillÃ©s.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
      max_completion_tokens: 30000,
    });

    const apiTime = Date.now() - apiStartTime;
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Pas de rÃ©ponse de ChatGPT");
    }

    console.log(`ðŸ“¥ [GÃ©nÃ©ration Menu] RÃ©ponse en ${formatDuration(apiTime)}, ${content.length} chars`);

    const menuData = parseGPTJson(content);

    // Collecter tous les noms de recettes qui nÃ©cessitent une traduction pour Unsplash
    const recipeNamesToTranslate: string[] = [];
    for (const meal of menuData.meals) {
      // Ajouter le nom si ce n'est pas une recette existante avec useRecipeId
      if (!meal.useRecipeId) {
        recipeNamesToTranslate.push(meal.name);
      }
    }

    // Traduire tous les noms en une seule requÃªte pour optimiser les appels API
    console.log(`ðŸŒ Traduction de ${recipeNamesToTranslate.length} noms de recettes...`);
    const translationsMap = await translateMultipleToEnglish(recipeNamesToTranslate);

    // CrÃ©er tous les repas dans la base de donnÃ©es
    const createdMeals = [];
    for (const meal of menuData.meals) {
      let mealData;
      
      // Cas 1: L'IA a indiquÃ© d'utiliser une recette existante via useRecipeId
      if (meal.useRecipeId) {
        // Chercher d'abord dans les recettes prÃ©sÃ©lectionnÃ©es
        let selectedRecipe = includedRecipes.find((r: any) => r.id === meal.useRecipeId);
        
        // Si pas trouvÃ©, chercher dans toutes les recettes existantes
        if (!selectedRecipe) {
          selectedRecipe = await db.recipe.findUnique({
            where: {
              id: meal.useRecipeId,
              userId: session.user.id,
              deletedAt: null,
            },
            include: {
              ingredients: { orderBy: { order: "asc" } },
              steps: { orderBy: { order: "asc" } },
            },
          });
        }
        
        if (!selectedRecipe) {
          console.warn(`âš ï¸ Recette ID ${meal.useRecipeId} non trouvÃ©e`);
          continue; // Skip ce repas si la recette n'existe pas
        }
        
        console.log(`âœ… Utilisation de la recette existante: ${selectedRecipe.name} (ID: ${selectedRecipe.id})`);
        
        // Formater les ingrÃ©dients SANS ajustement (utiliser les quantitÃ©s exactes de la recette)
        const ingredientsFormatted = selectedRecipe.ingredients.map((ing: any) => {
          if (ing.quantity && ing.unit) {
            return `${ing.quantity} ${ing.unit} ${ing.name}`;
          } else if (ing.quantity) {
            return `${ing.quantity} ${ing.name}`;
          } else {
            return ing.name;
          }
        });

        mealData = {
          weeklyMealPlanId: planId,
          dayOfWeek: meal.dayOfWeek,
          timeSlot: meal.timeSlot,
          mealType: meal.mealType,
          name: selectedRecipe.name,
          prepTime: selectedRecipe.preparationTime,
          cookTime: selectedRecipe.cookingTime,
          servings: selectedRecipe.servings, // Utiliser les portions de la recette d'origine
          calories: selectedRecipe.caloriesPerServing, // Calories exactes sans multiplication
          portionsUsed: selectedRecipe.servings, // Garder le nombre de portions de la recette
          ingredients: ingredientsFormatted,
          steps: selectedRecipe.steps.map((step: any) => step.text),
          recipeId: selectedRecipe.id,
          isUserRecipe: true,
        };
      }
      // Cas 2: Chercher si une recette existante matche le nom (pour mode "existing" ou "mix")
      else if (recipeMode === "existing" || recipeMode === "mix") {
        const matchingRecipe = await db.recipe.findFirst({
          where: {
            userId: session.user.id,
            name: {
              equals: meal.name,
              mode: 'insensitive',
            },
          },
          include: {
            ingredients: true,
            steps: { orderBy: { order: "asc" } },
          },
        });

        if (matchingRecipe) {
          console.log(`âœ… Recette existante trouvÃ©e par nom: ${matchingRecipe.name}`);
          
          // Formater les ingrÃ©dients SANS ajustement (utiliser les quantitÃ©s exactes de la recette)
          const ingredientsFormatted = matchingRecipe.ingredients.map((ing) => {
            if (ing.quantity && ing.unit) {
              return `${ing.quantity} ${ing.unit} ${ing.name}`;
            } else if (ing.quantity) {
              return `${ing.quantity} ${ing.name}`;
            } else {
              return ing.name;
            }
          });

          mealData = {
            weeklyMealPlanId: planId,
            dayOfWeek: meal.dayOfWeek,
            timeSlot: meal.timeSlot,
            mealType: meal.mealType,
            name: matchingRecipe.name,
            prepTime: matchingRecipe.preparationTime,
            cookTime: matchingRecipe.cookingTime,
            servings: matchingRecipe.servings, // Utiliser les portions de la recette d'origine
            calories: matchingRecipe.caloriesPerServing, // Calories exactes sans multiplication
            portionsUsed: matchingRecipe.servings, // Garder le nombre de portions de la recette
            ingredients: ingredientsFormatted,
            steps: matchingRecipe.steps.map((step) => step.text),
            recipeId: matchingRecipe.id,
            isUserRecipe: true,
            imageUrl: matchingRecipe.imageUrl, // Utiliser l'image de la recette existante
          };
        } else {
          // Utiliser les donnÃ©es gÃ©nÃ©rÃ©es par l'IA
          // RÃ©cupÃ©rer une image pour la nouvelle recette
          const recipeNameEnglish = translationsMap.get(meal.name) || meal.name;
          const imageData = await fetchRecipeImage(meal.name, recipeNameEnglish);
          
          // Convertir ingredientGroups en liste plate pour compatibility
          let ingredientsList: string[] = [];
          let hasGroups = false;
          
          if (meal.ingredientGroups && Array.isArray(meal.ingredientGroups)) {
            hasGroups = true;
            meal.ingredientGroups.forEach((group: any) => {
              if (Array.isArray(group.items)) {
                ingredientsList.push(...group.items);
              }
            });
          } else if (meal.ingredients && Array.isArray(meal.ingredients)) {
            ingredientsList = meal.ingredients;
          }
          
          mealData = {
            weeklyMealPlanId: planId,
            dayOfWeek: meal.dayOfWeek,
            timeSlot: meal.timeSlot,
            mealType: meal.mealType,
            name: meal.name,
            prepTime: meal.prepTime || 0,
            cookTime: meal.cookTime || 0,
            servings: meal.servings || numberOfPeople,
            calories: meal.calories || null,
            portionsUsed: meal.servings || numberOfPeople,
            // Stocker les groupes si prÃ©sents, sinon juste la liste
            ingredients: hasGroups ? meal.ingredientGroups : ingredientsList,
            steps: meal.steps || [],
            recipeId: null,
            isUserRecipe: false,
            imageUrl: imageData?.imageUrl, // Ajouter l'image rÃ©cupÃ©rÃ©e
            // Stocker les mÃ©tadonnÃ©es Unsplash pour l'attribution
            unsplashData: imageData?.unsplashData ? JSON.stringify(imageData.unsplashData) : null,
          };
        }
      }
      // Cas 3: Utiliser directement les donnÃ©es de l'IA (mode "new" ou pas de match)
      else {
        // RÃ©cupÃ©rer une image pour la nouvelle recette
        const recipeNameEnglish = translationsMap.get(meal.name) || meal.name;
        const imageData = await fetchRecipeImage(meal.name, recipeNameEnglish);
        
        // Convertir ingredientGroups en liste plate pour compatibility
        let ingredientsList: string[] = [];
        let hasGroups = false;
        
        if (meal.ingredientGroups && Array.isArray(meal.ingredientGroups)) {
          hasGroups = true;
          // Fusionner tous les groupes en une liste plate
          meal.ingredientGroups.forEach((group: any) => {
            if (Array.isArray(group.items)) {
              ingredientsList.push(...group.items);
            }
          });
        } else if (meal.ingredients && Array.isArray(meal.ingredients)) {
          // Fallback sur l'ancien format
          ingredientsList = meal.ingredients;
        }
        
        mealData = {
          weeklyMealPlanId: planId,
          dayOfWeek: meal.dayOfWeek,
          timeSlot: meal.timeSlot,
          mealType: meal.mealType,
          name: meal.name,
          prepTime: meal.prepTime || 0,
          cookTime: meal.cookTime || 0,
          servings: meal.servings || numberOfPeople,
          calories: meal.calories || null,
          portionsUsed: meal.servings || numberOfPeople,
          // Stocker les groupes si prÃ©sents, sinon juste la liste
          ingredients: hasGroups ? meal.ingredientGroups : ingredientsList,
          steps: meal.steps || [],
          recipeId: null,
          isUserRecipe: false,
          imageUrl: imageData?.imageUrl,
          // Stocker les mÃ©tadonnÃ©es Unsplash pour l'attribution
          unsplashData: imageData?.unsplashData ? JSON.stringify(imageData.unsplashData) : null,
        };
      }

      const createdMeal = await db.plannedMeal.create({ data: mealData });
      createdMeals.push(createdMeal);
    }

    console.log("âœ… Menu gÃ©nÃ©rÃ© avec succÃ¨s:", createdMeals.length, "repas");
    console.log("ðŸ“Š DÃ©tails des repas crÃ©Ã©s par jour/type:");
    const mealsByDay: Record<string, any[]> = {};
    createdMeals.forEach(meal => {
      if (!mealsByDay[meal.dayOfWeek]) {
        mealsByDay[meal.dayOfWeek] = [];
      }
      mealsByDay[meal.dayOfWeek].push({ type: meal.mealType, time: meal.timeSlot, name: meal.name });
    });
    console.log(JSON.stringify(mealsByDay, null, 2));

    // Recalculer automatiquement la liste de courses
    try {
      // RÃ©cupÃ©rer le plan avec tous les repas
      const updatedPlan = await db.weeklyMealPlan.findUnique({
        where: { id: planId },
        include: { meals: true },
      });

      if (updatedPlan) {
        // Collecter tous les ingrÃ©dients bruts
        const allIngredients: string[] = [];
        updatedPlan.meals.forEach((meal) => {
          if (Array.isArray(meal.ingredients)) {
            meal.ingredients.forEach((ing: any) => {
              // VÃ©rifier si c'est un format groupÃ© ou simple
              if (typeof ing === 'object' && ing.name && Array.isArray(ing.items)) {
                // Format groupÃ©: {name: "Farce", items: ["...", "..."]}
                ing.items.forEach((item: string) => {
                  if (item && item !== 'undefined' && item !== 'null' && item !== '[object Object]') {
                    allIngredients.push(item.trim());
                  }
                });
              } else {
                // Format simple: string
                const ingredientStr = typeof ing === 'string' ? ing : (ing?.name || String(ing));
                if (!ingredientStr || ingredientStr === 'undefined' || ingredientStr === 'null' || ingredientStr === '[object Object]') return;
                allIngredients.push(ingredientStr.trim());
              }
            });
          }
        });

        // CatÃ©goriser les ingrÃ©dients
        const categorized: Record<string, string[]> = {
          "LÃ©gumes": [],
          "Viandes & Poissons": [],
          "Produits Laitiers": [],
          "Ã‰picerie": [],
          "Condiments & Sauces": [],
          "Autres": [],
        };

        const categories = {
          lÃ©gumes: ["tomate", "carotte", "oignon", "ail", "poivron", "courgette", "aubergine", "salade", "laitue", "Ã©pinard", "chou", "brocoli", "champignon", "poireau", "cÃ©leri", "concombre", "radis", "navet", "betterave", "courge", "potiron", "citrouille", "haricot vert", "petit pois", "fÃ¨ve", "artichaut", "asperge", "endive", "fenouil", "patate douce", "pomme de terre"],
          viandes: ["poulet", "bÅ“uf", "porc", "agneau", "veau", "canard", "dinde", "lapin", "saucisse", "jambon", "bacon", "lard", "poisson", "saumon", "thon", "cabillaud", "morue", "sole", "truite", "bar", "daurade", "maquereau", "sardine", "hareng", "anchois", "crevette", "crabe", "homard", "langouste", "moule", "huÃ®tre", "coquille", "calmar", "seiche", "poulpe"],
          laitiers: ["lait", "crÃ¨me", "beurre", "fromage", "yaourt", "yogourt", "mozzarella", "parmesan", "gruyÃ¨re", "emmental", "chÃ¨vre", "brebis", "camembert", "roquefort", "comtÃ©", "raclette", "ricotta", "mascarpone", "feta", "cottage"],
          Ã©picerie: ["riz", "pÃ¢te", "farine", "sucre", "sel", "poivre", "huile", "vinaigre", "pÃ¢te", "nouille", "vermicelle", "semoule", "couscous", "quinoa", "boulgour", "lentille", "pois chiche", "haricot", "fÃ¨ve", "maÃ¯s", "avoine", "cÃ©rÃ©ale", "pain", "biscuit", "gÃ¢teau", "chocolat", "cacao", "cafÃ©", "thÃ©", "miel", "confiture", "pÃ¢te Ã  tartiner"],
          condiments: ["sauce", "ketchup", "mayonnaise", "moutarde", "vinaigre", "huile", "soja", "nuoc mam", "mirin", "sakÃ©", "wasabi", "gingembre", "curry", "curcuma", "paprika", "piment", "harissa", "tabasco", "sriracha", "bouillon", "fond", "concentrÃ©", "pÃ¢te", "purÃ©e", "coulis"],
        };

        allIngredients.forEach((ingredient) => {
          const ingredientLower = ingredient.toLowerCase();
          let placed = false;

          if (categories.lÃ©gumes.some(v => ingredientLower.includes(v))) {
            categorized["LÃ©gumes"].push(ingredient);
            placed = true;
          } else if (categories.viandes.some(v => ingredientLower.includes(v))) {
            categorized["Viandes & Poissons"].push(ingredient);
            placed = true;
          } else if (categories.laitiers.some(v => ingredientLower.includes(v))) {
            categorized["Produits Laitiers"].push(ingredient);
            placed = true;
          } else if (categories.Ã©picerie.some(v => ingredientLower.includes(v))) {
            categorized["Ã‰picerie"].push(ingredient);
            placed = true;
          } else if (categories.condiments.some(v => ingredientLower.includes(v))) {
            categorized["Condiments & Sauces"].push(ingredient);
            placed = true;
          }

          if (!placed) {
            categorized["Autres"].push(ingredient);
          }
        });

        // Nettoyer les catÃ©gories vides
        Object.keys(categorized).forEach(key => {
          if (categorized[key].length === 0) {
            delete categorized[key];
          }
        });

        // CrÃ©er les ShoppingListItem dans la base de donnÃ©es
        const itemsToCreate: Array<{
          ingredientName: string;
          category: string;
          isChecked: boolean;
          isManuallyAdded: boolean;
          weeklyMealPlanId: number;
        }> = [];
        
        Object.entries(categorized).forEach(([category, items]) => {
          if (!Array.isArray(items)) return;
          
          items.forEach((itemName: string) => {
            if (!itemName || typeof itemName !== 'string') return;
            const trimmedName = itemName.trim();
            if (!trimmedName) return;
            
            itemsToCreate.push({
              ingredientName: trimmedName,
              category: category,
              isChecked: false,
              isManuallyAdded: false,
              weeklyMealPlanId: planId
            });
          });
        });
        
        if (itemsToCreate.length > 0) {
          await db.shoppingListItem.createMany({
            data: itemsToCreate,
            skipDuplicates: true
          });
        }

        console.log(`âœ… Liste de courses crÃ©Ã©e automatiquement avec ${itemsToCreate.length} items`);
      }
    } catch (error) {
      console.error("âš ï¸ Erreur recalcul liste de courses (non bloquant):", error);
    }

    const elapsedTime = Date.now() - startTime;
    const modeLabel = recipeMode === "existing" ? "Mes recettes" : recipeMode === "new" ? "IA uniquement" : "Mix";
    console.log(`âœ… [GÃ©nÃ©ration Menu] TerminÃ©e en ${formatDuration(elapsedTime)} pour ${createdMeals.length} repas (mode: ${modeLabel})`);

    return NextResponse.json({
      success: true,
      mealsCreated: createdMeals.length,
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`âŒ [GÃ©nÃ©ration Menu] Ã‰chec aprÃ¨s ${formatDuration(elapsedTime)}:`, error);
    
    // Extraire les dÃ©tails de l'erreur
    let errorMessage = "Erreur inconnue";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
      
      // Si c'est une erreur OpenAI, extraire plus de dÃ©tails
      if ('response' in error) {
        const openAIError = error as any;
        errorDetails = JSON.stringify({
          message: openAIError.message,
          type: openAIError.type,
          code: openAIError.code,
          status: openAIError.status,
          response: openAIError.response?.data || openAIError.response
        }, null, 2);
      }
    }
    
    console.error("ðŸ“‹ DÃ©tails complets de l'erreur:", errorDetails);
    
    return NextResponse.json(
      {
        error: "Erreur lors de la gÃ©nÃ©ration du menu",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
