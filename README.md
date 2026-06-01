# Indian Pincode Utils

Indian pincode lookup and geospatial utilities for Node.js and TypeScript.

The package provides fast postal lookup, coordinate-based search, distance utilities, and state or district filtering on top of India Post-derived data.

## Features

- Fast pincode lookup with office-level records
- Coordinates lookup with centroid and office filtering
- Distance between pincodes and distance matrix generation
- Nearby and nearest pincode search
- Polygon-based geospatial filtering
- Query by state and district with sorting and pagination
- Office name search with typo-tolerant matching
- Bulk lookup APIs
- TypeScript-first API design with structured error codes
- **One-call address auto-fill and address validation** _(v1.1.0)_
- **City tier, shipping zone, and delivery-day estimation** _(v1.1.0)_
- **GST state codes, ISO 3166-2, and local-language state names** _(v1.1.0)_
- **Framework-agnostic pincode autocomplete controller** _(v1.1.0)_
- **Built-in MCP (Model Context Protocol) server for LLM agents** _(v1.1.0)_

## Installation

```bash
npm install indian-pincode-utils
```

## Quick Start

```ts
import { getByPincode, getCoordinates } from "indian-pincode-utils";

console.log(getByPincode("110001"));
console.log(getCoordinates("515631"));
```

## API Overview

### Lookup

```ts
getByPincode(pin)
getByPincodes(pins)
searchOffices(query, options?)
```

### Coordinates

```ts
getCoordinates(pin, officeNameOrOptions?)
```

Examples:

```ts
getCoordinates("515631");

getCoordinates("515631", "Peddakotla");

getCoordinates("515631", {
  officeName: "peddakotla",
  exact: false,
  limit: 5,
});
```

Sample response shape:

```json
{
  "success": true,
  "data": {
    "centroid": [14.557463, 77.855278],
    "coordinateSource": "office",
    "confidence": 0.95,
    "total": 15,
    "pincodes": [
      {
        "pincode": "515631",
        "office": "PEDDAKOTLA B.O",
        "district": "ANANTAPUR",
        "state": "ANDHRA PRADESH",
        "coordinates": [14.5689, 77.85624]
      }
    ]
  }
}
```

### State and District Queries

```ts
getByState(state, options?)
getByDistrict(district, options?)
```

Options support:

- sortBy: pincode | office | district | state
- sortOrder: asc | desc
- offset
- limit

### Distance and Nearby Search

```ts
distanceBetweenPincodes(pin1, pin2);
distanceMatrix(pins);
getNearbyPincodes(pin, radiusKm);
getPincodesNear(lat, lng, options);
getNearestPincode(lat, lng);
```

### Geospatial Polygon Query

```ts
getPincodesWithinPolygon(polygon);
```

### Dataset Metadata

```ts
getDatasetMetadata();
```

## What's new in v1.1.0

The following modules were introduced in **v1.1.0**. They are exported from the root entry and also available as subpath imports for better tree-shaking.

### Address validation and auto-fill _(v1.1.0)_

```ts
import {
  isValidPincode,
  getPincodeRegion,
  validateAddress,
  autofillAddress,
} from "indian-pincode-utils";
// or: from "indian-pincode-utils/validation";

isValidPincode("110001"); // true
isValidPincode("010001"); // false (first digit cannot be 0)

getPincodeRegion("700001");
// { zone: "7", region: "Eastern", likelyStates: [...] }

validateAddress({
  pincode: "110001",
  state: "Delhi",
  district: "Central Delhi",
  city: "Connaught Place",
});
// { valid: true, matched: { state: true, district: true, city: true }, warnings: [] }

autofillAddress("110001");
// {
//   pincode, state, stateCode, stateLocal, district, region, zone,
//   cityOptions: [...], tier: 1, serviceable: true,
//   coordinates: [lat, lng], offices: [...]
// }
```

### Shipping, city tier, and delivery estimates _(v1.1.0)_

```ts
import {
  getCityTier,
  isMetro,
  isServiceable,
  getShippingZone,
  estimateDeliveryDays,
} from "indian-pincode-utils";
// or: from "indian-pincode-utils/shipping";

getCityTier("400001"); // { tier: 1, city: "Mumbai" }
isMetro("560001"); // true
isServiceable("110001"); // true

getShippingZone("110001", "400001");
// { zone: "metro", sameState: false, distanceKm: 1163.9 }

estimateDeliveryDays("110001", "400001");
// { zone: "metro", minDays: 2, maxDays: 4, distanceKm: 1163.9 }

// Optional speedFactor: <1 = express, >1 = slower (e.g. SF Express ~0.5)
estimateDeliveryDays("110001", "400001", { speedFactor: 0.5 });
```

Zones are classified as `local`, `regional`, `metro`, `rest-of-india`, or `special` (NE states, J&K, Ladakh, A&N, Lakshadweep).

### GST state codes and local-language names _(v1.1.0)_

```ts
import {
  getStateCode,
  getStateByCode,
  getStateMeta,
  getStateLocalName,
  listStateMeta,
} from "indian-pincode-utils";
// or: from "indian-pincode-utils/gst";

getStateCode("Maharashtra"); // { data: "27" }
getStateByCode("27"); // { data: "MAHARASHTRA" }
getStateLocalName("Tamil Nadu"); // { data: { nameLocal: "தமிழ்நாடு", script: "Tamil" } }
getStateMeta("Karnataka");
// { gstCode: "29", iso: "IN-KA", nameLocal: "ಕರ್ನಾಟಕ", script: "Kannada",
//   region: "South", capital: "Bengaluru" }
```

Covers all 28 states and 8 union territories with GST state codes, ISO 3166-2 codes, capital, region, and native-script name.

### Pincode autocomplete _(v1.1.0)_

A framework-agnostic controller that works with React, Vue, Svelte, or vanilla JS via a subscribe/notify model.

```ts
import {
  createPincodeAutocomplete,
  suggestPincodes,
} from "indian-pincode-utils";
// or: from "indian-pincode-utils/autocomplete";

// One-shot synchronous prefix search
suggestPincodes("1100", 5);
// [{ pincode, label, district, state }, ...]

// Stateful controller with debouncing
const ctrl = createPincodeAutocomplete({ limit: 10, debounceMs: 150 });
ctrl.subscribe(() => render());
ctrl.setQuery("5606");
ctrl.getSuggestions();
ctrl.getStatus(); // "idle" | "loading" | "ready" | "no-results" | "invalid"
await ctrl.select("560001"); // returns the full autofilled address
```

### MCP server for LLM agents _(v1.1.0)_

An MCP (Model Context Protocol) server is bundled so AI agents (Claude Desktop, VS Code MCP clients, etc.) can answer Indian-address questions out of the box. Zero external dependencies.

Run as a CLI:

```bash
npx pincode-mcp
```

Or embed programmatically:

```ts
import { startMcpServer } from "indian-pincode-utils/mcp";
startMcpServer();
```

Example VS Code / Claude Desktop config:

```json
{
  "mcpServers": {
    "indian-pincode": {
      "command": "npx",
      "args": ["-y", "pincode-mcp"]
    }
  }
}
```

The server exposes 22 tools, including `get_by_pincode`, `autofill_address`, `validate_address`, `estimate_delivery_days`, `shipping_zone`, `city_tier`, `state_gst_code`, `nearby_pincodes`, and `nearest_pincode`.

### Subpath exports _(v1.1.0)_

For optimal tree-shaking:

```ts
import { isValidPincode } from "indian-pincode-utils/validation";
import { estimateDeliveryDays } from "indian-pincode-utils/shipping";
import { getStateCode } from "indian-pincode-utils/gst";
import { createPincodeAutocomplete } from "indian-pincode-utils/autocomplete";
import { startMcpServer } from "indian-pincode-utils/mcp";
```

## Error Handling

All error responses include a stable error code in addition to a message.

Common codes:

- INVALID_PIN
- INVALID_INPUT
- PIN_NOT_FOUND
- OFFICE_NOT_FOUND
- STATE_NOT_FOUND
- DISTRICT_NOT_FOUND
- NO_RESULTS

## Data and Performance Notes

- Data is sharded by pincode prefix for quick lazy loading.
- Geohash indexing is used for nearby and nearest lookups.
- Coordinate source is explicit in responses as centroid or office.

## Contributing

Contributions are welcome.

1. Open an issue with context and sample data.
2. Submit a pull request with tests or reproduction steps.

## License

MIT
