export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type Coordinates = [latitude: number, longitude: number];

export interface PincodeRecord {
  pincode: number;
  office: string;
  district: string;
  state: string;
  coordinates: Coordinates;
}

export interface NearbyPincode {
  pincode: number;
  distanceKm: number;
}

export type PincodeCoordinates = Record<string, Coordinates>;

export type OfficeRow = [
  pincode: string,
  officeIndex: number,
  districtIndex: number,
  stateIndex: number,
];

export type OfficeRows = OfficeRow[];

export type IndexMap = Record<string, number[]>;

export type StringDictionary = string[];

export interface DatasetShard {
  pincodes: Record<string, [number, number]>;
  offices: [string, number, number, number][];
  index: Record<string, number[]>;
}

export interface NearestPincode {
  pincode: string;
  distanceKm: number;
}

export type Polygon = Coordinates[];

export interface PolygonPincode {
  pincode: string;
  coordinates: Coordinates;
}
