import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChefHat, Calendar, Heart, BookOpen, Shield, User as UserIcon, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { PseudoEditor } from "@/components/profile/pseudo-editor";

export const metadata: Metadata = {
  title: "Mon profil | Gourmiso",
  description: "Gérez votre profil et vos recettes",
};

const roleLabels = {
  ADMIN: { label: "Administrateur", icon: Shield, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/40" },
  CONTRIBUTOR: { label: "Contributeur", icon: ChefHat, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/40" },
  READER: { label: "Lecteur", icon: UserIcon, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/40" },
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          recipes: true,
          favorites: true,
        },
      },
      recipes: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const role = roleLabels[user.role as keyof typeof roleLabels] || roleLabels.READER;
  const RoleIcon = role.icon;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600">
        <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/recipes" className="text-white/80 hover:text-white text-sm mb-4 inline-block">
            ← Retour aux recettes
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-white/30">
              <AvatarImage src={user.image || ""} alt={user.name || "User"} />
              <AvatarFallback className="text-2xl bg-white text-amber-500">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{user.name}</h1>
              <p className="text-white/80">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${role.bg} ${role.color} text-sm font-medium`}>
                  <RoleIcon className="h-4 w-4" />
                  {role.label}
                </div>
                <PseudoEditor currentPseudo={user.pseudo} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
          <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mes recettes
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{user._count.recipes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                recettes créées
              </p>
            </CardContent>
          </Card>

          <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Favoris
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{user._count.favorites}</div>
              <p className="text-xs text-muted-foreground mt-1">
                recettes sauvegardées
              </p>
            </CardContent>
          </Card>

          <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Membre depuis
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} jours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* My Recipes Preview */}
        {user.recipes.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Mes dernières recettes</h2>
              <Link href="/profile/recipes" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-sm font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
              {user.recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-700 shadow-md hover:shadow-xl transition-all"
                >
                  {recipe.imageUrl ? (
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      fill
                      sizes="(max-width: 640px) 33vw, 16vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-amber-400 to-orange-500">
                      <ChefHat className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">{recipe.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">Actions rapides</h2>
          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow dark:bg-stone-800/90 dark:border-stone-700">
              <Link href="/profile/recipes">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                      <ChefHat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-stone-900 dark:text-stone-100">Mes recettes</CardTitle>
                      <CardDescription className="dark:text-stone-400">Gérez vos créations culinaires</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow dark:bg-stone-800/90 dark:border-stone-700">
              <Link href="/profile/favorites">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                      <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-stone-900 dark:text-stone-100">Mes favoris</CardTitle>
                      <CardDescription className="dark:text-stone-400">Accédez à vos recettes sauvegardées</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>

        {/* Role permissions info */}
        <div className="mt-6 sm:mt-8">
          <Card className="dark:bg-stone-800/90 dark:border-stone-700">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
                <Shield className="h-5 w-5" />
                Vos permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Voir toutes les recettes
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Ajouter aux favoris
                </li>
                {(user.role === "CONTRIBUTOR" || user.role === "ADMIN") && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Créer des recettes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Modifier vos recettes
                    </li>
                  </>
                )}
                {user.role === "ADMIN" && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Modifier toutes les recettes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Gérer les utilisateurs
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
