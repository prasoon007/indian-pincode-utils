export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: ErrorCode;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ErrorCode =
  | "INVALID_PIN"
  | "INVALID_INPUT"
  | "PIN_NOT_FOUND"
  | "OFFICE_NOT_FOUND"
  | "STATE_NOT_FOUND"
  | "DISTRICT_NOT_FOUND"
  | "NO_RESULTS";

export type Coordinates = [latitude: number, longitude: number];

export interface PaginationOptions {
  offset?: number;
  limit?: number;
}

export type SortOrder = "asc" | "desc";

export interface RecordQueryOptions extends PaginationOptions {
  sortBy?: "pincode" | "office" | "district" | "state";
  sortOrder?: SortOrder;
}

export interface CoordinatesOptions extends PaginationOptions {
  officeName?: string;
  exact?: boolean;
}

export interface CoordinatesLookupResult {
  centroid: Coordinates;
  coordinateSource: "centroid" | "office";
  confidence: number;
  total: number;
  pincodes: PincodeRecord[];
}

export interface PincodeRecord {
  pincode: string;
  office: string;
  district: string;
  state: string;
  coordinates: Coordinates;
}

export interface NearbyPincode {
  pincode: string;
  distanceKm: number;
}

export interface NearbyPincodeRecord extends PincodeRecord {
  distanceKm: number;
}

export interface SearchOfficeResult {
  office: string;
  score: number;
}

export interface SearchOfficeOptions extends PaginationOptions {
  limit?: number;
}

export interface PincodesNearOptions extends PaginationOptions {
  radiusKm: number;
  includeDetails?: boolean;
}

export interface DatasetMetadata {
  packageName: string;
  packageVersion: string;
  generatedAt: string;
  source: string;
  totalStates: number;
  totalDistricts: number;
  totalOfficeNames: number;
}

export type BulkPincodeLookup = Record<string, ApiResponse<PincodeRecord[]>>;

export interface DistanceMatrixEntry {
  from: string;
  to: string;
  distanceKm: number;
}

export type PincodeCoordinates = Record<string, Coordinates>;

export type OfficeRow = [
  pincode: string,
  officeIndex: number,
  districtIndex: number,
  stateIndex: number,
  latitude?: number,
  longitude?: number,
];

export type OfficeRows = OfficeRow[];

export type IndexMap = Record<string, number[]>;

export type StringDictionary = string[];

export interface DatasetShard {
  pincodes: Record<string, [number, number]>;
  offices: OfficeRow[];
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
