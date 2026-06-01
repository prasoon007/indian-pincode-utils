import { ApiResponse } from "./types";
import { fail, ok, haversine } from "./utils";
import { loadShard } from "./dataLoader";
import { loadJson } from "./jsonLoader";
import { getStateMeta } from "./gst";

export type CityTier = 1 | 2 | 3;
export type ShippingZone =
  | "local"
  | "regional"
  | "metro"
  | "rest-of-india"
  | "special";

interface TierData {
  tier1: Record<string, string>;
  tier2: Record<string, string>;
}

const tiers = loadJson<TierData>("data/meta/cityTiers.json");
const states = loadJson<string[]>("data/meta/states.json");
const tier1Set = new Set(Object.keys(tiers.tier1));
const tier2Set = new Set(Object.keys(tiers.tier2));

const SPECIAL_STATES = new Set([
  "JAMMU AND KASHMIR",
  "LADAKH",
  "ARUNACHAL PRADESH",
  "MIZORAM",
  "MANIPUR",
  "NAGALAND",
  "MEGHALAYA",
  "TRIPURA",
  "SIKKIM",
  "ANDAMAN AND NICOBAR ISLANDS",
  "LAKSHADWEEP",
]);

function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

function lookupState(pin: string): string | null {
  if (!validatePin(pin)) return null;
  const shard = loadShard(pin[0]);
  const rows = shard.index[pin];
  if (!rows || rows.length === 0) return null;
  const row = shard.offices[rows[0]];
  // row[3] is stateIndex
  return states[row[3]] ?? null;
}

export interface CityTierInfo {
  pincode: string;
  tier: CityTier;
  city: string | null;
}

export function getCityTier(pin: string): ApiResponse<CityTierInfo> {
  if (!validatePin(pin)) return fail("INVALID_PIN", "Invalid pincode format");
  const prefix = pin.slice(0, 3);
  if (tier1Set.has(prefix)) {
    return ok({ pincode: pin, tier: 1, city: tiers.tier1[prefix] });
  }
  if (tier2Set.has(prefix)) {
    return ok({ pincode: pin, tier: 2, city: tiers.tier2[prefix] });
  }
  return ok({ pincode: pin, tier: 3, city: null });
}

export function isMetro(pin: string): ApiResponse<boolean> {
  if (!validatePin(pin)) return fail("INVALID_PIN", "Invalid pincode format");
  return ok(tier1Set.has(pin.slice(0, 3)));
}

export function isServiceable(pin: string): ApiResponse<boolean> {
  if (!validatePin(pin)) return fail("INVALID_PIN", "Invalid pincode format");
  const shard = loadShard(pin[0]);
  return ok(Boolean(shard.index[pin]));
}

export interface ShippingZoneInfo {
  from: string;
  to: string;
  zone: ShippingZone;
  distanceKm: number | null;
  sameState: boolean;
}

export function getShippingZone(
  from: string,
  to: string,
): ApiResponse<ShippingZoneInfo> {
  if (!validatePin(from) || !validatePin(to)) {
    return fail("INVALID_PIN", "One or both pincodes are invalid");
  }

  const fromState = lookupState(from);
  const toState = lookupState(to);

  if (!fromState || !toState) {
    return fail("PIN_NOT_FOUND", "One or both pincodes not found");
  }

  const shardA = loadShard(from[0]);
  const shardB = loadShard(to[0]);
  const c1 = shardA.pincodes[from];
  const c2 = shardB.pincodes[to];
  const distanceKm = c1 && c2 ? haversine(c1, c2) : null;
  const sameState = fromState === toState;

  let zone: ShippingZone;
  if (SPECIAL_STATES.has(fromState) || SPECIAL_STATES.has(toState)) {
    zone = "special";
  } else if (from.slice(0, 3) === to.slice(0, 3)) {
    zone = "local";
  } else if (sameState) {
    zone = "regional";
  } else if (tier1Set.has(from.slice(0, 3)) && tier1Set.has(to.slice(0, 3))) {
    zone = "metro";
  } else {
    zone = "rest-of-india";
  }

  return ok({ from, to, zone, distanceKm, sameState });
}

export interface DeliveryEstimate {
  from: string;
  to: string;
  zone: ShippingZone;
  minDays: number;
  maxDays: number;
  distanceKm: number | null;
}

const ZONE_DAYS: Record<ShippingZone, [number, number]> = {
  local: [1, 2],
  regional: [2, 3],
  metro: [2, 4],
  "rest-of-india": [4, 6],
  special: [5, 8],
};

export interface EstimateOptions {
  speedFactor?: number; // multiplier; <1 = faster (express), >1 = slower
}

export function estimateDeliveryDays(
  from: string,
  to: string,
  options: EstimateOptions = {},
): ApiResponse<DeliveryEstimate> {
  const zoneResult = getShippingZone(from, to);
  if (!zoneResult.success) return zoneResult;

  const { zone, distanceKm } = zoneResult.data;
  const factor =
    options.speedFactor && options.speedFactor > 0 ? options.speedFactor : 1;
  const [minBase, maxBase] = ZONE_DAYS[zone];

  // Slight bump for very long hauls
  let bump = 0;
  if (distanceKm !== null) {
    if (distanceKm > 2000) bump = 2;
    else if (distanceKm > 1200) bump = 1;
  }

  const minDays = Math.max(1, Math.round((minBase + bump) * factor));
  const maxDays = Math.max(minDays, Math.round((maxBase + bump) * factor));

  return ok({
    from,
    to,
    zone,
    minDays,
    maxDays,
    distanceKm,
  });
}

export function getStateTier(
  state: string,
): ApiResponse<{ state: string; isSpecialZone: boolean; region: string }> {
  const m = getStateMeta(state);
  if (!m.success) return m;
  return ok({
    state: m.data.name,
    isSpecialZone: SPECIAL_STATES.has(m.data.name),
    region: m.data.region,
  });
}
