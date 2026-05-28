# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yumiso is a modern recipe management application built with Next.js 16, featuring AI-powered recipe generation from YouTube/TikTok videos, meal planning, and intelligent shopping list management. The app supports real-time collaboration, premium features, and PWA capabilities.

## Core Technologies

- **Framework**: Next.js 16 (App Router with Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM (using Prisma Accelerate)
- **Auth**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Styling**: Tailwind CSS v4 with ShadCN UI components
- **Validation**: Zod schemas
- **State Management**: TanStack Query (React Query) for server state
- **AI**: OpenAI API for recipe generation and optimization
- **Real-time**: Server-Sent Events (SSE) via custom SSEManager

## Development Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)

# Building
npm run build                  # Generate Prisma client & build for production
npm run build:pwa             # Build with PWA icons generation
npm start                      # Start production server

# Linting
npm run lint                   # Run ESLint

# Database
npx prisma studio              # Open Prisma Studio UI
npx prisma db push            # Push schema changes to database
npm run db:migrate            # Create and apply a migration
npm run db:seed               # Seed database with initial data
npm run db:reset              # Reset database (drops all data)

# Utilities
npm run pwa:icons             # Generate PWA icons
```

## Architecture Patterns

### Authentication & Authorization

- Authentication is handled via NextAuth.js v5 with session-based auth
- User roles: `ADMIN`, `OWNER` (premium), `CONTRIBUTOR`, `READER`
- Premium features are protected both server-side (API routes) and client-side (UI)
- Use `src/lib/auth.ts` for auth helpers: `auth()`, `signIn()`, `signOut()`
- Use `src/lib/premium.ts` for premium checks: `requirePremium()`, `checkUserPremium()`
- API route security helpers in `src/lib/api-security.ts`: `requireAuth()`, `requireAdmin()`, `requireOwnerOrAdmin()`

### Data Layer

- **Prisma Schema** (`prisma/schema.prisma`): Single source of truth for database models
- **Server Actions** (`src/actions/*.ts`): Used for mutations and data fetching in Server Components
- **API Routes** (`src/app/api/**/*.ts`): RESTful endpoints for client-side operations
- **Validation** (`src/lib/validations.ts`): Centralized Zod schemas for data validation

### Real-time Features

- Shopping lists use SSE for real-time synchronization across users
- SSE connections managed via singleton `SSEManager` in `src/lib/sse-manager.ts`
- Use the `useSSE()` hook for client-side SSE subscriptions
- SSE endpoints: `/api/shopping-list/subscribe/[planId]/route.ts`

### AI Integration

- OpenAI GPT-4 used for recipe generation, optimization, and meal planning
- YouTube transcript extraction via `youtube-transcript` package
- TikTok scraping via `tiktok-scraper-ts` package
- AI response parsing helper: `parseGPTJson()` in `src/lib/chatgpt-helpers.ts`
- Image generation via Unsplash API integration

### State Management

- **Server State**: TanStack Query (React Query) for caching and revalidation
  - Query client configured in `src/lib/query-client.ts`
  - Custom hooks pattern: `use-recipe-query.ts`, `use-meal-planner-query.ts`
- **Local State**: React hooks and Context API (e.g., `RecipeContext` for recipe forms)
- **Optimistic Updates**: Used in shopping lists (`use-shopping-list-optimistic.ts`)

### Component Organization

- `src/components/ui/`: Base ShadCN UI components (Button, Dialog, etc.)
- `src/components/recipes/`: Recipe-specific components
- `src/components/meal-planner/`: Meal planning components
- `src/components/shopping-lists/`: Shopping list components
- `src/components/admin/`: Admin dashboard components
- `src/components/premium/`: Premium feature gates and UI
- `src/components/auth/`: Authentication components

### Routing Structure (App Router)

- `/` - Homepage
- `/recipes` - Recipe listing with filters/search
- `/recipes/[slug]` - Recipe detail page (slug-based URLs)
- `/meal-planner` - Meal planning dashboard
- `/meal-planner/shopping-list/[planId]` - Shopping list view
- `/shopping-lists` - Standalone shopping lists
- `/shopping-lists/[listId]` - Shopping list detail
- `/profile` - User profile with tabs
- `/admin` - Admin dashboard (role-restricted)

## Important Implementation Details

### Recipe Management

- Recipes support **ingredient groups** for organization (e.g., "Farce", "Sauce")
- Recipes use **slugs** for SEO-friendly URLs (generated from recipe name)
- Portion adjustment: Frontend calculates ingredient quantities based on servings
- Soft deletion: Recipes have `deletedAt` field, not hard deleted
- Status system: `DRAFT`, `PRIVATE`, `PUBLIC` for visibility control

### Premium Features

Premium features (OWNER/ADMIN role required):
- AI recipe generation from YouTube/TikTok
- Multi-URL import (parallel processing, max 3 simultaneous)
- Voice/text recipe import
- AI menu generation
- Shopping list optimization

Check premium status:
```typescript
import { requirePremium } from '@/lib/premium';
await requirePremium(userId); // Throws if not premium
```

### Database Considerations

- **Connection Pooling**: Using Prisma Accelerate for connection management
- **Indexes**: Critical indexes on `userId`, `deletedAt`, `slug`, `category`
- **Soft Deletes**: Most models use `deletedAt` - always filter in queries
- **Optimistic Locking**: Use `updatedAt` for conflict detection

### Error Handling

- API routes return JSON with `{ error: "message" }` for errors
- Use appropriate HTTP status codes: 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 429 (Rate Limited)
- Client-side: Use `sonner` for toast notifications
- Server-side: Console logs for debugging (removed in production except warn/error)

### Performance Optimizations

- Images are **unoptimized** (to save Vercel quota) - sources are pre-optimized
- Server Components used by default, Client Components marked with `'use client'`
- Recipe caching via React Query with custom cache times
- Route segment config: `export const dynamic = 'force-dynamic'` for real-time routes
- Prisma query optimization: Select only needed fields, use `include` carefully

### Security Best Practices

- **Rate Limiting**: In-memory rate limiting via `src/lib/api-security.ts` (use Redis in production)
- **Input Sanitization**: `sanitizeString()` helper for XSS prevention
- **CORS**: Configured via environment variable `ALLOWED_ORIGINS`
- **Authentication**: All protected routes verify session via `requireAuth()`
- **Authorization**: Role-based checks via `requireAdmin()` or `requireOwnerOrAdmin()`

## Environment Variables

Required variables (see `.env.example`):

```bash
# Database
PRISMA_DATABASE_URL         # Prisma Accelerate connection string
POSTGRES_URL                # Direct PostgreSQL connection

# Auth
NEXTAUTH_URL                # Application URL
NEXTAUTH_SECRET             # Random secret (openssl rand -base64 32)
GOOGLE_CLIENT_ID            # Google OAuth client ID
GOOGLE_CLIENT_SECRET        # Google OAuth client secret

# AI Features (Premium)
OPENAI_API_KEY              # OpenAI API key
UNSPLASH_ACCESS_KEY         # Unsplash API key

# Optional
PROXY_URL                   # HTTP proxy for YouTube import in production
```

## Common Patterns

### Creating a New API Route

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-security";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  const body = await request.json();

  // Your logic here

  return NextResponse.json({ success: true });
}
```

### Creating a Server Action

```typescript
'use server';

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createRecipe(data: RecipeFormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const recipe = await db.recipe.create({
    data: {
      ...data,
      userId: session.user.id,
    },
  });

  revalidatePath("/recipes");
  return recipe;
}
```

### Using Real-time Shopping Lists

```typescript
'use client';

import { useSSE } from "@/lib/sse-manager";

export function ShoppingListComponent({ planId }: { planId: number }) {
  useSSE(
    `/api/shopping-list/subscribe/${planId}`,
    (data) => {
      // Handle real-time update
      console.log("Shopping list updated:", data);
    },
    (error) => {
      console.error("SSE error:", error);
    }
  );
}
```

### Implementing Premium Feature

```typescript
// API Route
import { requireAuth } from "@/lib/api-security";
import { requirePremium } from "@/lib/premium";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;

  // Check premium status
  await requirePremium(session.user.id);

  // Premium feature logic...
}
```

## Testing

No test framework is currently configured. When adding tests, consider:
- Jest or Vitest for unit tests
- Playwright or Cypress for E2E tests
- Test database setup with Prisma

## Deployment

- Deployed on Vercel
- Automatic redirects from `yumiso.vercel.app` to `yumiso.fr`
- PWA features enabled in production (disabled in development)
- Uses Turbopack for faster builds
- Console logs removed in production (except error/warn)

## Key Files to Know

- `src/lib/db.ts` - Prisma client singleton
- `src/lib/auth.ts` - NextAuth configuration
- `src/lib/validations.ts` - Zod schemas
- `src/lib/api-security.ts` - API security utilities
- `src/lib/premium.ts` - Premium feature checks
- `src/lib/sse-manager.ts` - Real-time SSE manager
- `prisma/schema.prisma` - Database schema
- `next.config.ts` - Next.js configuration

## Features → Main Files

Use this map to jump straight to the files relevant to a feature.

### Authentication & Session
- Config: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Sign-in UI: `src/app/auth/signin/page.tsx`, `src/components/auth/sign-in-button.tsx`
- Session provider: `src/components/providers/query-provider.tsx`, `src/app/layout.tsx`
- Pseudo/username: `src/components/profile/pseudo-editor.tsx`, `src/components/auth/pseudo-banner.tsx`

### Recipes (CRUD, listing, detail)
- Pages: `src/app/recipes/page.tsx`, `src/app/recipes/[slug]/page.tsx`
- API: `src/app/api/recipes/route.ts`, `src/app/api/recipes/[id]/route.ts`, `src/app/api/recipes/autocomplete/route.ts`
- Actions: `src/actions/recipes.ts`
- Forms/context: `src/components/recipes/recipe-context.tsx`, `src/components/recipes/recipe-form-components.tsx`
- Listing/views: `src/components/recipes/recipe-list.tsx`, `src/components/recipes/recipe-list-view.tsx`, `src/components/recipes/view-toggle.tsx`
- Query hooks: `src/hooks/use-recipe-query.ts`, `src/hooks/use-prefetch-recipe.ts`
- Helpers: `src/lib/slug-helpers.ts`, `src/lib/recipe-status.ts`, `src/lib/recipe-cache.ts`, `src/lib/ingredient-helpers.ts`

### Recipe Filters, Search & Sort
- Search bars: `src/components/recipes/desktop-search-bar.tsx`, `src/components/recipes/mobile-search-bar.tsx`, `src/components/landing/landing-search-bar.tsx`
- Filters: `src/components/recipes/quick-filters.tsx`, `src/components/recipes/advanced-filters.tsx`
- Pagination: `src/components/recipes/recipe-pagination.tsx`
- Sort preference: `src/hooks/use-sort-preference.ts`, `src/hooks/use-favorites-first-preference.ts`

### AI Import (YouTube / TikTok / Voice / Multi-URL) — Premium
- YouTube: `src/app/api/youtube/generate-recipe/route.ts`, `src/app/api/youtube/transcript/route.ts`, `src/lib/youtube-errors.ts`
- TikTok: `src/app/api/tiktok/extract/route.ts`
- Multi-URL import: `src/app/api/recipes/multi-import/route.ts`, `src/components/recipes/multi-import-form.tsx`
- Voice: `src/components/recipes/voice-to-text-import.tsx`
- AI helpers: `src/lib/chatgpt-helpers.ts`

### Recipe Optimization (AI) — Premium
- API: `src/app/api/recipes/optimize/route.ts`
- UI: `src/components/recipes/recipe-optimize-loader.tsx`

### Favorites & Personal Notes
- Actions: `src/actions/favorites.ts`, `src/actions/notes.ts`, `src/actions/notes-user.ts`
- UI: `src/components/recipes/favorite-button.tsx`, `src/components/recipes/personal-note.tsx`, `src/components/notes/notes-client.tsx`
- Page: `src/app/profile/favorites/page.tsx`, `src/app/notes/page.tsx`

### Collections
- Actions: `src/actions/collections.ts`
- Pages: `src/app/profile/collections/page.tsx`, `src/app/profile/collections/[id]/page.tsx`
- UI: `src/components/profile/collections-manager.tsx`, `src/components/profile/collection-detail.tsx`, `src/components/profile/create-collection-dialog.tsx`, `src/components/profile/edit-collection-dialog.tsx`, `src/components/profile/delete-collection-dialog.tsx`
- Add-to-collection: `src/components/recipes/add-to-collection.tsx`

### Comments & Ratings
- Actions: `src/actions/comments.ts`
- UI: `src/components/recipes/recipe-comments.tsx`
- Helper: `src/lib/rating-helper.ts`

### Tags & Authors
- Actions: `src/actions/tags.ts`, `src/actions/authors.ts`
- UI: `src/components/recipes/tag-input.tsx`, `src/components/recipes/author-autocomplete.tsx`

### Meal Planner
- Page/layout: `src/app/meal-planner/page.tsx`, `src/app/meal-planner/layout.tsx`
- Plan API: `src/app/api/meal-planner/create/route.ts`, `src/app/api/meal-planner/[planId]/route.ts`, `src/app/api/meal-planner/plan/[id]/route.ts`, `src/app/api/meal-planner/saved/route.ts`
- Meal API: `src/app/api/meal-planner/meal/route.ts`, `src/app/api/meal-planner/meal/[id]/route.ts`, `src/app/api/meal-planner/meal/[id]/move/route.ts`
- Calendar UI: `src/components/meal-planner/weekly-calendar.tsx`, `src/components/meal-planner/meal-card.tsx`
- Dialogs: `src/components/meal-planner/add-meal-dialog.tsx`, `src/components/meal-planner/edit-meal-dialog.tsx`, `src/components/meal-planner/edit-plan-dialog.tsx`, `src/components/meal-planner/meal-planner-dialog-new.tsx`, `src/components/meal-planner/recipe-detail-sheet.tsx`
- Query hook: `src/hooks/use-meal-planner-query.ts`

### AI Menu Generation — Premium
- API: `src/app/api/meal-planner/generate/route.ts`, `src/app/api/meal-planner/generate-menu/route.ts`, `src/app/api/meal-planner/generate-meal/route.ts`
- UI: `src/components/meal-planner/generate-menu-dialog.tsx`, `src/components/meal-planner/menu-generation-loader.tsx`

### Shopping Lists (Plan-based & Standalone)
- Pages: `src/app/meal-planner/shopping-list/[planId]/page.tsx`, `src/app/shopping-lists/page.tsx`, `src/app/shopping-lists/[listId]/page.tsx`
- Standalone API: `src/app/api/shopping-lists/route.ts`, `src/app/api/shopping-lists/[listId]/route.ts`, `src/app/api/shopping-lists/[listId]/items/route.ts`, `src/app/api/shopping-lists/[listId]/items/[itemId]/route.ts`, `src/app/api/shopping-lists/[listId]/reset/route.ts`
- Plan-based API: `src/app/api/shopping-list/add/route.ts`, `src/app/api/shopping-list/remove/route.ts`, `src/app/api/shopping-list/edit/route.ts`, `src/app/api/shopping-list/toggle/route.ts`, `src/app/api/shopping-list/move/route.ts`, `src/app/api/shopping-list/clear-checked/route.ts`, `src/app/api/meal-planner/generate-shopping-list/route.ts`, `src/app/api/meal-planner/recalculate-shopping-list/route.ts`
- UI: `src/components/shopping-lists/shopping-list-content.tsx`, `src/components/shopping-lists/AddItemForm.tsx`, `src/components/shopping-lists/ItemContextMenu.tsx`, `src/components/shopping-lists/add-recipes-button.tsx`, `src/components/shopping-lists/add-recipe-ingredients.tsx`
- Loader: `src/components/meal-planner/shopping-list-loader.tsx`

### Real-time Shopping Lists (SSE)
- Server: `src/lib/sse-manager.ts`, `src/lib/sse-clients.ts`, `src/app/api/shopping-list/subscribe/[planId]/route.ts`
- Client hooks: `src/hooks/use-realtime-shopping-list.ts`, `src/hooks/use-shopping-list-optimistic.ts`

### Stores (Shopping List Grouping)
- API: `src/app/api/stores/route.ts`, `src/app/api/stores/[storeId]/route.ts`, `src/app/api/stores/user/route.ts`, `src/app/api/admin/stores/route.ts`, `src/app/api/shopping-list/move-store/route.ts`, `src/app/api/shopping-list/move-store-batch/route.ts`
- UI: `src/components/shopping-lists/StoreGroupedShoppingList.tsx`, `src/components/shopping-lists/StoreManagementMenu.tsx`, `src/components/shopping-lists/RenameNoStoreMenu.tsx`, `src/components/admin/stores-manager.tsx`

### Shopping List Optimization (AI) — Premium
- API: `src/app/api/shopping-lists/[listId]/optimize/route.ts`

### Collaboration & Sharing (Contributors / Invitations)
- API: `src/app/api/meal-planner/plan/[id]/sharing/route.ts`, `src/app/api/meal-planner/plan/[id]/contributors/route.ts`, `src/app/api/shopping-lists/[listId]/contributors/route.ts`, `src/app/api/shopping-lists/[listId]/contributors/[contributorId]/route.ts`
- Invitations API: `src/app/api/invitations/route.ts`, `src/app/api/invitations/count/route.ts`, `src/app/api/invitations/[id]/accept/route.ts`, `src/app/api/invitations/[id]/reject/route.ts`, `src/app/api/invitations/[id]/cancel/route.ts`
- UI: `src/components/meal-planner/contributors-dialog.tsx`, `src/components/shopping-lists/contributors-dialog.tsx`, `src/components/invitations/invitations-dialog.tsx`
- Hook: `src/hooks/use-invitations.ts`

### Favorites on Plans/Lists
- API: `src/app/api/meal-planner/[planId]/favorite/route.ts`, `src/app/api/shopping-lists/[listId]/favorite/route.ts`

### Users & Profile
- Actions: `src/actions/users.ts`
- Pages: `src/app/profile/page.tsx`, `src/app/profile/recipes/page.tsx`, `src/app/users/[id]/page.tsx`
- API: `src/app/api/users/search/route.ts`, `src/app/api/user/premium/route.ts`
- UI: `src/components/recipes/my-recipes-content.tsx`

### Admin Dashboard
- Page: `src/app/admin/page.tsx`
- API: `src/app/api/admin/activity-logs/route.ts`, `src/app/api/admin/stores/route.ts`
- UI: `src/components/admin/admin-tabs.tsx`, `src/components/admin/admin-stats.tsx`, `src/components/admin/activity-logs-viewer.tsx`, `src/components/admin/user-role-manager.tsx`, `src/components/admin/stores-manager.tsx`, `src/components/admin/admin-skeleton-loaders.tsx`
- Logger: `src/lib/activity-logger.ts`

### Premium Gating
- Server: `src/lib/premium.ts`
- Client: `src/components/premium/premium-gate.tsx`, `src/hooks/use-premium.ts`

### Images (Unsplash)
- API: `src/app/api/unsplash/track-download/route.ts`
- UI: `src/components/ui/optimized-image.tsx`, `src/components/ui/unsplash-attribution.tsx`, `src/components/recipes/recipe-image.tsx`

### PWA
- Provider/prompt: `src/components/pwa/pwa-provider.tsx`, `src/components/pwa/install-prompt.tsx`
- Offline page: `src/app/_offline/page.tsx`
- Config: `next.config.ts`, `npm run pwa:icons`

### Layout, Theming & Analytics
- Root layout: `src/app/layout.tsx`, `src/components/layout/main-wrapper.tsx`, `src/components/layout/app-header.tsx`
- Theme: `src/components/theme/theme-toggle.tsx`
- Analytics: `src/components/analytics/view-tracker.tsx`

### Export & Sharing
- PDF: `src/components/recipes/export-pdf-button.tsx`
- Share buttons: `src/components/recipes/share-buttons.tsx`

### Static Pages
- Roadmap: `src/app/roadmap/page.tsx`
- Terms: `src/app/terms/page.tsx`
- Privacy: `src/app/privacy/page.tsx`
