import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isPrivateStatus } from "@/lib/recipe-status";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
import { RecipeProvider } from "@/components/recipes/recipe-context";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { getUserNote } from "@/actions/notes";
import { getCollections } from "@/actions/collections";
import type { Recipe } from "@/types/recipe";
import type { Metadata } from "next";

interface RecipePageProps {
  params: Promise<{ slug: string }>;
}

interface RecipeWithUserId extends Recipe {
  userId: string | null;
}

async function getRecipeBySlug(slug: string) {
  const recipe = await db.recipe.findFirst({
    where: {
      slug,
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
      recipeTags: {
        include: {
          tag: true,
        },
      },
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
  const { slug } = await params;

  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return { title: "Recette non trouvée | Yumiso" };
  }

  return {
    title: `${recipe.name} | Yumiso`,
    description: recipe.description || `Découvrez la recette ${recipe.name} par ${recipe.author}`,
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;

  const [recipe, session] = await Promise.all([
    getRecipeBySlug(slug),
    auth(),
  ]);

  if (!recipe) {
    notFound();
  }

  // Check if user can view this recipe based on status
  const isOwner = session?.user?.id === recipe.userId;
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "OWNER";

  // Recettes DRAFT ou PRIVATE : seul l'auteur ou un admin peut les voir
  if (isPrivateStatus(recipe.status) && !isOwner && !isAdmin) {
    notFound();
  }

  const canEdit = isOwner || isAdmin;
  const isAuthenticated = !!session?.user?.id;

  // Debug logging
  console.log("[RecipePage] Recipe slug:", recipe.slug);
  console.log("[RecipePage] Recipe ID:", recipe.id);
  console.log("[RecipePage] Recipe userId:", recipe.userId);
  console.log("[RecipePage] Session user ID:", session?.user?.id);
  console.log("[RecipePage] Session user role:", session?.user?.role);
  console.log("[RecipePage] isOwner:", isOwner, "isAdmin:", isAdmin, "canEdit:", canEdit);

  // Fetch user-specific data if authenticated
  const [userNote, collections] = isAuthenticated
    ? await Promise.all([
        getUserNote(recipe.id),
        getCollections(),
      ])
    : [null, []];

  // Extract comments from recipe
  const { comments, ...recipeData } = recipe;

  return (
    <RecipeProvider recipe={recipeData as Recipe}>
      {/* Track page view */}
      <ViewTracker recipeId={recipe.id} />
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
