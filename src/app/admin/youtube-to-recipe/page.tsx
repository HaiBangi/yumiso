import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { YoutubeToRecipeClient } from "./youtube-to-recipe-client";

export const metadata: Metadata = {
  title: "YouTube to Recipe | Yumiso",
  description: "Convertir une vidéo YouTube en recette",
};

export default async function YoutubeToRecipePage() {
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <YoutubeToRecipeClient />
    </main>
  );
}
