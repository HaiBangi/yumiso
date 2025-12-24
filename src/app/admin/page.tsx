import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shield, Users, ChefHat } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRoleManager } from "@/components/admin/user-role-manager";

export const metadata: Metadata = {
  title: "Administration | Yumiso",
  description: "Panneau d'administration",
};

export default async function AdminPage() {
  const session = await auth();

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Stats */}
      <section className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recettes
              </CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{stats.totalRecipes}</div>
            </CardContent>
          </Card>

          <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contributeurs
              </CardTitle>
              <ChefHat className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.contributors}</div>
            </CardContent>
          </Card>

          <Card className="pb-4 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Admins
              </CardTitle>
              <Shield className="h-4 w-4 text-red-500 dark:text-red-400" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.admins}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="pb-6 dark:bg-stone-800/90 dark:border-stone-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-stone-900 dark:text-stone-100">Gestion des utilisateurs</CardTitle>
            <CardDescription className="dark:text-stone-400">
              Modifiez les rôles des utilisateurs pour contrôler leurs permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <UserRoleManager users={sortedUsers} currentUserId={session.user.id} isOwner={isOwner} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

