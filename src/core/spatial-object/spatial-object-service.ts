import {
  createSpatialObject,
  type ResourceReference,
  type SpatialObject,
  type WorkspaceId,
  type ObjectImportance,
  type ObjectWorkflowStatus,
  type SpatialProperties,
  type SpatialObjectSettings,
} from "./spatial-object.js";

import type { SpatialObjectRepository } from "./spatial-object-repository.js";
import { generateSpatialObjectId } from "./spatial-object-id.js";

import {
  assertValidResourceReference,
  validateSpatialObjectChanges,
} from "./spatial-object-validation.js";

export interface CreateSpatialObjectInput {
  workspaceId: WorkspaceId;
  title: string;
  resource: ResourceReference;
}

export interface UpdateSpatialObjectInput {
  title?: string;
  importance?: ObjectImportance;
  status?: ObjectWorkflowStatus;
  tags?: string[];
  groupIds?: string[];
  spatial?: SpatialProperties;
  settings?: SpatialObjectSettings;
}

export class SpatialObjectService {
  private readonly repository: SpatialObjectRepository;

    constructor(repository: SpatialObjectRepository) {
    this.repository = repository;
    }

  async create(
    input: CreateSpatialObjectInput,
  ): Promise<SpatialObject> {
    const workspaceId = input.workspaceId.trim();
    const title = input.title.trim();
    assertValidResourceReference(input.resource);

    if (!workspaceId) {
      throw new Error("Workspace ID is required.");
    }

    if (!title) {
      throw new Error("Object title is required.");
    }

    const object = createSpatialObject({
      id: generateSpatialObjectId(),
      workspaceId,
      title,
      resource: input.resource,
    });

    await this.repository.create(object);

    return object;
  }

  async getById(
    workspaceId: WorkspaceId,
    objectId: string,
  ): Promise<SpatialObject | null> {
    if (!workspaceId.trim()) {
      throw new Error("Workspace ID is required.");
    }

    if (!objectId.trim()) {
      throw new Error("Object ID is required.");
    }

    return this.repository.getById(workspaceId, objectId);
  }

  async listByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> {
    if (!workspaceId.trim()) {
      throw new Error("Workspace ID is required.");
    }

    return this.repository.listByWorkspace(workspaceId);
  }

  
async update(
  workspaceId: WorkspaceId,
  objectId: string,
  changes: UpdateSpatialObjectInput,
): Promise<SpatialObject> {
  validateSpatialObjectChanges(changes);

  const object = await this.getById(workspaceId, objectId);

  if (!object) {
    throw new Error(`Spatial object "${objectId}" was not found.`);
  }

  const updated: SpatialObject = {
    ...object,

    ...(changes.title !== undefined && {
      title: changes.title,
    }),
    ...(changes.importance !== undefined && {
      importance: changes.importance,
    }),
    ...(changes.status !== undefined && {
      status: changes.status,
    }),

    title:
      changes.title === undefined
        ? object.title
        : changes.title.trim(),

    tags:
      changes.tags === undefined
        ? object.tags
        : [...changes.tags],

    groupIds:
      changes.groupIds === undefined
        ? object.groupIds
        : [...changes.groupIds],

    spatial:
      changes.spatial === undefined
        ? object.spatial
        : structuredClone(changes.spatial),

    settings:
      changes.settings === undefined
        ? object.settings
        : structuredClone(changes.settings),

    updatedAt: Date.now(),
  };

  if (!updated.title) {
    throw new Error("Object title cannot be empty.");
  }

  await this.repository.update(updated);

  return updated;
}

    
  async moveToTrash(
    workspaceId: WorkspaceId,
    objectId: string,
  ): Promise<SpatialObject> {
    const object = await this.getById(workspaceId, objectId);

    if (!object) {
      throw new Error(`Spatial object "${objectId}" was not found.`);
    }

    if (object.lifecycle.deletedAt !== null) {
      return object;
    }

    const updated: SpatialObject = {
      ...object,
      lifecycle: {
        deletedAt: Date.now(),
      },
      updatedAt: Date.now(),
    };

    await this.repository.update(updated);

    return updated;
  }

  async restore(
    workspaceId: WorkspaceId,
    objectId: string,
  ): Promise<SpatialObject> {
    const object = await this.getById(workspaceId, objectId);

    if (!object) {
      throw new Error(`Spatial object "${objectId}" was not found.`);
    }

    if (object.lifecycle.deletedAt === null) {
      return object;
    }

    const updated: SpatialObject = {
      ...object,
      lifecycle: {
        deletedAt: null,
      },
      updatedAt: Date.now(),
    };

    await this.repository.update(updated);

    return updated;
  }

  
  async listActiveByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> {
    const objects = await this.listByWorkspace(workspaceId);

    return objects.filter(
      (object) => object.lifecycle.deletedAt === null,
    );
  }

  async listTrashByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> {
    const objects = await this.listByWorkspace(workspaceId);

    return objects.filter(
      (object) => object.lifecycle.deletedAt !== null,
    );
  }

}
