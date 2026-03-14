import { ApiResponse } from "./types";
import { haversine } from "./utils";
import { loadShard } from "./dataLoader";

export function distanceBetweenPincodes(
  a: string,
  b: string,
): ApiResponse<number> {
  const shardA = loadShard(a[0]);
  const shardB = loadShard(b[0]);

  const c1 = shardA.pincodes[a];
  const c2 = shardB.pincodes[b];

  if (!c1 || !c2) {
    return {
      success: false,
      error: "One or both pincodes not found",
    };
  }

  return {
    success: true,
    data: haversine(c1, c2),
  };
}
