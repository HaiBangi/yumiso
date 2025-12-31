"use server";

import { db } from "@/lib/db";
import type { Tag } from "@/types/recipe";

/**
 * Récupère tous les tags disponibles
 * @returns Liste des tags triés par nom
 */
export async function getAllTags(): Promise<Tag[]> {
  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
  });

  return tags.map(tag => ({
    ...tag,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
  }));
}

/**
 * Récupère un tag par son ID
 */
export async function getTagById(id: number): Promise<Tag | null> {
  const tag = await db.tag.findUnique({
    where: { id },
  });

  if (!tag) return null;

  return {
    ...tag,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
  };
}

/**
 * Récupère plusieurs tags par leurs IDs
 */
export async function getTagsByIds(ids: number[]): Promise<Tag[]> {
  const tags = await db.tag.findMany({
    where: { id: { in: ids } },
    orderBy: { name: "asc" },
  });

  return tags.map(tag => ({
    ...tag,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
  }));
}

/**
 * Recherche des tags par nom ou slug
 */
export async function searchTags(query: string): Promise<Tag[]> {
  if (!query || query.length < 1) return [];

  const tags = await db.tag.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 20, // Limiter les résultats
  });

  return tags.map(tag => ({
    ...tag,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
  }));
}

/**
 * Récupère les tags les plus utilisés
 */
export async function getPopularTags(limit: number = 20): Promise<(Tag & { count: number })[]> {
  const tagsWithCount = await db.tag.findMany({
    include: {
      _count: {
        select: { RecipeTag: true },
      },
    },
    orderBy: {
      RecipeTag: {
        _count: "desc",
      },
    },
    take: limit,
  });

  return tagsWithCount.map(tag => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
    color: tag.color,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
    count: tag._count.RecipeTag,
  }));
}

/**
 * Crée un nouveau tag (admin only)
 */
export async function createTag(data: {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}): Promise<Tag> {
  const tag = await db.tag.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color || "#6B7280",
    },
  });

  return {
    ...tag,
    createdAt: new Date(tag.createdAt),
    updatedAt: new Date(tag.updatedAt),
  };
}

