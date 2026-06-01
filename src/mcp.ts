/**
 * Minimal stdio MCP (Model Context Protocol) server for indian-pincode-utils.
 *
 * Speaks JSON-RPC 2.0 over stdio. Supports:
 *   - initialize
 *   - tools/list
 *   - tools/call
 *
 * Run:  npx pincode-mcp
 * Or as a programmatic entry: `import { startMcpServer } from "indian-pincode-utils/mcp";`
 *
 * Zero external dependencies.
 */

import { getByPincode, getCoordinates, getByState, getByDistrict, searchOffices } from "./lookup";
import { distanceBetweenPincodes } from "./distance";
import { getNearbyPincodes } from "./nearby";
import { getNearestPincode } from "./nearest";
import {
  isValidPincode,
  getPincodeRegion,
  validateAddress,
  autofillAddress,
} from "./validation";
import {
  getCityTier,
  isMetro,
  isServiceable,
  getShippingZone,
  estimateDeliveryDays,
} from "./shipping";
import {
  getStateCode,
  getStateByCode,
  getStateMeta,
  getStateLocalName,
} from "./gst";
import { suggestPincodes } from "./autocomplete";

type JsonValue = unknown;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: Record<string, JsonValue>;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, JsonValue>;
  handler: (args: Record<string, JsonValue>) => unknown;
}

const tools: Tool[] = [
  {
    name: "get_by_pincode",
    description: "Look up post offices for an Indian pincode.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => getByPincode(String(a.pincode)),
  },
  {
    name: "get_coordinates",
    description: "Get coordinates and offices for a pincode (optionally filtered by office name).",
    inputSchema: { type: "object", properties: { pincode: { type: "string" }, officeName: { type: "string" } }, required: ["pincode"] },
    handler: (a) => getCoordinates(String(a.pincode), a.officeName ? String(a.officeName) : undefined),
  },
  {
    name: "get_by_state",
    description: "List pincodes for an Indian state.",
    inputSchema: { type: "object", properties: { state: { type: "string" }, limit: { type: "number" }, offset: { type: "number" } }, required: ["state"] },
    handler: (a) => getByState(String(a.state), { limit: a.limit as number, offset: a.offset as number }),
  },
  {
    name: "get_by_district",
    description: "List pincodes for an Indian district.",
    inputSchema: { type: "object", properties: { district: { type: "string" }, limit: { type: "number" } }, required: ["district"] },
    handler: (a) => getByDistrict(String(a.district), { limit: a.limit as number }),
  },
  {
    name: "search_offices",
    description: "Search post office names with typo-tolerant matching.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] },
    handler: (a) => searchOffices(String(a.query), { limit: a.limit as number }),
  },
  {
    name: "distance_between_pincodes",
    description: "Haversine distance in km between two pincodes.",
    inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"] },
    handler: (a) => distanceBetweenPincodes(String(a.from), String(a.to)),
  },
  {
    name: "nearby_pincodes",
    description: "Find pincodes within a radius (km) of a given pincode.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" }, radiusKm: { type: "number" } }, required: ["pincode", "radiusKm"] },
    handler: (a) => getNearbyPincodes(String(a.pincode), Number(a.radiusKm)),
  },
  {
    name: "nearest_pincode",
    description: "Find the nearest pincode to a latitude/longitude.",
    inputSchema: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] },
    handler: (a) => getNearestPincode(Number(a.lat), Number(a.lng)),
  },
  {
    name: "is_valid_pincode",
    description: "Check whether a string is a syntactically valid Indian pincode.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => ({ success: true, data: isValidPincode(a.pincode) }),
  },
  {
    name: "pincode_region",
    description: "Get the postal region/zone for a pincode's first digit.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => getPincodeRegion(String(a.pincode)),
  },
  {
    name: "validate_address",
    description: "Cross-check pincode against state/district/city.",
    inputSchema: {
      type: "object",
      properties: {
        pincode: { type: "string" },
        state: { type: "string" },
        district: { type: "string" },
        city: { type: "string" },
      },
      required: ["pincode"],
    },
    handler: (a) => validateAddress(a as never),
  },
  {
    name: "autofill_address",
    description: "Return state, district, GST code, region, tier, and offices for a pincode (form auto-fill).",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => autofillAddress(String(a.pincode)),
  },
  {
    name: "city_tier",
    description: "Classify a pincode as Tier 1, 2 or 3 city.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => getCityTier(String(a.pincode)),
  },
  {
    name: "is_metro",
    description: "Whether a pincode is in a Tier-1 metro.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => isMetro(String(a.pincode)),
  },
  {
    name: "is_serviceable",
    description: "Whether a pincode exists in India Post records.",
    inputSchema: { type: "object", properties: { pincode: { type: "string" } }, required: ["pincode"] },
    handler: (a) => isServiceable(String(a.pincode)),
  },
  {
    name: "shipping_zone",
    description: "Classify a from/to pincode pair into a courier shipping zone.",
    inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"] },
    handler: (a) => getShippingZone(String(a.from), String(a.to)),
  },
  {
    name: "estimate_delivery_days",
    description: "Estimate min/max delivery days between two pincodes.",
    inputSchema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" }, speedFactor: { type: "number" } },
      required: ["from", "to"],
    },
    handler: (a) => estimateDeliveryDays(String(a.from), String(a.to), { speedFactor: a.speedFactor as number }),
  },
  {
    name: "state_gst_code",
    description: "GST state code (2-digit) for a state name.",
    inputSchema: { type: "object", properties: { state: { type: "string" } }, required: ["state"] },
    handler: (a) => getStateCode(String(a.state)),
  },
  {
    name: "state_by_code",
    description: "State name for a GST state code.",
    inputSchema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    handler: (a) => getStateByCode(String(a.code)),
  },
  {
    name: "state_meta",
    description: "Full metadata for a state (GST code, ISO, local name, capital, region).",
    inputSchema: { type: "object", properties: { state: { type: "string" } }, required: ["state"] },
    handler: (a) => getStateMeta(String(a.state)),
  },
  {
    name: "state_local_name",
    description: "Local-language name of a state.",
    inputSchema: { type: "object", properties: { state: { type: "string" } }, required: ["state"] },
    handler: (a) => getStateLocalName(String(a.state)),
  },
  {
    name: "suggest_pincodes",
    description: "Prefix-based pincode autocomplete suggestions.",
    inputSchema: {
      type: "object",
      properties: { prefix: { type: "string" }, limit: { type: "number" } },
      required: ["prefix"],
    },
    handler: (a) => suggestPincodes(String(a.prefix), (a.limit as number) ?? 10),
  },
];

import { getDatasetMetadata } from "./metadata";

const meta = getDatasetMetadata();
const SERVER_INFO = {
  name: meta.success ? meta.data.packageName : "indian-pincode-utils",
  version: meta.success ? meta.data.packageVersion : "0.0.0",
};

function send(message: Record<string, JsonValue>): void {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function reply(id: JsonRpcRequest["id"], result: JsonValue): void {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id: JsonRpcRequest["id"], code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function handle(req: JsonRpcRequest): void {
  const { id, method, params } = req;
  try {
    switch (method) {
      case "initialize":
        reply(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });
        return;
      case "tools/list":
        reply(id, {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        });
        return;
      case "tools/call": {
        const name = String((params as Record<string, JsonValue>)?.name ?? "");
        const args = ((params as Record<string, JsonValue>)?.arguments ?? {}) as Record<string, JsonValue>;
        const tool = tools.find((t) => t.name === name);
        if (!tool) {
          replyError(id, -32601, `Unknown tool: ${name}`);
          return;
        }
        const result = tool.handler(args);
        reply(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
        return;
      }
      case "notifications/initialized":
        return; // notification, no reply
      default:
        replyError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    replyError(id, -32603, err instanceof Error ? err.message : "Internal error");
  }
}

export function startMcpServer(): void {
  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const req = JSON.parse(line) as JsonRpcRequest;
        handle(req);
      } catch {
        replyError(null, -32700, "Parse error");
      }
    }
  });
  process.stdin.on("end", () => process.exit(0));
}
