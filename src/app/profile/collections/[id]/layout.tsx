import type { Metadata } from "next";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface LayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();

  try {
    const collection = await db.collection.findUnique({
      where: {
        id: parseInt(id),
        userId: session?.user?.id || "",
      },
      select: {
        name: true,
        _count: {
          select: { recipes: true },
        },
      },
    });

    if (!collection) {
      return {
        title: "Collection | Yumiso",
        description: "Organisez vos recettes en collections",
      };
    }

    const recipeCount = collection._count.recipes;
    return {
      title: `${collection.name} | Yumiso`,
      description: `Découvrez ${recipeCount} recette${recipeCount > 1 ? "s" : ""} dans la collection "${collection.name}".`,
    };
  } catch {
    return {
      title: "Collection | Yumiso",
      description: "Organisez vos recettes en collections",
    };
  }
}

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
