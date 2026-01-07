import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { getActivityLogs } from "@/lib/activity-logger";

export const metadata: Metadata = {
  title: "Administration | Yumiso",
  description: "Panneau d'administration",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user is admin or owner
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    redirect("/recipes");
  }

  const isOwner = user.role === "OWNER";

  // Get all users - sorted by role (OWNER > ADMIN > CONTRIBUTOR > READER) then by name
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      pseudo: true,
      image: true,
      role: true,
      isPremium: true,
      premiumUntil: true,
      createdAt: true,
      _count: {
        select: {
          recipes: true,
          favorites: true,
        },
      },
    },
  });

  // Sort by role priority then by name
  const roleOrder = { OWNER: 0, ADMIN: 1, CONTRIBUTOR: 2, READER: 3 };
  const sortedUsers = users.sort((a, b) => {
    const roleCompare = roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
    if (roleCompare !== 0) return roleCompare;
    return (a.name || "").localeCompare(b.name || "", "fr");
  });

  // Stats
  const totalRecipes = await db.recipe.count({ where: { deletedAt: null } });

  // Users stats
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const newUsersThisMonth = await db.user.count({
    where: {
      createdAt: { gte: oneMonthAgo },
      deletedAt: null,
    },
  });

  // Recipes stats
  const publicRecipes = await db.recipe.count({
    where: { status: "PUBLIC", deletedAt: null },
  });
  const privateRecipes = await db.recipe.count({
    where: { status: "PRIVATE", deletedAt: null },
  });
  const newRecipesThisMonth = await db.recipe.count({
    where: {
      createdAt: { gte: oneMonthAgo },
      deletedAt: null,
    },
  });

  const avgRatingData = await db.recipe.aggregate({
    where: { deletedAt: null, ratingCount: { gt: 0 } },
    _avg: { rating: true },
  });

  const totalViewsData = await db.recipe.aggregate({
    where: { deletedAt: null },
    _sum: { viewsCount: true },
  });

  // Engagement stats
  const totalComments = await db.comment.count({ where: { deletedAt: null } });
  const totalFavorites = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "_UserFavorites"
  `;

  // Collections stats
  const totalCollections = await db.collection.count();
  const collectionsWithRecipes = await db.collection.findMany({
    include: { _count: { select: { recipes: true } } },
  });
  const avgRecipesPerCollection =
    collectionsWithRecipes.length > 0
      ? collectionsWithRecipes.reduce((acc, c) => acc + c._count.recipes, 0) / collectionsWithRecipes.length
      : 0;

  // Activity stats
  const totalLogs = await db.userActivityLog.count();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const logsToday = await db.userActivityLog.count({
    where: { createdAt: { gte: today } },
  });
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const logsThisWeek = await db.userActivityLog.count({
    where: { createdAt: { gte: oneWeekAgo } },
  });

  const stats = {
    users: {
      total: users.length,
      owners: users.filter((u) => u.role === "OWNER").length,
      admins: users.filter((u) => u.role === "ADMIN").length,
      contributors: users.filter((u) => u.role === "CONTRIBUTOR").length,
      readers: users.filter((u) => u.role === "READER").length,
      newThisMonth: newUsersThisMonth,
    },
    recipes: {
      total: totalRecipes,
      public: publicRecipes,
      private: privateRecipes,
      avgRating: avgRatingData._avg.rating || 0,
      totalViews: totalViewsData._sum.viewsCount || 0,
      thisMonth: newRecipesThisMonth,
    },
    engagement: {
      totalComments,
      avgCommentsPerRecipe: totalRecipes > 0 ? totalComments / totalRecipes : 0,
      totalFavorites: Number(totalFavorites[0]?.count || 0),
    },
    collections: {
      total: totalCollections,
      avgRecipesPerCollection,
    },
    activity: {
      totalLogs,
      logsToday,
      logsThisWeek,
    },
  };

  // Get activity logs
  const { logs, pagination } = await getActivityLogs({ page: 1, perPage: 50 });

  // Get all stores
  const stores = await db.store.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  // Serialiser les dates pour éviter les problèmes de sérialisation
  const serializedLogs = logs.map((log: any) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    user: {
      ...log.user,
    },
  })) as any;

  // Déterminer l'onglet initial (par défaut: logs)
  const initialTab = params.tab === 'users' ? 'users' : params.tab === 'stats' ? 'stats' : params.tab === 'stores' ? 'stores' : 'logs';

  return (
    <AdminTabs
      initialTab={initialTab}
      stats={stats}
      users={sortedUsers}
      currentUserId={session.user.id}
      isOwner={isOwner}
      logs={serializedLogs}
      pagination={pagination}
      stores={stores}
    />
  );
}

