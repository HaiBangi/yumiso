import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CollectionDetail } from "@/components/profile/collection-detail";
import { Card, CardContent } from "@/components/ui/card";

async function getCollectionWithRecipes(collectionId: number, userId: string) {
  const collection = await db.collection.findUnique({
    where: {
      id: collectionId,
      userId, // Ensure user owns this collection
    },
    include: {
      recipes: {
        include: {
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
    },
  });

  return collection;
}

async function getAllUserRecipes(_userId: string) {
  const recipes = await db.recipe.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      category: true,
      preparationTime: true,
      cookingTime: true,
    },
    orderBy: { name: 'asc' }
  });

  return recipes;
}

async function CollectionContent({ collectionId, userId }: { collectionId: number; userId: string }) {
  const [collection, allRecipes] = await Promise.all([
    getCollectionWithRecipes(collectionId, userId),
    getAllUserRecipes(userId)
  ]);

  if (!collection) {
    notFound();
  }

  return (
    <CollectionDetail
      collection={collection}
      allRecipes={allRecipes}
    />
  );
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { id } = await params;
  const collectionId = parseInt(id);

  if (isNaN(collectionId)) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white dark:from-stone-900 dark:to-stone-800 pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="space-y-6">
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-4" />
                <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-2/3" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="aspect-video bg-stone-200 dark:bg-stone-700 rounded mb-3" />
                    <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }>
          <CollectionContent collectionId={collectionId} userId={session.user.id} />
        </Suspense>
      </div>
    </div>
  );
}
