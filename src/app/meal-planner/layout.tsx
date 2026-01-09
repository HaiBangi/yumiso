import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planificateur de repas | Yumiso",
  description: "Organisez vos menus de la semaine, planifiez vos repas et générez automatiquement vos listes de courses avec Yumiso.",
};

export default function MealPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
