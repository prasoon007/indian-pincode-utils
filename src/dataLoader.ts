import { DatasetShard } from "./types";
import { loadJson } from "./jsonLoader";

const cache: Record<string, DatasetShard> = {};

export function loadShard(prefix: string): DatasetShard {
  if (!cache[prefix]) {
    cache[prefix] = loadJson<DatasetShard>(`data/shards/${prefix}.json`);
  }

  return cache[prefix];
}
