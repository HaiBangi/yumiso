# CLAUDE.md

Yumiso is a recipe management app (Next.js 16 App Router, TypeScript strict, PostgreSQL + Prisma Accelerate, NextAuth.js v5, Tailwind v4 + ShadCN, TanStack Query, OpenAI, SSE).

## Dev Commands

```bash
npm run dev          # localhost:3000
npm run build        # Prisma generate + build
npm run lint
npx prisma studio
npm run db:migrate   # create + apply migration
npm run db:seed
npm run db:reset     # drops all data
```

## Architecture

### Auth & Roles
- Roles: `ADMIN`, `OWNER` (premium), `CONTRIBUTOR`, `READER`
- `src/lib/auth.ts`: `auth()`, `signIn()`, `signOut()`
- `src/lib/premium.ts`: `requirePremium()`, `checkUserPremium()`
- `src/lib/api-security.ts`: `requireAuth()`, `requireAdmin()`, `requireOwnerOrAdmin()`

### Data Layer
- Prisma schema: `prisma/schema.prisma` (source of truth)
- Server Actions (`src/actions/*.ts`): mutations + Server Component fetching
- API Routes (`src/app/api/**/*.ts`): client-side REST
- Validation: `src/lib/validations.ts` (Zod)

### Key Details
- Recipes: slug-based URLs, ingredient groups, `DRAFT`/`PRIVATE`/`PUBLIC` status, soft-delete (`deletedAt`)
- SSE: shopping list real-time sync via singleton `SSEManager` (`src/lib/sse-manager.ts`)
- AI: `parseGPTJson()` in `src/lib/chatgpt-helpers.ts`; images via Unsplash
- DB: always filter `deletedAt`, indexes on `userId`/`deletedAt`/`slug`/`category`
- Images: unoptimized (saves Vercel quota), sources are pre-optimized
- Rate limiting: in-memory (`src/lib/api-security.ts`); use Redis in production
- `sanitizeString()` for XSS prevention

### Premium Features (OWNER/ADMIN)
AI recipe generation (YouTube/TikTok), multi-URL import (max 3 parallel), voice import, AI menu generation, shopping list optimization.

## Environment Variables

```
PRISMA_DATABASE_URL, POSTGRES_URL
NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
OPENAI_API_KEY, UNSPLASH_ACCESS_KEY
PROXY_URL  # optional, YouTube import in prod
```

## Deployment
Vercel. Redirects `yumiso.vercel.app` → `yumiso.fr`. PWA enabled in prod. Turbopack. No console.log in prod.

## Key Files
- `src/lib/db.ts` — Prisma singleton
- `src/lib/auth.ts` — NextAuth config
- `src/lib/validations.ts` — Zod schemas
- `src/lib/api-security.ts` — security utils
- `src/lib/premium.ts` — premium checks
- `src/lib/sse-manager.ts` — SSE manager
- `prisma/schema.prisma` — DB schema
- `next.config.ts` — Next.js config

## Features → Files

### Auth
- Config: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- UI: `src/app/auth/signin/page.tsx`, `src/components/auth/sign-in-button.tsx`, `src/components/auth/pseudo-banner.tsx`
- Pseudo editor: `src/components/profile/pseudo-editor.tsx`

### Recipes
- Pages: `src/app/recipes/page.tsx`, `src/app/recipes/[slug]/page.tsx`
- API: `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`, `src/app/api/recipes/autocomplete/route.ts`
- Actions: `src/actions/recipes.ts`
- Form/context: `src/components/recipes/recipe-context.tsx`, `src/components/recipes/recipe-form-components.tsx`
- List/views: `src/components/recipes/recipe-list.tsx`, `src/components/recipes/recipe-list-view.tsx`, `src/components/recipes/view-toggle.tsx`
- Hooks: `src/hooks/use-recipe-query.ts`, `src/hooks/use-prefetch-recipe.ts`
- Helpers: `src/lib/slug-helpers.ts`, `src/lib/recipe-status.ts`, `src/lib/recipe-cache.ts`, `src/lib/ingredient-helpers.ts`
- Search/filters: `src/components/recipes/desktop-search-bar.tsx`, `src/components/recipes/mobile-search-bar.tsx`, `src/components/recipes/quick-filters.tsx`, `src/components/recipes/advanced-filters.tsx`, `src/components/recipes/recipe-pagination.tsx`
- Sort: `src/hooks/use-sort-preference.ts`, `src/hooks/use-favorites-first-preference.ts`

### AI Import — Premium
- YouTube: `src/app/api/youtube/generate-recipe/route.ts`, `src/app/api/youtube/transcript/route.ts`, `src/lib/youtube-errors.ts`
- TikTok: `src/app/api/tiktok/extract/route.ts`
- Multi-URL: `src/app/api/recipes/multi-import/route.ts`, `src/components/recipes/multi-import-form.tsx`
- Voice: `src/components/recipes/voice-to-text-import.tsx`
- Optimize: `src/app/api/recipes/optimize/route.ts`, `src/components/recipes/recipe-optimize-loader.tsx`

### Favorites, Notes, Collections
- Actions: `src/actions/favorites.ts`, `src/actions/notes.ts`, `src/actions/collections.ts`
- Collections UI: `src/components/profile/collections-manager.tsx`, `src/components/profile/collection-detail.tsx`, `src/components/recipes/add-to-collection.tsx`
- Pages: `src/app/profile/favorites/page.tsx`, `src/app/notes/page.tsx`, `src/app/profile/collections/page.tsx`

### Comments, Ratings, Tags, Authors
- Actions: `src/actions/comments.ts`, `src/actions/tags.ts`, `src/actions/authors.ts`
- UI: `src/components/recipes/recipe-comments.tsx`, `src/components/recipes/tag-input.tsx`, `src/components/recipes/author-autocomplete.tsx`
- Helper: `src/lib/rating-helper.ts`

### Meal Planner
- Page: `src/app/meal-planner/page.tsx`
- Plan API: `src/app/api/meal-planner/create/route.ts`, `src/app/api/meal-planner/[planId]/route.ts`, `src/app/api/meal-planner/plan/[id]/route.ts`
- Meal API: `src/app/api/meal-planner/meal/route.ts`, `src/app/api/meal-planner/meal/[id]/route.ts`
- UI: `src/components/meal-planner/weekly-calendar.tsx`, `src/components/meal-planner/meal-card.tsx`, `src/components/meal-planner/add-meal-dialog.tsx`, `src/components/meal-planner/edit-meal-dialog.tsx`
- Hook: `src/hooks/use-meal-planner-query.ts`
- AI menu — Premium: `src/app/api/meal-planner/generate-menu/route.ts`, `src/components/meal-planner/generate-menu-dialog.tsx`

### Shopping Lists
- Pages: `src/app/meal-planner/shopping-list/[planId]/page.tsx`, `src/app/shopping-lists/page.tsx`, `src/app/shopping-lists/[listId]/page.tsx`
- Standalone API: `src/app/api/shopping-lists/route.ts`, `src/app/api/shopping-lists/[listId]/route.ts`, `src/app/api/shopping-lists/[listId]/items/route.ts`
- Plan-based API: `src/app/api/shopping-list/{add,remove,edit,toggle,move,clear-checked}/route.ts`
- UI: `src/components/shopping-lists/shopping-list-content.tsx`, `src/components/shopping-lists/AddItemForm.tsx`, `src/components/shopping-lists/ItemContextMenu.tsx`
- SSE: `src/lib/sse-manager.ts`, `src/app/api/shopping-list/subscribe/[planId]/route.ts`, `src/hooks/use-realtime-shopping-list.ts`, `src/hooks/use-shopping-list-optimistic.ts`
- Stores: `src/app/api/stores/route.ts`, `src/components/shopping-lists/StoreGroupedShoppingList.tsx`, `src/components/shopping-lists/StoreManagementMenu.tsx`
- AI optimize — Premium: `src/app/api/shopping-lists/[listId]/optimize/route.ts`

### Collaboration
- Sharing/contributors API: `src/app/api/meal-planner/plan/[id]/sharing/route.ts`, `src/app/api/shopping-lists/[listId]/contributors/route.ts`
- Invitations API: `src/app/api/invitations/route.ts`, `src/app/api/invitations/[id]/{accept,reject,cancel}/route.ts`
- UI: `src/components/meal-planner/contributors-dialog.tsx`, `src/components/invitations/invitations-dialog.tsx`
- Hook: `src/hooks/use-invitations.ts`

### Profile & Users
- Actions: `src/actions/users.ts`
- Pages: `src/app/profile/page.tsx`, `src/app/users/[id]/page.tsx`
- API: `src/app/api/users/search/route.ts`, `src/app/api/user/premium/route.ts`

### Admin
- Page: `src/app/admin/page.tsx`
- UI: `src/components/admin/admin-tabs.tsx`, `src/components/admin/user-role-manager.tsx`, `src/components/admin/stores-manager.tsx`, `src/components/admin/activity-logs-viewer.tsx`
- Logger: `src/lib/activity-logger.ts`

### Premium Gating
- Server: `src/lib/premium.ts`
- Client: `src/components/premium/premium-gate.tsx`, `src/hooks/use-premium.ts`

### Layout & PWA
- Layout: `src/app/layout.tsx`, `src/components/layout/app-header.tsx`
- PWA: `src/components/pwa/pwa-provider.tsx`, `src/app/_offline/page.tsx`
