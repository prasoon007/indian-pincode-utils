import officeNames from "../data/meta/officeNames.json";
import states from "../data/meta/states.json";
import districts from "../data/meta/districts.json";

import {
  ApiResponse,
  BulkPincodeLookup,
  CoordinatesLookupResult,
  CoordinatesOptions,
  PincodeRecord,
  RecordQueryOptions,
  SearchOfficeOptions,
  SearchOfficeResult,
} from "./types";
import { loadShard } from "./dataLoader";
import {
  fail,
  levenshteinDistance,
  normalizeText,
  ok,
  sortAndPaginate,
} from "./utils";

const normalizedOfficeNames = (officeNames as string[]).map(normalizeText);
const stateNames = states as string[];
const districtNames = districts as string[];

const stateShardCache = new Map<number, PincodeRecord[]>();
const districtShardCache = new Map<number, PincodeRecord[]>();

function formatRow(row: any, shard: any): PincodeRecord {
  const pincode = row[0];

  return {
    pincode,
    office: officeNames[row[1]],
    district: districts[row[2]],
    state: states[row[3]],
    coordinates: shard.pincodes[pincode],
  };
}

function parseRecordOptions(options?: RecordQueryOptions): Required<RecordQueryOptions> {
  return {
    sortBy: options?.sortBy ?? "pincode",
    sortOrder: options?.sortOrder ?? "asc",
    offset: options?.offset ?? 0,
    limit: options?.limit ?? Number.MAX_SAFE_INTEGER,
  };
}

export function getByPincode(pin: string): ApiResponse<PincodeRecord[]> {
  if (!/^\d{6}$/.test(pin)) {
    return fail("INVALID_PIN", "Invalid pincode format");
  }

  const shard = loadShard(pin[0]);
  const rows = shard.index[pin];

  if (!rows) {
    return fail("PIN_NOT_FOUND", "Pincode not found");
  }

  const result = rows.map((i: number) => formatRow(shard.offices[i], shard));

  return ok(result);
}

export function getCoordinates(
  pin: string,
  officeNameOrOptions?: string | CoordinatesOptions,
): ApiResponse<CoordinatesLookupResult> {
  if (!/^\d{6}$/.test(pin)) {
    return fail("INVALID_PIN", "Invalid pincode format");
  }

  const shard = loadShard(pin[0]);

  const rows = shard.index[pin];

  if (!rows || rows.length === 0) {
    return fail("PIN_NOT_FOUND", "Pincode not found");
  }

  const allRecords = rows.map((i: number) => formatRow(shard.offices[i], shard));

  const options: CoordinatesOptions =
    typeof officeNameOrOptions === "string"
      ? { officeName: officeNameOrOptions }
      : officeNameOrOptions ?? {};

  const query = options.officeName ? normalizeText(options.officeName) : "";
  const exact = options.exact ?? false;
  const offset = options.offset ?? 0;
  const limit = options.limit ?? allRecords.length;

  const matchingRecords = query
    ? allRecords.filter((record) => {
        const normalizedOffice = normalizeText(record.office);
        return exact ? normalizedOffice === query : normalizedOffice.includes(query);
      })
    : allRecords;

  if (matchingRecords.length === 0) {
    return fail("OFFICE_NOT_FOUND", "Office not found for this pincode");
  }

  const centroid = shard.pincodes[pin] ?? matchingRecords[0].coordinates;
  const paged = matchingRecords.slice(offset, offset + limit);

  return ok({
    centroid,
    coordinateSource: "centroid",
    confidence: 0.7,
    total: matchingRecords.length,
    pincodes: paged,
  });
}

export function getByState(
  stateName: string,
  options: RecordQueryOptions = {},
): ApiResponse<PincodeRecord[]> {
  const stateIndex = stateNames.findIndex(
    (s) => s.toLowerCase() === stateName.toLowerCase(),
  );

  if (stateIndex === -1) {
    return fail("STATE_NOT_FOUND", "State not found");
  }

  if (!stateShardCache.has(stateIndex)) {
    const result: PincodeRecord[] = [];

    for (let i = 1; i <= 9; i++) {
      const shard = loadShard(String(i));

      shard.offices.forEach((row: any) => {
        if (row[3] === stateIndex) {
          result.push(formatRow(row, shard));
        }
      });
    }

    stateShardCache.set(stateIndex, result);
  }

  const normalizedOptions = parseRecordOptions(options);
  const sorted = sortAndPaginate(stateShardCache.get(stateIndex) ?? [], normalizedOptions, {
    pincode: (item) => item.pincode,
    office: (item) => item.office,
    district: (item) => item.district,
    state: (item) => item.state,
  });

  return ok(sorted);
}

export function getByDistrict(
  districtName: string,
  options: RecordQueryOptions = {},
): ApiResponse<PincodeRecord[]> {
  const districtIndex = districtNames.findIndex(
    (d) => d.toLowerCase() === districtName.toLowerCase(),
  );

  if (districtIndex === -1) {
    return fail("DISTRICT_NOT_FOUND", "District not found");
  }

  if (!districtShardCache.has(districtIndex)) {
    const result: PincodeRecord[] = [];

    for (let i = 1; i <= 9; i++) {
      const shard = loadShard(String(i));

      shard.offices.forEach((row: any) => {
        if (row[2] === districtIndex) {
          result.push(formatRow(row, shard));
        }
      });
    }

    districtShardCache.set(districtIndex, result);
  }

  const normalizedOptions = parseRecordOptions(options);
  const sorted = sortAndPaginate(
    districtShardCache.get(districtIndex) ?? [],
    normalizedOptions,
    {
      pincode: (item) => item.pincode,
      office: (item) => item.office,
      district: (item) => item.district,
      state: (item) => item.state,
    },
  );

  return ok(sorted);
}

export function searchOffices(
  query: string,
  options: SearchOfficeOptions = {},
): ApiResponse<SearchOfficeResult[]> {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return fail("INVALID_INPUT", "Search query is required");
  }

  const ranked: SearchOfficeResult[] = [];

  normalizedOfficeNames.forEach((value, index) => {
    const editDistance = levenshteinDistance(value, normalizedQuery);
    const includeMatch = value.includes(normalizedQuery);
    const typoMatch = editDistance <= 2;

    if (!includeMatch && !typoMatch) return;

    const score = includeMatch
      ? Math.max(0.55, normalizedQuery.length / value.length)
      : Math.max(0.35, 1 - editDistance / Math.max(value.length, normalizedQuery.length));

    ranked.push({ office: (officeNames as string[])[index], score: Number(score.toFixed(3)) });
  });

  ranked.sort((a, b) => b.score - a.score || a.office.localeCompare(b.office));

  const offset = options.offset ?? 0;
  const limit = options.limit ?? 20;

  return ok(ranked.slice(offset, offset + limit));
}

export function getByPincodes(pins: string[]): ApiResponse<BulkPincodeLookup> {
  if (!Array.isArray(pins) || pins.length === 0) {
    return fail("INVALID_INPUT", "pins must be a non-empty array");
  }

  const output: BulkPincodeLookup = {};

  pins.forEach((pin) => {
    output[pin] = getByPincode(pin);
  });

  return ok(output);
}
