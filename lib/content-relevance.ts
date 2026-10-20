import {
  BEAUTY_WORLD_RECOMMENDATION_AFFINITIES,
  normalizeBeautyWorld,
  type BeautyWorldKey,
} from "@/lib/beauty-world";
import type { ThemeKey } from "@/lib/personalization";

export interface BeautyWorldRelevanceItem {
  tags?: readonly string[];
  title?: string;
  caption?: string;
  category?: string;
  authorSlug?: string;
}

export type BeautyWorldAffinityResolver = (
  slug: string,
) => readonly ThemeKey[] | undefined;

const TAG_WEIGHT = 3;
const TITLE_WEIGHT = 2;
const CAPTION_WEIGHT = 1;
const AFFINITY_BONUS = 8;

function keywordHits(text: string, keywords: readonly string[]) {
  const normalized = text.toLowerCase();
  let hits = 0;

  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      hits += 1;
    }
  }

  return hits;
}

export function beautyWorldRelevanceScore(
  item: BeautyWorldRelevanceItem,
  theme: ThemeKey | string | null | undefined,
  resolveAffinity?: BeautyWorldAffinityResolver,
) {
  const key = normalizeBeautyWorld(theme);

  if (!key) {
    return 0;
  }

  const keywords = BEAUTY_WORLD_RECOMMENDATION_AFFINITIES[key]?.keywords ?? [];
  let score = 0;

  score += keywordHits((item.tags ?? []).join(" "), keywords) * TAG_WEIGHT;
  score += keywordHits([item.title, item.category].filter(Boolean).join(" "), keywords) * TITLE_WEIGHT;
  score += keywordHits(item.caption ?? "", keywords) * CAPTION_WEIGHT;

  if (item.authorSlug && resolveAffinity?.(item.authorSlug)?.includes(key as BeautyWorldKey)) {
    score += AFFINITY_BONUS;
  }

  return score;
}

export function rankByBeautyWorld<T extends BeautyWorldRelevanceItem>(
  items: readonly T[],
  theme: ThemeKey | string | null | undefined,
  resolveAffinity?: BeautyWorldAffinityResolver,
): T[] {
  if (!normalizeBeautyWorld(theme)) {
    return [...items];
  }

  return items
    .map((item, index) => ({
      item,
      index,
      score: beautyWorldRelevanceScore(item, theme, resolveAffinity),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.item);
}

export const rankFeedPosts = rankByBeautyWorld;
export const rankLooksForBeautyWorld = rankByBeautyWorld;
