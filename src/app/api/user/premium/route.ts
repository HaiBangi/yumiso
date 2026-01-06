import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPremiumInfo } from "@/lib/premium";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const premiumInfo = await getUserPremiumInfo(session.user.id);

    return NextResponse.json(premiumInfo);
  } catch (error) {
    console.error("Erreur lors de la récupération du statut premium:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
