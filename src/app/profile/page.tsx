import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChefHat, Heart, Shield, User as UserIcon, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { PseudoEditor } from "@/components/profile/pseudo-editor";
import { checkUserPremium } from "@/lib/premium";

export const metadata: Metadata = {
  title: "Mon profil | Yumiso",
  description: "Gérez votre profil et vos recettes",
};

const roleLabels = {
  OWNER: { label: "Propriétaire", icon: Shield, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/40" },
  ADMIN: { label: "Administrateur", icon: Shield, color: "text-red-500 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/40" },
  CONTRIBUTOR: { label: "Contributeur", icon: ChefHat, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/40" },
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
          slug: true,
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
  const premiumInfo = await checkUserPremium(user.id);

  return (
    <main className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 pb-8">
      {/* Profile Header Card */}
      <section className="mx-auto max-w-screen-xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Card className="mb-6 overflow-hidden dark:bg-stone-800/90 dark:border-stone-700">
          <div className="bg-gradient-to-r from-emerald-700 to-green-600 dark:from-emerald-600 dark:to-green-700 p-4 sm:p-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white/30">
                <AvatarImage src={user.image || ""} alt={user.pseudo || user.name || "User"} />
                <AvatarFallback className="text-xl sm:text-2xl bg-white text-amber-500">
                  {(user.pseudo || user.name)?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">{user.pseudo || user.name}</h1>
                  <PseudoEditor currentPseudo={user.pseudo} />
                </div>
                <p className="text-white/80 text-sm mt-1">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${role.bg} ${role.color} text-xs sm:text-sm font-medium`}>
                    <RoleIcon className="h-3.5 w-3.5" />
                    {role.label}
                  </div>
                  {premiumInfo.isPremium && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs sm:text-sm font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      Premium
                    </div>
                  )}
                  <span className="text-white/60 text-xs">
                    • Membre depuis {new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats - Clickable Cards */}
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <Link href="/profile/recipes">
            <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Mes recettes
                </CardTitle>
                <ChefHat className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{user._count.recipes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  recettes créées
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile/favorites">
            <Card className="p-2 dark:bg-stone-800/90 dark:border-stone-700 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                  Mes favoris
                </CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold text-stone-900 dark:text-stone-100">{user._count.favorites}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  recettes sauvegardées
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* My Recipes Preview */}
        {user.recipes.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Mes dernières recettes</h2>
              <Link href="/profile/recipes" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4">
              {user.recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.slug || recipe.id}`}
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
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-emerald-400 to-green-500">
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
                {(user.role === "CONTRIBUTOR" || user.role === "ADMIN" || user.role === "OWNER") && (
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
                {(user.role === "ADMIN" || user.role === "OWNER") && (
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
