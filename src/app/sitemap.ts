import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://yumiso.fr';

  // Pages statiques avec priorités optimisées pour le SEO
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0, // Page d'accueil = priorité maximale
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9, // Page de listing des recettes = très importante
    },
    {
      url: `${baseUrl}/meal-planner`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/shopping-lists`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Récupérer toutes les recettes publiques avec priorités dynamiques
  let recipePages: MetadataRoute.Sitemap = [];
  try {
    const recipes = await db.recipe.findMany({
      where: {
        status: 'PUBLIC',
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
        viewsCount: true,
        rating: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    recipePages = recipes.map((recipe) => {
      // Calculer la priorité basée sur la popularité
      // Plus de vues et meilleur rating = priorité plus élevée
      let priority = 0.7; // Priorité de base pour les recettes

      // Bonus pour les recettes populaires
      if (recipe.viewsCount && recipe.viewsCount > 100) {
        priority = Math.min(0.9, priority + 0.1);
      }

      // Bonus pour les recettes bien notées
      if (recipe.rating >= 4.5) {
        priority = Math.min(0.95, priority + 0.1);
      }

      return {
        url: `${baseUrl}/recipes/${recipe.slug}`,
        lastModified: recipe.updatedAt,
        changeFrequency: 'weekly' as const,
        priority,
      };
    });
  } catch (error) {
    console.error('Error fetching recipes for sitemap:', error);
  }

  // Récupérer les profils publics des utilisateurs
  let userPages: MetadataRoute.Sitemap = [];
  try {
    const users = await db.user.findMany({
      where: {
        deletedAt: null,
        recipes: {
          some: {
            status: 'PUBLIC',
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    userPages = users.map((user) => ({
      url: `${baseUrl}/users/${user.id}`,
      lastModified: user.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
  } catch (error) {
    console.error('Error fetching users for sitemap:', error);
  }

  return [...staticPages, ...recipePages, ...userPages];
}
