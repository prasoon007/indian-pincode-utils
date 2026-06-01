import { getByPincode } from "./lookup";
import { isValidPincode, autofillAddress, AutofilledAddress } from "./validation";
import { loadShard } from "./dataLoader";
import { loadJson } from "./jsonLoader";

const officeNames = loadJson<string[]>("data/meta/officeNames.json");
const districts = loadJson<string[]>("data/meta/districts.json");
const states = loadJson<string[]>("data/meta/states.json");

export interface AutocompleteSuggestion {
  pincode: string;
  label: string;
  district: string;
  state: string;
}

export interface AutocompleteOptions {
  limit?: number;
  debounceMs?: number;
}

export interface AutocompleteController {
  setQuery(query: string): void;
  getQuery(): string;
  getSuggestions(): AutocompleteSuggestion[];
  getStatus(): "idle" | "loading" | "ready" | "no-results" | "invalid";
  select(pincode: string): Promise<AutofilledAddress | null>;
  destroy(): void;
  subscribe(listener: () => void): () => void;
}

function buildSuggestions(query: string, limit: number): AutocompleteSuggestion[] {
  // Suggestion strategy: if 6 digits, exact lookup; if 3-5 digits, prefix scan
  if (/^\d{6}$/.test(query)) {
    const res = getByPincode(query);
    if (!res.success) return [];
    return res.data.slice(0, limit).map((r) => ({
      pincode: r.pincode,
      label: `${r.pincode} — ${r.office}, ${r.district}, ${r.state}`,
      district: r.district,
      state: r.state,
    }));
  }

  if (/^\d{3,5}$/.test(query)) {
    const shard = loadShard(query[0]);
    const results: AutocompleteSuggestion[] = [];
    const seen = new Set<string>();

    for (const pin of Object.keys(shard.pincodes)) {
      if (!pin.startsWith(query)) continue;
      if (seen.has(pin)) continue;
      seen.add(pin);
      const idx = shard.index[pin];
      if (!idx || idx.length === 0) continue;
      const row = shard.offices[idx[0]];
      results.push({
        pincode: pin,
        label: `${pin} — ${officeNames[row[1]]}, ${districts[row[2]]}, ${states[row[3]]}`,
        district: districts[row[2]],
        state: states[row[3]],
      });
      if (results.length >= limit) break;
    }
    return results;
  }

  return [];
}

/**
 * Framework-agnostic autocomplete controller. Works with React, Vue, Svelte,
 * vanilla JS — subscribe to changes via `subscribe()`.
 *
 * Example (React):
 *   const ctrl = useMemo(() => createPincodeAutocomplete(), []);
 *   useEffect(() => ctrl.subscribe(() => forceUpdate()), [ctrl]);
 *   <input onChange={e => ctrl.setQuery(e.target.value)} />
 *   {ctrl.getSuggestions().map(s => <li key={s.pincode}>{s.label}</li>)}
 */
export function createPincodeAutocomplete(
  options: AutocompleteOptions = {},
): AutocompleteController {
  const limit = options.limit ?? 10;
  const debounceMs = options.debounceMs ?? 150;

  let query = "";
  let suggestions: AutocompleteSuggestion[] = [];
  let status: ReturnType<AutocompleteController["getStatus"]> = "idle";
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());

  const compute = () => {
    if (!query) {
      suggestions = [];
      status = "idle";
      emit();
      return;
    }
    if (!/^\d{3,6}$/.test(query)) {
      suggestions = [];
      status = "invalid";
      emit();
      return;
    }
    status = "loading";
    emit();
    suggestions = buildSuggestions(query, limit);
    status = suggestions.length ? "ready" : "no-results";
    emit();
  };

  return {
    setQuery(q: string) {
      query = (q ?? "").trim();
      if (timer) clearTimeout(timer);
      timer = setTimeout(compute, debounceMs);
    },
    getQuery: () => query,
    getSuggestions: () => suggestions,
    getStatus: () => status,
    async select(pincode: string) {
      if (!isValidPincode(pincode)) return null;
      const res = autofillAddress(pincode);
      return res.success ? res.data : null;
    },
    destroy() {
      if (timer) clearTimeout(timer);
      listeners.clear();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Synchronous prefix-based suggestions — useful for SSR or one-shot calls.
 */
export function suggestPincodes(
  prefix: string,
  limit = 10,
): AutocompleteSuggestion[] {
  if (!prefix) return [];
  return buildSuggestions(String(prefix).trim(), limit);
}
