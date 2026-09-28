export type OperationalDataState = "demo" | "loading" | "live" | "error";

type ConnectedSnapshotCollections = {
  anomalies: readonly unknown[];
  equipment: readonly unknown[];
  vendors: readonly unknown[];
  workOrders: readonly unknown[];
  reports: readonly unknown[];
  costs: readonly unknown[];
};

export function acceptConnectedSnapshot<T extends ConnectedSnapshotCollections>(snapshot: T) {
  return {
    dataState: "live" as const,
    ...snapshot,
  };
}

export function rejectConnectedSnapshot() {
  return {
    dataState: "error" as const,
    anomalies: [],
    equipment: [],
    vendors: [],
    workOrders: [],
    reports: [],
    costs: [],
  };
}

export function validatedScore(value: number | null, isValidated: boolean): number | null {
  if (!isValidated || value === null || !Number.isFinite(value)) return null;
  return value;
}
