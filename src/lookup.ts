import officeNames from "../data/meta/officeNames.json";
import states from "../data/meta/states.json";
import districts from "../data/meta/districts.json";

import { ApiResponse, Coordinates, PincodeRecord } from "./types";
import { loadShard } from "./dataLoader";

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

export function getByPincode(pin: string): ApiResponse<PincodeRecord[]> {
  if (!/^\d{6}$/.test(pin)) {
    return { success: false, error: "Invalid pincode format" };
  }

  const shard = loadShard(pin[0]);
  const rows = shard.index[pin];

  if (!rows) {
    return { success: false, error: "Pincode not found" };
  }

  const result = rows.map((i: number) => formatRow(shard.offices[i], shard));

  return {
    success: true,
    data: result,
  };
}

export function getCoordinates(pin: string): ApiResponse<Coordinates> {
  if (!/^\d{6}$/.test(pin)) {
    return { success: false, error: "Invalid pincode format" };
  }

  const shard = loadShard(pin[0]);

  const coords = shard.pincodes[pin];

  if (!coords) {
    return { success: false, error: "Pincode not found" };
  }

  return {
    success: true,
    data: coords,
  };
}

export function getByState(stateName: string): ApiResponse<PincodeRecord[]> {
  const stateNames = states as string[];
  const stateIndex = stateNames.findIndex(
    (s) => s.toLowerCase() === stateName.toLowerCase(),
  );

  if (stateIndex === -1) {
    return { success: false, error: "State not found" };
  }

  const result: PincodeRecord[] = [];

  for (let i = 1; i <= 9; i++) {
    const shard = loadShard(String(i));

    shard.offices.forEach((row: any) => {
      if (row[3] === stateIndex) {
        result.push(formatRow(row, shard));
      }
    });
  }

  return {
    success: true,
    data: result,
  };
}

export function getByDistrict(
  districtName: string,
): ApiResponse<PincodeRecord[]> {
  const districtNames = districts as string[];
  const districtIndex = districtNames.findIndex(
    (d) => d.toLowerCase() === districtName.toLowerCase(),
  );

  if (districtIndex === -1) {
    return { success: false, error: "District not found" };
  }

  const result: PincodeRecord[] = [];

  for (let i = 1; i <= 9; i++) {
    const shard = loadShard(String(i));

    shard.offices.forEach((row: any) => {
      if (row[2] === districtIndex) {
        result.push(formatRow(row, shard));
      }
    });
  }

  return {
    success: true,
    data: result,
  };
}
