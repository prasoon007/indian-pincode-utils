import { loadShard } from "./dataLoader";
import { pointInPolygon } from "./geoUtils";
import { ApiResponse, Polygon, PolygonPincode } from "./types";
import { fail, ok } from "./utils";

export function getPincodesWithinPolygon(
  polygon: Polygon,
): ApiResponse<PolygonPincode[]> {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return fail(
      "INVALID_INPUT",
      "Polygon must contain at least 3 coordinates",
    );
  }

  const result: PolygonPincode[] = [];

  for (let i = 1; i <= 9; i++) {
    const shard = loadShard(String(i));

    for (const pin in shard.pincodes) {
      const coords = shard.pincodes[pin];

      if (pointInPolygon(coords, polygon)) {
        result.push({
          pincode: pin,
          coordinates: coords,
        });
      }
    }
  }

  return ok(result);
}
