import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { logActivity, ActivityAction } from "./activity-logger";
import type { Adapter } from "next-auth/adapters";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  events: {
    async createUser({ user }) {
      // Logger l'inscription
      if (!user.id) return;

      try {
        await logActivity({
          userId: user.id,
          action: ActivityAction.USER_SIGNUP,
          details: {
            email: user.email,
          },
        });
      } catch (error) {
        console.error("Failed to log signup activity:", error);
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Logger la connexion (sauf pour les nouvelles inscriptions qui sont loggées dans createUser)
      if (user.id) {
        try {
          // On logge chaque connexion
          await logActivity({
            userId: user.id,
            action: ActivityAction.USER_LOGIN,
            details: {
              provider: account?.provider,
            },
          });
        } catch (error) {
          // Ne pas bloquer la connexion si le logging échoue
          console.error("Failed to log activity:", error);
        }
      }
      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.pseudo = user.pseudo;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

