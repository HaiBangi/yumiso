import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. HEADERS DE SÉCURITÉ
  // Empêche le clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Empêche le MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (ancienne protection, garde pour compatibilité)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Politique de référent
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.openai.com https://www.youtube.com https://api.unsplash.com https://vercel.live wss://ws-*.pusher.com",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', cspDirectives);
  
  // Permissions Policy (anciennement Feature Policy)
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // 2. PROTECTION CSRF pour les requêtes API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const method = request.method;
    
    // Pour les requêtes qui modifient des données
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      
      // Vérifier que l'origine correspond à l'hôte (protection CSRF)
      if (origin && host) {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { error: 'CSRF détecté: origine non autorisée' },
            { status: 403 }
          );
        }
      }
      
      // Pour les requêtes POST/PUT/DELETE, vérifier le Content-Type
      const contentType = request.headers.get('content-type');
      if (method !== 'DELETE' && !contentType?.includes('application/json')) {
        // Exception pour multipart/form-data (upload de fichiers)
        if (!contentType?.includes('multipart/form-data')) {
          return NextResponse.json(
            { error: 'Content-Type invalide' },
            { status: 400 }
          );
        }
      }
    }
  }

  // 3. PROTECTION CONTRE LES REQUÊTES TROP VOLUMINEUSES
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (size > maxSize) {
      return NextResponse.json(
        { error: 'Requête trop volumineuse (max 10MB)' },
        { status: 413 }
      );
    }
  }

  return response;
}

// Configuration du matcher pour appliquer le middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
