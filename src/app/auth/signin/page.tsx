import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInButton } from "@/components/auth/sign-in-button";
import { ChefHat } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connexion | Gourmiso",
  description: "Connectez-vous à votre compte Gourmiso",
};

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/recipes");
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 overflow-auto">
      <div className="w-full max-w-md p-8 my-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg">
            <ChefHat className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Gourmiso
          </span>
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl p-8 border border-emerald-100 dark:border-emerald-900">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-100 mb-2">
              Bienvenue !
            </h1>
            <p className="text-gray-600 dark:text-stone-400">
              Connectez-vous pour sauvegarder vos recettes favorites et créer les vôtres.
            </p>
          </div>

          {/* Google Sign In */}
          <SignInButton
            provider="google"
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-100 dark:border-stone-600"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuer avec Google
          </SignInButton>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-stone-400">
            <p>
              En vous connectant, vous acceptez nos{" "}
              <Link href="/terms" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                conditions d&apos;utilisation
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link
            href="/recipes"
            className="text-sm text-gray-600 dark:text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            ← Retour aux recettes
          </Link>
        </div>
      </div>
    </div>
  );
}

