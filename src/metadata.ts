import fs from "fs";
import path from "path";

import { ApiResponse, DatasetMetadata } from "./types";
import { ok } from "./utils";
import { loadJson } from "./jsonLoader";

const states = loadJson<string[]>("data/meta/states.json");
const districts = loadJson<string[]>("data/meta/districts.json");
const officeNames = loadJson<string[]>("data/meta/officeNames.json");

function readPackageDetails() {
  const candidatePaths = [
    path.resolve(__dirname, "../../package.json"),
    path.resolve(__dirname, "../../../package.json"),
    path.resolve(process.cwd(), "package.json"),
  ];

  for (const candidate of candidatePaths) {
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      const parsed = JSON.parse(raw) as { name?: string; version?: string };
      if (parsed.name && parsed.version) {
        return { name: parsed.name, version: parsed.version };
      }
    } catch {
      // Ignore and try next path.
    }
  }

  return {
    name: process.env.npm_package_name ?? "indian-pincode-utils",
    version: process.env.npm_package_version ?? "unknown",
  };
}

export function getDatasetMetadata(): ApiResponse<DatasetMetadata> {
  const packageDetails = readPackageDetails();

  return ok({
    packageName: packageDetails.name,
    packageVersion: packageDetails.version,
    generatedAt: new Date().toISOString(),
    source: "India Post postal datasets",
    totalStates: (states as string[]).length,
    totalDistricts: (districts as string[]).length,
    totalOfficeNames: (officeNames as string[]).length,
  });
}
