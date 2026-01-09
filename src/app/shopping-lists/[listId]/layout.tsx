import type { Metadata } from "next";
import { db } from "@/lib/db";

interface LayoutProps {
  params: Promise<{ listId: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ listId: string }> }): Promise<Metadata> {
  const { listId } = await params;

  try {
    const list = await db.shoppingList.findUnique({
      where: { id: parseInt(listId) },
      select: { name: true },
    });

    if (!list) {
      return {
        title: "Liste de courses | Yumiso",
        description: "Gérez votre liste de courses intelligente",
      };
    }

    return {
      title: `${list.name} | Yumiso`,
      description: `Gérez votre liste de courses "${list.name}" en temps réel avec vos proches.`,
    };
  } catch {
    return {
      title: "Liste de courses | Yumiso",
      description: "Gérez votre liste de courses intelligente",
    };
  }
}

export default function ShoppingListLayout({ children }: { children: React.ReactNode }) {
  return children;
}
