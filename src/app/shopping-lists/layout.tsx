import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listes de courses | Yumiso",
  description: "Gérez vos listes de courses intelligentes, optimisez vos achats et synchronisez en temps réel avec vos proches sur Yumiso.",
};

export default function ShoppingListsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
