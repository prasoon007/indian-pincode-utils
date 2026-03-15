import { ApiResponse, DistanceMatrixEntry } from "./types";
import { haversine } from "./utils";
import { loadShard } from "./dataLoader";
import { fail, ok } from "./utils";

export function distanceBetweenPincodes(
  a: string,
  b: string,
): ApiResponse<number> {
  if (!/^\d{6}$/.test(a) || !/^\d{6}$/.test(b)) {
    return fail("INVALID_PIN", "One or both pincodes are invalid");
  }

  const shardA = loadShard(a[0]);
  const shardB = loadShard(b[0]);

  const c1 = shardA.pincodes[a];
  const c2 = shardB.pincodes[b];

  if (!c1 || !c2) {
    return fail("PIN_NOT_FOUND", "One or both pincodes not found");
  }

  return ok(haversine(c1, c2));
}

export function distanceMatrix(
  pins: string[],
): ApiResponse<DistanceMatrixEntry[]> {
  if (!Array.isArray(pins) || pins.length < 2) {
    return fail("INVALID_INPUT", "pins must contain at least two values");
  }

  const uniquePins = Array.from(new Set(pins));
  const matrix: DistanceMatrixEntry[] = [];

  for (let i = 0; i < uniquePins.length; i++) {
    for (let j = i + 1; j < uniquePins.length; j++) {
      const result = distanceBetweenPincodes(uniquePins[i], uniquePins[j]);
      if (!result.success) return result;
      matrix.push({
        from: uniquePins[i],
        to: uniquePins[j],
        distanceKm: result.data,
      });
    }
  }

  return ok(matrix);
}
