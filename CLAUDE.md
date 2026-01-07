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
