import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
import { RecipeProvider } from "@/components/recipes/recipe-context";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { getUserNote } from "@/actions/notes";
import { getCollections } from "@/actions/collections";
import type { Recipe } from "@/types/recipe";
import type { Metadata } from "next";

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

interface RecipeWithUserId extends Recipe {
  userId: string | null;
}

async function getRecipe(id: number) {
  const recipe = await db.recipe.findUnique({
    where: {
      id,
      deletedAt: null, // Exclure les recettes soft-deleted
    },
    include: {
      ingredients: {
        orderBy: { order: "asc" },
      },
      ingredientGroups: {
        include: {
          ingredients: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      steps: { orderBy: { order: "asc" } },
      comments: {
        where: { deletedAt: null }, // Exclure les commentaires soft-deleted
        include: {
          user: {
            select: {
              id: true,
              name: true,
              pseudo: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return recipe;
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  
  if (isNaN(recipeId)) {
    return { title: "Recette non trouvée | Yumiso" };
  }

  const recipe = await getRecipe(recipeId);
  
  if (!recipe) {
    return { title: "Recette non trouvée | Yumiso" };
  }

  return {
    title: `${recipe.name} | Yumiso`,
    description: recipe.description || `Découvrez la recette ${recipe.name} par ${recipe.author}`,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);

  if (isNaN(recipeId)) {
    notFound();
  }

  const [recipe, session] = await Promise.all([
    getRecipe(recipeId),
    auth(),
  ]);

  if (!recipe) {
    notFound();
  }

  // Check if user can edit/delete this recipe
  const isOwner = session?.user?.id === recipe.userId;
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "OWNER";
  const canEdit = isOwner || isAdmin;
  const isAuthenticated = !!session?.user?.id;

  // Debug logging
  console.log("[RecipePage] Recipe ID:", recipe.id);
  console.log("[RecipePage] Recipe userId:", recipe.userId);
  console.log("[RecipePage] Session user ID:", session?.user?.id);
  console.log("[RecipePage] Session user role:", session?.user?.role);
  console.log("[RecipePage] isOwner:", isOwner, "isAdmin:", isAdmin, "canEdit:", canEdit);

  // Fetch user-specific data if authenticated
  const [userNote, collections] = isAuthenticated
    ? await Promise.all([
        getUserNote(recipeId),
        getCollections(),
      ])
    : [null, []];

  // Extract comments from recipe
  const { comments, ...recipeData } = recipe;

  return (
    <RecipeProvider recipe={recipeData as Recipe}>
      {/* Track page view */}
      <ViewTracker recipeId={recipeId} />
      <RecipeDetail
        recipe={recipeData as RecipeWithUserId}
        canEdit={canEdit}
        comments={comments}
        userNote={userNote?.note}
        collections={collections}
        isAuthenticated={isAuthenticated}
      />
    </RecipeProvider>
  );
}

