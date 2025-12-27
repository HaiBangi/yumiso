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

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const MEAL_TYPE_MAP: Record<string, { time: string; label: string }> = {
  breakfast: { time: "08:00", label: "Petit-déjeuner" },
  lunch: { time: "12:00", label: "Déjeuner" },
  snack: { time: "16:00", label: "Collation" },
  dinner: { time: "19:00", label: "Dîner" },
};

/**
 * Traduit plusieurs noms de recettes en anglais en une seule requête pour optimiser les appels API
 * @param recipeNames - Tableau des noms de recettes en français
 * @returns Map avec les traductions (clé: nom FR, valeur: nom EN)
 */
async function translateMultipleToEnglish(recipeNames: string[]): Promise<Map<string, string>> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
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
          console.log(`🌐 Traduction: "${fr}" → "${en}"`);
        }
        
        return translationMap;
      } catch (parseError) {
        console.error("❌ Erreur lors du parsing des traductions:", parseError);
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
    console.error("❌ Erreur lors de la traduction:", error);
    // En cas d'erreur, retourner les noms originaux
    const fallbackMap = new Map<string, string>();
    recipeNames.forEach(name => fallbackMap.set(name, name));
    return fallbackMap;
  }
}

/**
 * Récupère une image de haute qualité depuis Unsplash avec métadonnées pour attribution
 * @param recipeName - Nom de la recette (pour les logs)
 * @param recipeNameEnglish - Nom traduit en anglais pour la recherche
 * @returns Objet avec URL de l'image et métadonnées Unsplash, ou null
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
      // Version avec clé API (meilleure qualité et contrôle)
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
          
          // Données nécessaires pour l'attribution Unsplash
          const unsplashData = {
            photographerName: photo.user.name,
            photographerUsername: photo.user.username,
            photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=yumiso&utm_medium=referral`,
            downloadLocation: photo.links.download_location, // Pour envoyer la requête de download
          };
          
          console.log(`📸 Image Unsplash récupérée pour "${recipeName}" (${recipeNameEnglish}) par ${unsplashData.photographerName}`);
          return { imageUrl, unsplashData };
        }
      }
    }
    
    // Fallback: utiliser l'API publique sans clé (pas d'attribution requise pour ce endpoint)
    const query = recipeName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').slice(0, 3).join(',');
    const fallbackUrl = `https://source.unsplash.com/1600x900/?food,${query},dish,meal`;
    console.log(`📸 Image Unsplash fallback pour "${recipeName}"`);
    return { imageUrl: fallbackUrl };
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de l'image:", error);
    return { imageUrl: "https://source.unsplash.com/1600x900/?food,dish,meal" };
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Vérifier que l'utilisateur est ADMIN ou OWNER
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Fonctionnalité réservée aux utilisateurs Premium (OWNER) et ADMIN" },
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
      includeRecipes = [], // IDs des recettes à inclure obligatoirement
    } = body;

    console.log("🤖 Génération de menu:", { planId, numberOfPeople, mealTypes, cuisinePreferences, recipeMode, includeRecipes });

    // Récupérer les recettes existantes si le mode le permet
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

    // Récupérer les recettes spécifiquement demandées AVEC TOUS LEURS DÉTAILS
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
      
      console.log(`📌 ${includedRecipes.length} recettes sélectionnées récupérées avec détails complets`);
    }

    // Construire le prompt pour ChatGPT
    const selectedMealLabels = mealTypes.map((m: string) => MEAL_TYPE_MAP[m]?.label).filter(Boolean);
    const selectedMealTimings = mealTypes.map((m: string) => `${MEAL_TYPE_MAP[m]?.label} (${MEAL_TYPE_MAP[m]?.time})`).filter(Boolean);
    
    // Instructions selon le mode
    let modeInstructions = "";
    if (recipeMode === "new") {
      modeInstructions = "- Génère UNIQUEMENT de nouvelles recettes créatives";
    } else if (recipeMode === "existing") {
      modeInstructions = "- Utilise UNIQUEMENT les recettes existantes listées ci-dessous";
    } else {
      const minRecipesToUse = Math.ceil(existingRecipes.length * 0.5); // 50% des recettes existantes
      const totalMeals = mealTypes.length * 7;
      modeInstructions = `- UTILISE EXACTEMENT ${Math.min(minRecipesToUse, Math.floor(totalMeals * 0.5))} DE MES RECETTES EXISTANTES listées ci-dessous (environ 50% du menu)
- COMBINE-les avec ${Math.ceil(totalMeals * 0.5)} nouvelles recettes créatives pour compléter le menu
- Équilibre 50/50 entre mes recettes et les nouvelles créations`;
    }
    
    // Prompt OPTIMISÉ - beaucoup plus court pour accélérer la génération
    const prompt = `Menu semaine: ${numberOfPeople} pers, ${selectedMealLabels.join("/")} uniquement.
Horaires: ${selectedMealTimings.join(", ")}
${cuisinePreferences.length > 0 ? `Cuisines: ${cuisinePreferences.join(", ")}` : ""}
${preferences ? `Notes: ${preferences}` : ""}

${includedRecipes.length > 0 ? `RECETTES À PLACER: ${includedRecipes.map((r: any) => `ID:${r.id}"${r.name}"`).join(", ")}` : ""}
${existingRecipes.length > 0 && recipeMode !== "new" ? `MES RECETTES: ${existingRecipes.slice(0, 15).map((r: any) => `ID:${r.id}"${r.name}"`).join(", ")}` : ""}

MODE: ${recipeMode === "new" ? "nouvelles recettes" : recipeMode === "existing" ? "mes recettes" : "mix 50/50"}
${modeInstructions}
TOTAL: ${mealTypes.length * 7} repas

JSON:
{"meals":[
{"useRecipeId":123,"dayOfWeek":"Lundi","timeSlot":"12:00","mealType":"Déjeuner"},
{"dayOfWeek":"Mardi","timeSlot":"19:00","mealType":"Dîner","name":"Poulet rôti","prepTime":15,"cookTime":45,"servings":${numberOfPeople},"calories":450,"ingredientGroups":[{"name":"Principal","items":["1 poulet","sel","poivre"]}],"steps":["Préchauffer four 200°C","Assaisonner","Cuire 45min"]}
]}`;

    console.log(`🤖 [Génération Menu] Appel OpenAI...`);
    const apiStartTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Chef expert. JSON valide uniquement. Pour recettes existantes: {useRecipeId,dayOfWeek,timeSlot,mealType}. Pour nouvelles: ajoute name,prepTime,cookTime,servings,calories,ingredientGroups,steps détaillés.",
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
      throw new Error("Pas de réponse de ChatGPT");
    }

    console.log(`📥 [Génération Menu] Réponse en ${formatDuration(apiTime)}, ${content.length} chars`);

    const menuData = parseGPTJson(content);

    // Collecter tous les noms de recettes qui nécessitent une traduction pour Unsplash
    const recipeNamesToTranslate: string[] = [];
    for (const meal of menuData.meals) {
      // Ajouter le nom si ce n'est pas une recette existante avec useRecipeId
      if (!meal.useRecipeId) {
        recipeNamesToTranslate.push(meal.name);
      }
    }

    // Traduire tous les noms en une seule requête pour optimiser les appels API
    console.log(`🌐 Traduction de ${recipeNamesToTranslate.length} noms de recettes...`);
    const translationsMap = await translateMultipleToEnglish(recipeNamesToTranslate);

    // Créer tous les repas dans la base de données
    const createdMeals = [];
    for (const meal of menuData.meals) {
      let mealData;
      
      // Cas 1: L'IA a indiqué d'utiliser une recette existante via useRecipeId
      if (meal.useRecipeId) {
        // Chercher d'abord dans les recettes présélectionnées
        let selectedRecipe = includedRecipes.find((r: any) => r.id === meal.useRecipeId);
        
        // Si pas trouvé, chercher dans toutes les recettes existantes
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
          console.warn(`⚠️ Recette ID ${meal.useRecipeId} non trouvée`);
          continue; // Skip ce repas si la recette n'existe pas
        }
        
        console.log(`✅ Utilisation de la recette existante: ${selectedRecipe.name} (ID: ${selectedRecipe.id})`);
        
        // Formater les ingrédients SANS ajustement (utiliser les quantités exactes de la recette)
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
          console.log(`✅ Recette existante trouvée par nom: ${matchingRecipe.name}`);
          
          // Formater les ingrédients SANS ajustement (utiliser les quantités exactes de la recette)
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
          // Utiliser les données générées par l'IA
          // Récupérer une image pour la nouvelle recette
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
            // Stocker les groupes si présents, sinon juste la liste
            ingredients: hasGroups ? meal.ingredientGroups : ingredientsList,
            steps: meal.steps || [],
            recipeId: null,
            isUserRecipe: false,
            imageUrl: imageData?.imageUrl, // Ajouter l'image récupérée
            // Stocker les métadonnées Unsplash pour l'attribution
            unsplashData: imageData?.unsplashData ? JSON.stringify(imageData.unsplashData) : null,
          };
        }
      }
      // Cas 3: Utiliser directement les données de l'IA (mode "new" ou pas de match)
      else {
        // Récupérer une image pour la nouvelle recette
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
          // Stocker les groupes si présents, sinon juste la liste
          ingredients: hasGroups ? meal.ingredientGroups : ingredientsList,
          steps: meal.steps || [],
          recipeId: null,
          isUserRecipe: false,
          imageUrl: imageData?.imageUrl,
          // Stocker les métadonnées Unsplash pour l'attribution
          unsplashData: imageData?.unsplashData ? JSON.stringify(imageData.unsplashData) : null,
        };
      }

      const createdMeal = await db.plannedMeal.create({ data: mealData });
      createdMeals.push(createdMeal);
    }

    console.log("✅ Menu généré avec succès:", createdMeals.length, "repas");
    console.log("📊 Détails des repas créés par jour/type:");
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
      // Récupérer le plan avec tous les repas
      const updatedPlan = await db.weeklyMealPlan.findUnique({
        where: { id: planId },
        include: { meals: true },
      });

      if (updatedPlan) {
        // Collecter tous les ingrédients bruts
        const allIngredients: string[] = [];
        updatedPlan.meals.forEach((meal) => {
          if (Array.isArray(meal.ingredients)) {
            meal.ingredients.forEach((ing: any) => {
              // Vérifier si c'est un format groupé ou simple
              if (typeof ing === 'object' && ing.name && Array.isArray(ing.items)) {
                // Format groupé: {name: "Farce", items: ["...", "..."]}
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

        // Catégoriser les ingrédients
        const categorized: Record<string, string[]> = {
          "Légumes": [],
          "Viandes & Poissons": [],
          "Produits Laitiers": [],
          "Épicerie": [],
          "Condiments & Sauces": [],
          "Autres": [],
        };

        const categories = {
          légumes: ["tomate", "carotte", "oignon", "ail", "poivron", "courgette", "aubergine", "salade", "laitue", "épinard", "chou", "brocoli", "champignon", "poireau", "céleri", "concombre", "radis", "navet", "betterave", "courge", "potiron", "citrouille", "haricot vert", "petit pois", "fève", "artichaut", "asperge", "endive", "fenouil", "patate douce", "pomme de terre"],
          viandes: ["poulet", "bœuf", "porc", "agneau", "veau", "canard", "dinde", "lapin", "saucisse", "jambon", "bacon", "lard", "poisson", "saumon", "thon", "cabillaud", "morue", "sole", "truite", "bar", "daurade", "maquereau", "sardine", "hareng", "anchois", "crevette", "crabe", "homard", "langouste", "moule", "huître", "coquille", "calmar", "seiche", "poulpe"],
          laitiers: ["lait", "crème", "beurre", "fromage", "yaourt", "yogourt", "mozzarella", "parmesan", "gruyère", "emmental", "chèvre", "brebis", "camembert", "roquefort", "comté", "raclette", "ricotta", "mascarpone", "feta", "cottage"],
          épicerie: ["riz", "pâte", "farine", "sucre", "sel", "poivre", "huile", "vinaigre", "pâte", "nouille", "vermicelle", "semoule", "couscous", "quinoa", "boulgour", "lentille", "pois chiche", "haricot", "fève", "maïs", "avoine", "céréale", "pain", "biscuit", "gâteau", "chocolat", "cacao", "café", "thé", "miel", "confiture", "pâte à tartiner"],
          condiments: ["sauce", "ketchup", "mayonnaise", "moutarde", "vinaigre", "huile", "soja", "nuoc mam", "mirin", "saké", "wasabi", "gingembre", "curry", "curcuma", "paprika", "piment", "harissa", "tabasco", "sriracha", "bouillon", "fond", "concentré", "pâte", "purée", "coulis"],
        };

        allIngredients.forEach((ingredient) => {
          const ingredientLower = ingredient.toLowerCase();
          let placed = false;

          if (categories.légumes.some(v => ingredientLower.includes(v))) {
            categorized["Légumes"].push(ingredient);
            placed = true;
          } else if (categories.viandes.some(v => ingredientLower.includes(v))) {
            categorized["Viandes & Poissons"].push(ingredient);
            placed = true;
          } else if (categories.laitiers.some(v => ingredientLower.includes(v))) {
            categorized["Produits Laitiers"].push(ingredient);
            placed = true;
          } else if (categories.épicerie.some(v => ingredientLower.includes(v))) {
            categorized["Épicerie"].push(ingredient);
            placed = true;
          } else if (categories.condiments.some(v => ingredientLower.includes(v))) {
            categorized["Condiments & Sauces"].push(ingredient);
            placed = true;
          }

          if (!placed) {
            categorized["Autres"].push(ingredient);
          }
        });

        // Nettoyer les catégories vides
        Object.keys(categorized).forEach(key => {
          if (categorized[key].length === 0) {
            delete categorized[key];
          }
        });

        // Sauvegarder
        await db.weeklyMealPlan.update({
          where: { id: planId },
          data: {
            optimizedShoppingList: categorized,
            updatedAt: new Date(),
          },
        });

        console.log("✅ Liste de courses recalculée automatiquement avec", allIngredients.length, "ingrédients");
      }
    } catch (error) {
      console.error("⚠️ Erreur recalcul liste de courses (non bloquant):", error);
    }

    const elapsedTime = Date.now() - startTime;
    const modeLabel = recipeMode === "existing" ? "Mes recettes" : recipeMode === "new" ? "IA uniquement" : "Mix";
    console.log(`✅ [Génération Menu] Terminée en ${formatDuration(elapsedTime)} pour ${createdMeals.length} repas (mode: ${modeLabel})`);

    return NextResponse.json({
      success: true,
      mealsCreated: createdMeals.length,
    });
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ [Génération Menu] Échec après ${formatDuration(elapsedTime)}:`, error);
    
    // Extraire les détails de l'erreur
    let errorMessage = "Erreur inconnue";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
      
      // Si c'est une erreur OpenAI, extraire plus de détails
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
    
    console.error("📋 Détails complets de l'erreur:", errorDetails);
    
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du menu",
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}