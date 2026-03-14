import ngeohash from "ngeohash";
import geohashIndex from "../data/geohash-index.json";
import { loadShard } from "./dataLoader";
import { haversine } from "./utils";

export function getNearbyPincodes(pin: string, radiusKm: number) {
  const centerShard = loadShard(pin[0]);
  const center = centerShard.pincodes[pin];

  if (!center) {
    return {
      success: false,
      error: "Pincode not found",
    };
  }

  const [lat, lng] = center;

  const hash = ngeohash.encode(lat, lng, 4);

  const candidateHashes = [hash, ...ngeohash.neighbors(hash)];

  const result = [];

  for (const h of candidateHashes) {
    const pins = (geohashIndex as any)[h];

    if (!pins) continue;

    for (const p of pins) {
      const shard = loadShard(p[0]);
      const coords = shard.pincodes[p];

      const dist = haversine(center, coords);

      if (dist <= radiusKm) {
        result.push({
          pincode: p,
          distanceKm: dist,
        });
      }
    }
  }

  return {
    success: true,
    data: result,
  };
}
