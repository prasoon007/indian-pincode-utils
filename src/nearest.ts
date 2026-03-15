import ngeohash from "ngeohash";
import geohashIndex from "../data/geohash-index.json";
import { loadShard } from "./dataLoader";
import { createLruCache, fail, haversine, ok } from "./utils";
import { ApiResponse, NearestPincode } from "./types";

const nearestCache = createLruCache<string, NearestPincode>(300);

export function getNearestPincode(
  lat: number,
  lng: number,
): ApiResponse<NearestPincode> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return fail("INVALID_INPUT", "Invalid coordinates");
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cached = nearestCache.get(cacheKey);
  if (cached) return ok(cached);

  const hash = ngeohash.encode(lat, lng, 4);

  const candidateHashes = [hash, ...ngeohash.neighbors(hash)];

  let nearest: NearestPincode | null = null;

  for (const h of candidateHashes) {
    const pins = (geohashIndex as Record<string, string[]>)[h];

    if (!pins) continue;

    for (const p of pins) {
      const shard = loadShard(p[0]);
      const coords = shard.pincodes[p];

      if (!coords) continue;

      const dist = haversine([lat, lng], coords);

      if (!nearest || dist < nearest.distanceKm) {
        nearest = {
          pincode: p,
          distanceKm: dist,
        };
      }
    }
  }

  if (!nearest) {
    return fail("NO_RESULTS", "No nearby pincode found");
  }

  nearestCache.set(cacheKey, nearest);
  return ok(nearest);
}
