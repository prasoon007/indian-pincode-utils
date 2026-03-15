import ngeohash from "ngeohash";
import geohashIndex from "../data/geohash-index.json";
import { loadShard } from "./dataLoader";
import { createLruCache, fail, haversine, ok } from "./utils";
import {
  ApiResponse,
  NearbyPincode,
  NearbyPincodeRecord,
  PincodesNearOptions,
} from "./types";
import { getByPincode } from "./lookup";

const nearbyCache = createLruCache<string, NearbyPincode[]>(200);

export function getNearbyPincodes(
  pin: string,
  radiusKm: number,
): ApiResponse<NearbyPincode[]> {
  if (!/^\d{6}$/.test(pin)) {
    return fail("INVALID_PIN", "Invalid pincode format");
  }

  if (typeof radiusKm !== "number" || radiusKm <= 0) {
    return fail("INVALID_INPUT", "radiusKm must be a positive number");
  }

  const cacheKey = `${pin}:${radiusKm}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached) return ok(cached);

  const centerShard = loadShard(pin[0]);
  const center = centerShard.pincodes[pin];

  if (!center) {
    return fail("PIN_NOT_FOUND", "Pincode not found");
  }

  const [lat, lng] = center;

  const hash = ngeohash.encode(lat, lng, 4);

  const candidateHashes = [hash, ...ngeohash.neighbors(hash)];

  const result: NearbyPincode[] = [];

  for (const h of candidateHashes) {
    const pins = (geohashIndex as Record<string, string[]>)[h];

    if (!pins) continue;

    for (const p of pins) {
      const shard = loadShard(p[0]);
      const coords = shard.pincodes[p];

      if (!coords) continue;

      const dist = haversine(center, coords);

      if (dist <= radiusKm) {
        result.push({
          pincode: p,
          distanceKm: dist,
        });
      }
    }
  }

  const unique = Object.values(
    result.reduce(
      (acc, item) => {
        const current = acc[item.pincode];
        if (!current || item.distanceKm < current.distanceKm) {
          acc[item.pincode] = item;
        }
        return acc;
      },
      {} as Record<string, NearbyPincode>,
    ),
  ).sort((a, b) => a.distanceKm - b.distanceKm);

  nearbyCache.set(cacheKey, unique);

  return ok(unique);
}

export function getPincodesNear(
  lat: number,
  lng: number,
  options: PincodesNearOptions,
): ApiResponse<NearbyPincode[] | NearbyPincodeRecord[]> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return fail("INVALID_INPUT", "Invalid coordinates");
  }

  if (!options || typeof options.radiusKm !== "number" || options.radiusKm <= 0) {
    return fail("INVALID_INPUT", "radiusKm must be a positive number");
  }

  const hash = ngeohash.encode(lat, lng, 4);
  const candidateHashes = [hash, ...ngeohash.neighbors(hash)];
  const buffer: NearbyPincode[] = [];

  for (const h of candidateHashes) {
    const pins = (geohashIndex as Record<string, string[]>)[h];
    if (!pins) continue;

    for (const pin of pins) {
      const shard = loadShard(pin[0]);
      const coords = shard.pincodes[pin];
      if (!coords) continue;
      const distanceKm = haversine([lat, lng], coords);
      if (distanceKm <= options.radiusKm) {
        buffer.push({ pincode: pin, distanceKm });
      }
    }
  }

  const deduped = Object.values(
    buffer.reduce(
      (acc, item) => {
        const current = acc[item.pincode];
        if (!current || item.distanceKm < current.distanceKm) {
          acc[item.pincode] = item;
        }
        return acc;
      },
      {} as Record<string, NearbyPincode>,
    ),
  ).sort((a, b) => a.distanceKm - b.distanceKm);

  const offset = options.offset ?? 0;
  const limit = options.limit ?? deduped.length;
  const sliced = deduped.slice(offset, offset + limit);

  if (!options.includeDetails) {
    return ok(sliced);
  }

  const detailed: NearbyPincodeRecord[] = [];

  for (const item of sliced) {
    const records = getByPincode(item.pincode);
    if (!records.success) continue;
    for (const record of records.data) {
      detailed.push({ ...record, distanceKm: item.distanceKm });
    }
  }

  return ok(detailed);
}
