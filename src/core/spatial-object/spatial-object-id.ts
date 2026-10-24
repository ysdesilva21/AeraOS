
import type { SpatialObjectId } from "./spatial-object.js";

export function generateSpatialObjectId(): SpatialObjectId {
  return crypto.randomUUID();
}
