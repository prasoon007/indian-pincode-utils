# 🇮🇳 Indian Pincode Utils

Fast **Indian pincode lookup and geospatial utilities** for Node.js and TypeScript.

This library provides accurate **Indian postal code data** along with powerful utilities for geospatial queries.

The dataset is derived from **official India Post data** and optimized for fast lookup.

---

# ✨ Features

- ⚡ Fast pincode lookup
- 📍 Get coordinates of a pincode
- 📏 Distance between pincodes
- 🔎 Nearby pincode search
- 🏙 Query by state or district
- 📍 Find nearest pincode from coordinates
- 🗺 Geospatial polygon queries
- 🧠 Optimized with prefix sharding and geohash indexing
- 📦 Lightweight dataset (~1MB)
- 🧾 Full TypeScript support

---

# 📦 Installation

```bash id="installcmd"
npm install indian-pincode-utils
```

or

```bash id="installcmd2"
yarn add indian-pincode-utils
```

---

# 🚀 Quick Example

```ts id="quickexample"
import { getByPincode } from "indian-pincode-utils";

const result = getByPincode("110001");

console.log(result);
```

Output:

```json id="quickoutput"
{
  "success": true,
  "data": [
    {
      "pincode": "110001",
      "office": "Connaught Place",
      "district": "NEW DELHI",
      "state": "DELHI",
      "coordinates": [28.6174, 77.2129]
    }
  ]
}
```

---

# 📍 Get Coordinates

```ts id="getcoords"
import { getCoordinates } from "indian-pincode-utils";

getCoordinates("110001");

getCoordinates("226028", "RASOOLPUR");

getCoordinates("226028", {
  officeName: "rasoolpur",
  exact: false,
  limit: 5,
});
```

Returns:

```json
{
  "success": true,
  "data": {
    "centroid": [26.86717, 81.002978],
    "coordinateSource": "centroid",
    "confidence": 0.7,
    "total": 8,
    "pincodes": [
      {
        "pincode": "226028",
        "office": "RASOOLPUR SAADAT BO",
        "district": "LUCKNOW",
        "state": "UTTAR PRADESH",
        "coordinates": [26.86717, 81.002978]
      }
    ]
  }
}
```

---

# 📏 Distance Between Pincodes

```ts id="distance"
import { distanceBetweenPincodes } from "indian-pincode-utils";

distanceBetweenPincodes("110001", "400001");
```

Returns distance in **kilometers**.

---

# 🔎 Find Nearby Pincodes

```ts id="nearby"
import { getNearbyPincodes, getPincodesNear } from "indian-pincode-utils";

getNearbyPincodes("110001", 10);

getPincodesNear(26.8467, 80.9462, {
  radiusKm: 20,
  includeDetails: true,
  limit: 25,
});
```

Returns all pincodes within **10 km radius**.

---

# 📍 Find Nearest Pincode

```ts id="nearest"
import { getNearestPincode } from "indian-pincode-utils";

getNearestPincode(28.6139, 77.209);
```

---

# 🗺 Get Pincodes Within Polygon

```ts id="polygon"
import { getPincodesWithinPolygon } from "indian-pincode-utils";

const polygon = [
  [28.7, 77.1],
  [28.7, 77.3],
  [28.55, 77.3],
  [28.55, 77.1],
];

getPincodesWithinPolygon(polygon);
```

Useful for:

- delivery zones
- geofencing
- logistics routing

---

# 🏙 Query by State

```ts id="state"
getByState("DELHI");
```

---

# 🏘 Query by District

```ts id="district"
getByDistrict("NEW DELHI");
```

---

# 📊 Dataset Source

The dataset is derived from **India Post official postal data**.

Sources include:

- India Post postal circle datasets
- Government postal code releases

The data is periodically synchronized with government updates.

---

# ⚡ Performance

The package is optimized for high performance.

| Feature       | Implementation     |
| ------------- | ------------------ |
| Fast lookup   | prefix sharding    |
| Nearby search | geohash index      |
| Memory usage  | lazy shard loading |
| Type safety   | TypeScript types   |

---

# 🧩 API

```
getByPincode(pin)

getCoordinates(pin, officeNameOrOptions?)

searchOffices(query, options?)

getByPincodes(pins)

getByState(state, options?)

getByDistrict(district, options?)

distanceBetweenPincodes(pin1, pin2)

distanceMatrix(pins)

getNearbyPincodes(pin, radiusKm)

getPincodesNear(lat, lng, options)

getNearestPincode(lat, lng)

getPincodesWithinPolygon(polygon)

getDatasetMetadata()
```

All API errors now include an error `code` for easier handling.

---

# 🤝 Contributing

Contributions are welcome.

If you find incorrect data or want to improve the dataset:

1. Open an issue
2. Submit a pull request

---

# 📜 License

MIT License

---

# ⭐ Support

If you find this library useful, consider giving the repository a ⭐ on GitHub.
