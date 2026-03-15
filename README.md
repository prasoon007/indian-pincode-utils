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
