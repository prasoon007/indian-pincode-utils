import ngeohash from "ngeohash";
import geohashIndex from "../data/geohash-index.json";
import { loadShard } from "./dataLoader";
import { haversine } from "./utils";
import { ApiResponse, NearestPincode } from "./types";

export function getNearestPincode(
  lat: number,
  lng: number,
): ApiResponse<NearestPincode> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return {
      success: false,
      error: "Invalid coordinates",
    };
  }

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
    return {
      success: false,
      error: "No nearby pincode found",
    };
  }

  return {
    success: true,
    data: nearest,
  };
}
