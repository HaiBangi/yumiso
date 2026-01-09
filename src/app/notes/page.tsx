import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserNotes } from "@/actions/notes-user";
import { NotesClient } from "@/components/notes/notes-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes Notes | Yumiso",
  description: "Mes idées de recettes et notes personnelles",
};

export default async function NotesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const notes = await getUserNotes();

  return (
    <div className="bg-gradient-to-br from-stone-50 via-white to-emerald-50/30 dark:from-stone-950 dark:via-stone-900 dark:to-emerald-950/20 pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <NotesClient initialNotes={notes} />
      </div>
    </div>
  );
}
