import { DatasetShard } from "./types"

const cache: Record<string, DatasetShard> = {}

export function loadShard(prefix: string): DatasetShard {

  if(!cache[prefix]){

    cache[prefix] = require(`../data/shards/${prefix}.json`)

  }

  return cache[prefix]

}