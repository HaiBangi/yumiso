"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: Role) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  // Check if current user is admin or owner
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "OWNER")) {
    return { success: false, error: "Accès refusé" };
  }

  // Prevent changing own role
  if (userId === session.user.id) {
    return { success: false, error: "Vous ne pouvez pas modifier votre propre rôle" };
  }

  // Get target user to check their role
  const targetUser = await db.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    return { success: false, error: "Utilisateur non trouvé" };
  }

  // OWNER cannot be changed by anyone
  if (targetUser.role === "OWNER") {
    return { success: false, error: "Le rôle OWNER ne peut pas être modifié" };
  }

  // Only OWNER can promote to ADMIN or modify ADMIN roles
  if (currentUser.role === "ADMIN") {
    if (targetUser.role === "ADMIN") {
      return { success: false, error: "Seul le OWNER peut modifier le rôle d'un administrateur" };
    }
    if (newRole === "ADMIN") {
      return { success: false, error: "Seul le OWNER peut promouvoir quelqu'un en administrateur" };
    }
  }

  // Cannot promote to OWNER
  if (newRole === "OWNER") {
    return { success: false, error: "Le rôle OWNER ne peut pas être attribué" };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function updateUserPseudo(pseudo: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié" };
  }

  if (!pseudo.trim() || pseudo.length > 50) {
    return { success: false, error: "Pseudo invalide (1-50 caractères)" };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { pseudo: pseudo.trim() },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Error updating pseudo:", error);
    return { success: false, error: "Erreur lors de la mise à jour" };
  }
}

export async function getUserPseudo(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pseudo: true },
  });
  return user?.pseudo || "Anonyme";
}

