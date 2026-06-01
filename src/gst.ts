import { ApiResponse } from "./types";
import { fail, ok } from "./utils";
import { loadJson } from "./jsonLoader";

export interface StateMetaEntry {
  gstCode: string;
  iso: string;
  nameLocal: string;
  script: string;
  region: string;
  capital: string;
}

const meta = loadJson<Record<string, StateMetaEntry>>("data/meta/stateMeta.json");

const byCode: Record<string, string> = {};
for (const [name, entry] of Object.entries(meta)) {
  byCode[entry.gstCode] = name;
}

function normalize(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

function resolveStateKey(name: string): string | null {
  const n = normalize(name);
  if (meta[n]) return n;
  for (const key of Object.keys(meta)) {
    if (key === n || key.replace(/^THE /, "") === n.replace(/^THE /, "")) {
      return key;
    }
  }
  return null;
}

export function getStateCode(state: string): ApiResponse<string> {
  const key = resolveStateKey(state);
  if (!key) return fail("STATE_NOT_FOUND", "State not found");
  return ok(meta[key].gstCode);
}

export function getStateByCode(code: string): ApiResponse<string> {
  const c = String(code).padStart(2, "0");
  const name = byCode[c];
  if (!name) return fail("STATE_NOT_FOUND", "Unknown GST state code");
  return ok(name);
}

export function getStateMeta(state: string): ApiResponse<StateMetaEntry & { name: string }> {
  const key = resolveStateKey(state);
  if (!key) return fail("STATE_NOT_FOUND", "State not found");
  return ok({ name: key, ...meta[key] });
}

export function getStateLocalName(
  state: string,
): ApiResponse<{ name: string; nameLocal: string; script: string }> {
  const key = resolveStateKey(state);
  if (!key) return fail("STATE_NOT_FOUND", "State not found");
  const { nameLocal, script } = meta[key];
  return ok({ name: key, nameLocal, script });
}

export function listStateMeta(): (StateMetaEntry & { name: string })[] {
  return Object.entries(meta).map(([name, entry]) => ({ name, ...entry }));
}
