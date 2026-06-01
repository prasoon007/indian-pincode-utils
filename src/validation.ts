import { ApiResponse, PincodeRecord } from "./types";
import { fail, ok, normalizeText, levenshteinDistance } from "./utils";
import { getByPincode } from "./lookup";
import { getStateMeta } from "./gst";
import { getCityTier, isServiceable } from "./shipping";

const PINCODE_REGION: Record<string, { region: string; states: string[] }> = {
  "1": {
    region: "Northern",
    states: [
      "Delhi",
      "Haryana",
      "Punjab",
      "Himachal Pradesh",
      "Jammu and Kashmir",
      "Ladakh",
      "Chandigarh",
    ],
  },
  "2": { region: "Northern", states: ["Uttar Pradesh", "Uttarakhand"] },
  "3": {
    region: "Western",
    states: [
      "Rajasthan",
      "Gujarat",
      "Dadra and Nagar Haveli and Daman and Diu",
    ],
  },
  "4": {
    region: "Western",
    states: ["Maharashtra", "Madhya Pradesh", "Chhattisgarh", "Goa"],
  },
  "5": {
    region: "Southern",
    states: ["Andhra Pradesh", "Telangana", "Karnataka"],
  },
  "6": {
    region: "Southern",
    states: ["Kerala", "Tamil Nadu", "Puducherry", "Lakshadweep"],
  },
  "7": {
    region: "Eastern",
    states: [
      "West Bengal",
      "Odisha",
      "Arunachal Pradesh",
      "Nagaland",
      "Manipur",
      "Mizoram",
      "Tripura",
      "Meghalaya",
      "Assam",
      "Sikkim",
      "Andaman and Nicobar Islands",
    ],
  },
  "8": { region: "Eastern", states: ["Bihar", "Jharkhand"] },
  "9": { region: "Army Postal Service", states: ["APS"] },
};

export function isValidPincode(pin: unknown): boolean {
  if (typeof pin !== "string") return false;
  if (!/^\d{6}$/.test(pin)) return false;
  const first = pin[0];
  if (first === "0") return false;
  return first >= "1" && first <= "9";
}

export interface PincodeRegionInfo {
  pincode: string;
  zone: string;
  region: string;
  likelyStates: string[];
}

export function getPincodeRegion(pin: string): ApiResponse<PincodeRegionInfo> {
  if (!isValidPincode(pin))
    return fail("INVALID_PIN", "Invalid pincode format");
  const entry = PINCODE_REGION[pin[0]];
  return ok({
    pincode: pin,
    zone: pin[0],
    region: entry.region,
    likelyStates: entry.states,
  });
}

export interface AddressInput {
  pincode: string;
  state?: string;
  district?: string;
  city?: string;
}

export interface AddressValidation {
  valid: boolean;
  pincode: string;
  matched: {
    state: boolean;
    district: boolean;
    city: boolean;
  };
  suggestions: {
    state?: string;
    district?: string;
    city?: string;
  };
  warnings: string[];
}

function fuzzyEqual(a: string, b: string, threshold = 2): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return levenshteinDistance(na, nb) <= threshold;
}

export function validateAddress(
  address: AddressInput,
): ApiResponse<AddressValidation> {
  if (!address || typeof address !== "object") {
    return fail("INVALID_INPUT", "address object is required");
  }
  if (!isValidPincode(address.pincode)) {
    return fail("INVALID_PIN", "Invalid pincode format");
  }

  const lookup = getByPincode(address.pincode);
  if (!lookup.success) return lookup;

  const records = lookup.data;
  const expectedState = records[0].state;
  const expectedDistrict = records[0].district;
  const expectedOffices = records.map((r) => r.office);

  const stateMatch = address.state
    ? fuzzyEqual(address.state, expectedState)
    : true;
  const districtMatch = address.district
    ? fuzzyEqual(address.district, expectedDistrict)
    : true;
  const cityMatch = address.city
    ? expectedOffices.some((o) => fuzzyEqual(address.city as string, o, 3)) ||
      fuzzyEqual(address.city, expectedDistrict, 3)
    : true;

  const warnings: string[] = [];
  if (address.state && !stateMatch) {
    warnings.push(
      `State "${address.state}" does not match pincode (expected ${expectedState})`,
    );
  }
  if (address.district && !districtMatch) {
    warnings.push(
      `District "${address.district}" does not match pincode (expected ${expectedDistrict})`,
    );
  }
  if (address.city && !cityMatch) {
    warnings.push(
      `City "${address.city}" not found among offices of this pincode`,
    );
  }

  return ok({
    valid: stateMatch && districtMatch && cityMatch,
    pincode: address.pincode,
    matched: { state: stateMatch, district: districtMatch, city: cityMatch },
    suggestions: {
      state: stateMatch ? undefined : expectedState,
      district: districtMatch ? undefined : expectedDistrict,
      city: cityMatch ? undefined : expectedOffices[0],
    },
    warnings,
  });
}

export interface AutofilledAddress {
  pincode: string;
  state: string;
  stateCode: string;
  stateLocal: string;
  district: string;
  region: string;
  zone: string;
  cityOptions: string[];
  tier: 1 | 2 | 3;
  serviceable: boolean;
  coordinates: [number, number] | null;
  offices: PincodeRecord[];
}

export function autofillAddress(pin: string): ApiResponse<AutofilledAddress> {
  if (!isValidPincode(pin))
    return fail("INVALID_PIN", "Invalid pincode format");

  const lookup = getByPincode(pin);
  if (!lookup.success) return lookup;

  const records = lookup.data;
  const first = records[0];

  const meta = getStateMeta(first.state);
  const region = getPincodeRegion(pin);
  const tier = getCityTier(pin);
  const serviceable = isServiceable(pin);

  return ok({
    pincode: pin,
    state: first.state,
    stateCode: meta.success ? meta.data.gstCode : "",
    stateLocal: meta.success ? meta.data.nameLocal : "",
    district: first.district,
    region: region.success ? region.data.region : "",
    zone: pin[0],
    cityOptions: Array.from(new Set(records.map((r) => r.office))),
    tier: tier.success ? tier.data.tier : 3,
    serviceable: serviceable.success ? serviceable.data : true,
    coordinates: first.coordinates ?? null,
    offices: records,
  });
}
