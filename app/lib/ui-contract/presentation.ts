import type { BuildingHealthSnapshot } from './building-health';

// The connected UI now consumes the complete server contract, without filling gaps.
export type HealthPresentation = BuildingHealthSnapshot;
