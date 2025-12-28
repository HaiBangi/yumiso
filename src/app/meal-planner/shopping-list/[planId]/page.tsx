"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

/**
 * Page de redirection depuis /meal-planner/shopping-list/[planId] vers /shopping-lists/[listId]
 * 
 * Cette page trouve la ShoppingList associée au WeeklyMealPlan et redirige vers la nouvelle URL.
 */
export default function ShoppingListRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const planId = params.planId as string;
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/meal-planner/shopping-list/${planId}`);
      return;
    }
    
    if (status !== "authenticated") return;

    async function findAndRedirect() {
      try {
        // Chercher la ShoppingList liée à ce plan
        const res = await fetch(`/api/shopping-lists?planId=${planId}`);
        
        if (!res.ok) {
          setError("Erreur lors de la recherche de la liste");
          return;
        }

        const lists = await res.json();
        
        // Trouver la liste liée à ce plan
        const linkedList = lists.find((list: { weeklyMealPlanId: number }) => 
          list.weeklyMealPlanId === parseInt(planId)
        );
        
        if (linkedList) {
          // Rediriger vers la nouvelle URL
          router.replace(`/shopping-lists/${linkedList.id}`);
        } else {
          setError("Liste de courses non trouvée pour ce menu");
          setTimeout(() => router.push("/shopping-lists"), 2000);
        }
      } catch (err) {
        console.error("Erreur:", err);
        setError("Erreur lors de la redirection");
        setTimeout(() => router.push("/shopping-lists"), 2000);
      }
    }

    findAndRedirect();
  }, [status, planId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-stone-500">{error}</p>
        <p className="text-sm text-stone-400">Redirection en cours...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm text-stone-500">Redirection vers la liste de courses...</p>
    </div>
  );
}
