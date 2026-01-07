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

// Génération statique des pages recettes pour le SSG (Static Site Generation)
// Next.js va pré-générer ces pages au build time pour de meilleures performances SEO
export async function generateStaticParams() {
  // Récupérer toutes les recettes publiques pour la génération statique
  const recipes = await db.recipe.findMany({
    where: {
      status: 'PUBLIC',
      deletedAt: null,
    },
    select: {
      slug: true,
    },
    // Limiter à 100 recettes les plus populaires pour le build initial
    // Les autres seront générées à la demande (ISR)
    take: 100,
    orderBy: {
      viewsCount: 'desc',
    },
  });

  return recipes.map((recipe) => ({
    slug: recipe.slug,
  }));
}

// Configuration de revalidation (ISR - Incremental Static Regeneration)
// Regénère la page toutes les 3600 secondes (1 heure) si une requête arrive
export const revalidate = 3600;

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { slug } = await params;

  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return {
      title: "Recette non trouvée | Yumiso",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Extraction des informations clés pour le SEO
  const totalTime = recipe.preparationTime + recipe.cookingTime;
  const category = recipe.category.toLowerCase();
  const servings = recipe.servings || 4;

  // Construction du title SEO optimisé (50-60 caractères)
  // Format: "Nom de la recette - Catégorie | Yumiso"
  const categoryLabels: Record<string, string> = {
    'starter': 'Entrée',
    'main_dish': 'Plat principal',
    'dessert': 'Dessert',
    'side_dish': 'Accompagnement',
    'soup': 'Soupe',
    'salad': 'Salade',
    'breakfast': 'Petit-déjeuner',
    'snack': 'Collation',
    'drink': 'Boisson',
    'sauce': 'Sauce',
    'appetizer': 'Apéritif',
    'pastry': 'Pâtisserie',
  };

  const categoryLabel = categoryLabels[category] || 'Recette';
  const seoTitle = `${recipe.name} - ${categoryLabel} | Yumiso`;

  // Construction de la meta description optimisée (140-160 caractères)
  // Format: "Découvrez notre recette de [nom]. [Description courte]. Temps: Xmin. Pour Y personnes."
  let seoDescription = recipe.description || `Recette de ${recipe.name}`;

  // Si la description est trop longue, la tronquer intelligemment
  if (seoDescription.length > 100) {
    seoDescription = seoDescription.substring(0, 97) + '...';
  }

  // Ajouter les informations pratiques
  const practicalInfo = ` ${totalTime}min · ${servings} pers.`;
  seoDescription = `${seoDescription}${practicalInfo}`;

  // Extraction des tags pour les keywords
  const tags = recipe.recipeTags?.map(rt => rt.tag.name).join(', ') || '';
  const keywords = [recipe.name, categoryLabel, recipe.author, ...tags.split(', ')].filter(Boolean);

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: keywords,
    authors: [{ name: recipe.author || 'Yumiso' }],
    creator: recipe.author || 'Yumiso',
    publisher: 'Yumiso',

    // URL Canonique OBLIGATOIRE - toujours pointer vers l'URL publique finale
    alternates: {
      canonical: `https://yumiso.fr/recipes/${slug}`,
    },

    // Directives robots
    robots: {
      index: recipe.status === 'PUBLIC',
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },

    // Open Graph optimisé
    openGraph: {
      type: 'article',
      title: recipe.name,
      description: seoDescription,
      url: `https://yumiso.fr/recipes/${slug}`,
      siteName: 'Yumiso',
      locale: 'fr_FR',
      images: recipe.imageUrl ? [{
        url: recipe.imageUrl,
        width: 1200,
        height: 630,
        alt: `Photo de ${recipe.name}`,
      }] : undefined,
      publishedTime: recipe.createdAt?.toISOString(),
      modifiedTime: recipe.updatedAt?.toISOString(),
      authors: [recipe.author || 'Yumiso'],
      tags: tags.split(', ').filter(Boolean),
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: recipe.name,
      description: seoDescription,
      images: recipe.imageUrl ? [recipe.imageUrl] : undefined,
      creator: '@yumiso_fr',
      site: '@yumiso_fr',
    },

    // Autres métadonnées
    category: categoryLabel,
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

  // Génération du structured data JSON-LD pour le SEO (Schema.org Recipe)
  const totalTime = recipe.preparationTime + recipe.cookingTime;
  const categoryLabels: Record<string, string> = {
    'starter': 'Entrée',
    'main_dish': 'Plat principal',
    'dessert': 'Dessert',
    'side_dish': 'Accompagnement',
    'soup': 'Soupe',
    'salad': 'Salade',
    'breakfast': 'Petit-déjeuner',
    'snack': 'Collation',
    'drink': 'Boisson',
    'sauce': 'Sauce',
    'appetizer': 'Apéritif',
    'pastry': 'Pâtisserie',
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description || `Recette de ${recipe.name}`,
    image: recipe.imageUrl ? [recipe.imageUrl] : undefined,
    author: {
      '@type': 'Person',
      name: recipe.author || 'Yumiso',
    },
    datePublished: recipe.createdAt?.toISOString(),
    dateModified: recipe.updatedAt?.toISOString(),
    prepTime: `PT${recipe.preparationTime}M`,
    cookTime: `PT${recipe.cookingTime}M`,
    totalTime: `PT${totalTime}M`,
    recipeCategory: categoryLabels[recipe.category.toLowerCase()] || 'Recette',
    recipeCuisine: 'Française',
    recipeYield: `${recipe.servings || 4} personnes`,
    keywords: recipe.recipeTags?.map(rt => rt.tag.name).join(', '),
    nutrition: recipe.caloriesPerServing ? {
      '@type': 'NutritionInformation',
      calories: `${recipe.caloriesPerServing} calories`,
    } : undefined,
    aggregateRating: recipe.rating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating.toString(),
      ratingCount: comments?.length || 0,
      bestRating: '5',
      worstRating: '1',
    } : undefined,
    recipeIngredient: recipe.ingredientGroups?.length > 0
      ? recipe.ingredientGroups.flatMap(group =>
          group.ingredients.map(ing => ing.name)
        )
      : recipe.ingredients?.map(ing => ing.name) || [],
    recipeInstructions: recipe.steps?.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: step.text,
    })) || [],
    url: `https://yumiso.fr/recipes/${recipe.slug}`,
  };

  return (
    <RecipeProvider recipe={recipeData as Recipe}>
      {/* Structured Data JSON-LD pour le SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
