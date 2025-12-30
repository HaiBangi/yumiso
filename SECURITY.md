# 🔐 GUIDE DE SÉCURITÉ - YUMISO

## ✅ MESURES DE SÉCURITÉ IMPLÉMENTÉES

### 1. **AUTHENTIFICATION & AUTORISATION**

#### ✅ Authentification requise
- Toutes les routes API de modification (POST/PUT/DELETE) requièrent l'authentification
- Utilisation de NextAuth.js avec session sécurisée
- Vérification systématique de `session.user.id`

#### ✅ Autorisation basée sur les rôles
- `requireAuth()` - Vérifie que l'utilisateur est connecté
- `requireAdmin()` - Vérifie que l'utilisateur est admin ou owner
- `requireOwnerOrAdmin()` - Vérifie que l'utilisateur est propriétaire de la ressource ou admin

#### ✅ Protection des ressources
```typescript
// Exemple: Seul le propriétaire ou un admin peut supprimer une recette
const ownerCheck = await requireOwnerOrAdmin(request, recipe.userId);
if (ownerCheck instanceof NextResponse) {
  return ownerCheck; // 403 Forbidden
}
```

---

### 2. **RATE LIMITING**

#### ✅ Limitation des requêtes
- **Création de recettes**: 20 requêtes/minute par utilisateur
- **Mise à jour de recettes**: 30 requêtes/minute par utilisateur
- **Suppression de recettes**: 10 requêtes/minute par utilisateur
- **API générale**: 100 requêtes/minute par utilisateur

#### ✅ Protection contre les attaques DDoS
```typescript
if (!checkRateLimit(`recipe-create-${session.user.id}`, 20, 60000)) {
  return rateLimitResponse(); // 429 Too Many Requests
}
```

**Note pour production**: Utiliser Redis pour un rate limiting distribué

---

### 3. **VALIDATION DES DONNÉES**

#### ✅ Schémas Zod stricts avec limites
- **Noms de recettes**: Max 200 caractères
- **Descriptions**: Max 2000 caractères
- **Étapes**: Max 100 étapes, 5000 caractères par étape
- **Ingrédients**: Max 100 ingrédients par recette
- **Tags**: Max 20 tags, 50 caractères par tag
- **Temps de préparation/cuisson**: Max 24 heures (1440 minutes)
- **Portions**: Max 100

#### ✅ Validation des types
```typescript
const validation = recipeCreateSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    { error: "Validation failed", details: validation.error.flatten() },
    { status: 400 }
  );
}
```

---

### 4. **PROTECTION CONTRE LES INJECTIONS**

#### ✅ SQL Injection
- **Utilisation exclusive de Prisma ORM**: Toutes les requêtes sont paramétrées
- **Aucune requête SQL brute** (`$queryRaw`) dans le code
- **Validation stricte des IDs**: `validateNumericId()` vérifie que les IDs sont des nombres positifs

#### ✅ XSS (Cross-Site Scripting)
- **Sanitization des entrées**: Fonction `sanitizeString()` disponible
- **Content Security Policy (CSP)**: Headers configurés dans le middleware
- **Next.js escaping automatique**: Les templates React échappent automatiquement le HTML

#### ✅ NoSQL Injection
- Prisma protège naturellement contre ce type d'attaque
- Validation Zod avant toute requête

---

### 5. **PROTECTION CSRF**

#### ✅ Vérification de l'origine
```typescript
// Dans middleware.ts
const origin = request.headers.get('origin');
const host = request.headers.get('host');

if (origin && host) {
  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    return NextResponse.json(
      { error: 'CSRF détecté: origine non autorisée' },
      { status: 403 }
    );
  }
}
```

#### ✅ Validation du Content-Type
- Les requêtes POST/PUT/DELETE doivent avoir `Content-Type: application/json`
- Exception pour `multipart/form-data` (upload de fichiers)

---

### 6. **HEADERS DE SÉCURITÉ**

#### ✅ Headers configurés (middleware.ts)

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [politique stricte]
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### ✅ Content Security Policy (CSP)
- Scripts: uniquement depuis 'self' et domaines whitelistés
- Styles: 'self' et Google Fonts
- Images: 'self', data:, https:
- Connexions: API autorisées (OpenAI, YouTube, Unsplash)
- **Frame-ancestors: none** (protection clickjacking)

---

### 7. **PROTECTION DES DONNÉES SENSIBLES**

#### ✅ Variables d'environnement
- **NEXTAUTH_SECRET**: Clé secrète pour les sessions (minimum 32 caractères)
- **API Keys**: Stockées dans `.env.local` (jamais committées)
- **DATABASE_URL**: Connexion sécurisée à la base de données

#### ✅ Fichiers exclus de Git
```gitignore
.env
.env.local
.env.*.local
```

#### ✅ Soft Delete
- Les recettes supprimées ne sont pas effacées de la DB
- Champ `deletedAt` pour récupération possible
- Protection contre la perte de données

---

### 8. **PROTECTION CONTRE LES REQUÊTES VOLUMINEUSES**

#### ✅ Limite de taille
- **Maximum 10MB** par requête
- Vérification dans le middleware
```typescript
const maxSize = 10 * 1024 * 1024; // 10MB
if (size > maxSize) {
  return NextResponse.json(
    { error: 'Requête trop volumineuse (max 10MB)' },
    { status: 413 }
  );
}
```

---

### 9. **LOGGING & MONITORING**

#### ✅ Logs d'erreurs
- Tous les endpoints loggent les erreurs avec `console.error()`
- Messages génériques côté client, détails en logs serveur

#### ✅ Pas d'exposition de données sensibles
```typescript
// ❌ MAUVAIS
return NextResponse.json({ error: error.message });

// ✅ BON
console.error("Failed to delete recipe:", error);
return NextResponse.json(
  { error: "Failed to delete recipe" },
  { status: 500 }
);
```

---

### 10. **PRÉVENTION DES RACE CONDITIONS**

#### ✅ Vérifications atomiques
- Vérification d'existence avant suppression/mise à jour
- Utilisation de transactions Prisma pour les opérations complexes

---

## 🚨 CHECKLIST PRÉ-PRODUCTION

### Avant de déployer en production :

- [ ] Changer `NEXTAUTH_SECRET` (générer avec `openssl rand -base64 32`)
- [ ] Configurer un vrai système de rate limiting (Redis)
- [ ] Activer HTTPS uniquement (redirection HTTP → HTTPS)
- [ ] Configurer les CORS correctement pour votre domaine
- [ ] Mettre à jour les CSP avec vos domaines de production
- [ ] Activer les logs centralisés (Sentry, LogRocket, etc.)
- [ ] Configurer les backups automatiques de la base de données
- [ ] Tester toutes les routes avec un scanner de vulnérabilités (OWASP ZAP)
- [ ] Activer 2FA pour les comptes admin
- [ ] Mettre en place un WAF (Web Application Firewall) si possible
- [ ] Configurer les limites de connexion DB (pool de connexions)
- [ ] Documenter tous les endpoints et leurs permissions

---

## 🛡️ BONNES PRATIQUES

### Pour les développeurs :

1. **Toujours valider les entrées utilisateur** avec Zod
2. **Toujours vérifier l'authentification** sur les routes sensibles
3. **Ne jamais exposer d'erreurs détaillées** au client
4. **Utiliser des transactions** pour les opérations multi-étapes
5. **Tester les permissions** avec différents rôles d'utilisateurs
6. **Ne jamais stocker de mots de passe en clair**
7. **Utiliser HTTPS en production**
8. **Garder les dépendances à jour** (npm audit)
9. **Ne jamais committer les secrets** (.env dans .gitignore)
10. **Limiter les données retournées** (ne pas tout exposer)

---

## 📚 RESSOURCES

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Next.js Security**: https://nextjs.org/docs/advanced-features/security-headers
- **Prisma Security**: https://www.prisma.io/docs/concepts/components/prisma-client/security
- **NextAuth.js**: https://next-auth.js.org/configuration/options

---

## 🔄 MAINTENANCE

### Mises à jour régulières :

```bash
# Vérifier les vulnérabilités
npm audit

# Corriger automatiquement
npm audit fix

# Mise à jour des dépendances
npm update
```

---

**Dernière mise à jour**: 2025-01-30  
**Version de sécurité**: 1.0.0
