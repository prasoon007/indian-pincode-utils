import { ApiError, ApiSuccess, ErrorCode, RecordQueryOptions } from "./types";

export function haversine(a: number[], b: number[]) {
  const R = 6371;

  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return R * c;
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(code: ErrorCode, error: string): ApiError {
  return { success: false, code, error };
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

export function sortAndPaginate<T>(
  items: T[],
  options: RecordQueryOptions,
  selectors: Record<NonNullable<RecordQueryOptions["sortBy"]>, (item: T) => string>,
): T[] {
  const sortBy = options.sortBy ?? "pincode";
  const sortOrder = options.sortOrder ?? "asc";
  const offset = options.offset ?? 0;
  const limit = options.limit ?? items.length;

  const sorted = [...items].sort((a, b) => {
    const left = selectors[sortBy](a);
    const right = selectors[sortBy](b);
    const base = left.localeCompare(right, "en", { numeric: true });
    return sortOrder === "asc" ? base : -base;
  });

  return sorted.slice(offset, offset + limit);
}

export function createLruCache<K, V>(maxSize: number) {
  const map = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      const value = map.get(key);
      if (value === undefined) return undefined;
      map.delete(key);
      map.set(key, value);
      return value;
    },
    set(key: K, value: V) {
      if (map.has(key)) {
        map.delete(key);
      }
      map.set(key, value);
      if (map.size > maxSize) {
        const firstKey = map.keys().next().value as K;
        map.delete(firstKey);
      }
    },
  };
}