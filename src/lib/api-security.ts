/**
 * Middleware de sécurité pour les API routes
 * Centralise l'authentification et les vérifications de sécurité
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "next-auth";

/**
 * Vérifie que l'utilisateur est authentifié
 */
export async function requireAuth(request: NextRequest): Promise<{ session: Session } | NextResponse> {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Non authentifié. Veuillez vous connecter." },
      { status: 401 }
    );
  }
  
  return { session };
}

/**
 * Vérifie que l'utilisateur est admin
 */
export async function requireAdmin(request: NextRequest): Promise<{ session: Session } | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const { session } = authResult;
  
  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Accès refusé. Permissions administrateur requises." },
      { status: 403 }
    );
  }
  
  return { session };
}

/**
 * Vérifie que l'utilisateur a accès à une ressource (propriétaire ou admin)
 */
export async function requireOwnerOrAdmin(
  request: NextRequest,
  resourceUserId: string
): Promise<{ session: Session; isOwner: boolean; isAdmin: boolean } | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const { session } = authResult;
  const isOwner = session.user.id === resourceUserId;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
  
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Accès refusé. Vous n'êtes pas propriétaire de cette ressource." },
      { status: 403 }
    );
  }
  
  return { session, isOwner, isAdmin };
}

/**
 * Validation et sanitization d'un ID numérique
 */
export function validateNumericId(id: string, fieldName: string = "id"): number | NextResponse {
  const numId = parseInt(id, 10);
  
  if (isNaN(numId) || numId <= 0) {
    return NextResponse.json(
      { error: `${fieldName} invalide. Doit être un nombre positif.` },
      { status: 400 }
    );
  }
  
  return numId;
}

/**
 * Rate limiting simple (en mémoire)
 * Pour production, utiliser Redis
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Trop de requêtes. Veuillez réessayer plus tard." },
    { status: 429 }
  );
}

/**
 * Sanitize input pour éviter XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Vérifie que le Content-Type est JSON
 */
export function validateContentType(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type');
  return contentType?.includes('application/json') ?? false;
}

/**
 * Nettoyer la carte de rate limiting (appeler périodiquement)
 */
export function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup toutes les 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitMap, 5 * 60 * 1000);
}
