import { ALL_BRAND_IDS } from '@/server/config/brands';
import type { BrandId } from '@/types/domain';
import { VIDEOS_PER_BRAND } from './orchestrator';

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && (ALL_BRAND_IDS as string[]).includes(value);
}

export type ParsedDateBrandIndex = { date: string; brand: BrandId; index: number } | { error: string };

/** Shared date/brand/index request-body validation for the approve and regenerate routes. */
export function parseDateBrandIndex(body: { date?: unknown; brand?: unknown; index?: unknown }): ParsedDateBrandIndex {
  const { date, brand, index } = body;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'date must be a YYYY-MM-DD string' };
  }
  if (!isBrandId(brand)) {
    return { error: `brand must be one of: ${ALL_BRAND_IDS.join(', ')}` };
  }
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 1 || index > VIDEOS_PER_BRAND) {
    return { error: `index must be an integer between 1 and ${VIDEOS_PER_BRAND}` };
  }
  return { date, brand, index };
}
