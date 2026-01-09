import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CollectionsManager } from "@/components/profile/collections-manager";

export const metadata: Metadata = {
  title: "Mes collections | Yumiso",
  description: "Organisez vos recettes préférées en collections thématiques et retrouvez-les facilement.",
};

async function getUserCollections(userId: string) {
  const collections = await db.collection.findMany({
    where: { userId },
    include: {
      _count: {
        select: { recipes: true }
      },
      recipes: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          imageUrl: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return { collections };
}

async function CollectionsContent({ userId }: { userId: string }) {
  const { collections } = await getUserCollections(userId);

  return (
    <CollectionsManager 
      collections={collections}
    />
  );
}

export default async function CollectionsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white dark:from-stone-900 dark:to-stone-800 pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Mes collections
          </h1>
          <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400">
            Organisez vos recettes préférées dans des collections personnalisées
          </p>
        </div>

        {/* Collections Manager */}
        <Suspense fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-24 bg-stone-200 dark:bg-stone-700 rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-20 bg-stone-200 dark:bg-stone-700 rounded-md mb-3" />
                    <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }>
          <CollectionsContent userId={session.user.id} />
        </Suspense>
      </div>
    </div>
  );
}
