
import type { CreateSpatialObjectInput, UpdateSpatialObjectInput } from "../core/spatial-object/spatial-object-service";
import type { SpatialObject, WorkspaceId } from "../core/spatial-object/spatial-object";

declare global {
  interface Window {
    aeraos: {
      getAppVersion(): Promise<string>;

      createSpatialObject(
        input: CreateSpatialObjectInput,
      ): Promise<SpatialObject>;

      listSpatialObjects(
        workspaceId: WorkspaceId,
      ): Promise<SpatialObject[]>;

      updateSpatialObject(
        workspaceId: WorkspaceId,
        objectId: string,
        changes: UpdateSpatialObjectInput,
      ): Promise<SpatialObject>;

      trashSpatialObject(
        workspaceId: WorkspaceId,
        objectId: string,
      ): Promise<SpatialObject>;

      restoreSpatialObject(
        workspaceId: WorkspaceId,
        objectId: string,
      ): Promise<SpatialObject>;

      listActiveSpatialObjects(
        workspaceId: WorkspaceId,
      ): Promise<SpatialObject[]>;

      listTrashSpatialObjects(
        workspaceId: WorkspaceId,
      ): Promise<SpatialObject[]>;

      clearTestWorkspace(): Promise<{
        deletedCount: number;
        remainingCount: number;
        }>;
    };
  }
}

export {};
