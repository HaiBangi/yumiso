import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shield, Users, ChefHat, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { UserRoleManager } from "@/components/admin/user-role-manager";

export const metadata: Metadata = {
  title: "Administration | Gourmiso",
  description: "Panneau d'administration",
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user is admin
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (user?.role !== "ADMIN") {
    redirect("/recipes");
  }

  // Get all users
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
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

  // Stats
  const totalRecipes = await db.recipe.count();
  const stats = {
    totalUsers: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    contributors: users.filter((u) => u.role === "CONTRIBUTOR").length,
    readers: users.filter((u) => u.role === "READER").length,
    totalRecipes,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-500">
        <div className="mx-auto max-w-screen-xl px-4 py-4 sm:px-6 sm:py-6">
          <Link
            href="/recipes"
            className="text-white/80 hover:text-white text-sm mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux recettes
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Administration</h1>
              <p className="text-white/80 text-sm">Gérez les utilisateurs et les rôles</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Utilisateurs
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recettes
              </CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRecipes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contributeurs
              </CardTitle>
              <ChefHat className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.contributors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Admins
              </CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.admins}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gestion des utilisateurs</CardTitle>
            <CardDescription>
              Modifiez les rôles des utilisateurs pour contrôler leurs permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserRoleManager users={users} currentUserId={session.user.id} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

