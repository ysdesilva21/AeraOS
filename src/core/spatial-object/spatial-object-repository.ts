
import type {
  SpatialObject,
  SpatialObjectId,
  WorkspaceId,
} from "./spatial-object.js";

export interface SpatialObjectRepository {
  create(object: SpatialObject): Promise<void>;

  getById(
    workspaceId: WorkspaceId,
    objectId: SpatialObjectId,
  ): Promise<SpatialObject | null>;

  listByWorkspace(workspaceId: WorkspaceId): Promise<SpatialObject[]>;

  update(object: SpatialObject): Promise<void>;

  delete(workspaceId: WorkspaceId, objectId: SpatialObjectId): Promise<void>;
}


export class InMemorySpatialObjectRepository
  implements SpatialObjectRepository
{
  private readonly objects = new Map<string, SpatialObject>();

  async create(object: SpatialObject): Promise<void> {
    const key = this.getKey(object.workspaceId, object.id);

    if (this.objects.has(key)) {
      throw new Error(
        `Spatial object "${object.id}" already exists in this workspace.`,
      );
    }

    this.objects.set(key, structuredClone(object));
  }

  async getById(
    workspaceId: WorkspaceId,
    objectId: SpatialObjectId,
  ): Promise<SpatialObject | null> {
    const object = this.objects.get(this.getKey(workspaceId, objectId));

    return object ? structuredClone(object) : null;
  }

  async listByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> {
    const objects: SpatialObject[] = [];

    for (const object of this.objects.values()) {
      if (object.workspaceId === workspaceId) {
        objects.push(structuredClone(object));
      }
    }

    return objects;
  }

  async update(object: SpatialObject): Promise<void> {
    const key = this.getKey(object.workspaceId, object.id);

    if (!this.objects.has(key)) {
      throw new Error(
        `Spatial object "${object.id}" does not exist in this workspace.`,
      );
    }

    this.objects.set(key, structuredClone(object));
  }

  async delete(
    workspaceId: WorkspaceId,
    objectId: SpatialObjectId,
  ): Promise<void> {
    this.objects.delete(this.getKey(workspaceId, objectId));
  }

  private getKey(
    workspaceId: WorkspaceId,
    objectId: SpatialObjectId,
  ): string {
    return JSON.stringify([workspaceId, objectId]);
  }
}
