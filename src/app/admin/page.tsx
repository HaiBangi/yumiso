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
  const stats = {
    totalUsers: users.length,
    owners: users.filter((u) => u.role === "OWNER").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    contributors: users.filter((u) => u.role === "CONTRIBUTOR").length,
    readers: users.filter((u) => u.role === "READER").length,
    totalRecipes,
  };

  // Get activity logs
  const { logs, pagination } = await getActivityLogs({ page: 1, perPage: 50 });

  // Serialiser les dates pour éviter les problèmes de sérialisation
  const serializedLogs = logs.map((log: any) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    user: {
      ...log.user,
    },
  })) as any;

  // Déterminer l'onglet initial (par défaut: logs)
  const initialTab = params.tab === 'users' ? 'users' : params.tab === 'stats' ? 'stats' : 'logs';

  return (
    <AdminTabs
      initialTab={initialTab}
      stats={stats}
      users={sortedUsers}
      currentUserId={session.user.id}
      isOwner={isOwner}
      logs={serializedLogs}
      pagination={pagination}
    />
  );
}

