
import { contextBridge, ipcRenderer } from "electron";
import type {
  CreateSpatialObjectInput,
  UpdateSpatialObjectInput,
} from "../core/spatial-object/spatial-object-service.js";
import type {
  SpatialObject,
  WorkspaceId,
} from "../core/spatial-object/spatial-object.js";

contextBridge.exposeInMainWorld("aeraos", {
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke("aeraos:get-app-version"),

  createSpatialObject: (
    input: CreateSpatialObjectInput,
  ): Promise<SpatialObject> =>
    ipcRenderer.invoke("aeraos:spatial-objects:create", input),

  listSpatialObjects: (
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> =>
    ipcRenderer.invoke("aeraos:spatial-objects:list", workspaceId),

  updateSpatialObject: (
    workspaceId: WorkspaceId,
    objectId: string,
    changes: UpdateSpatialObjectInput,
  ): Promise<SpatialObject> =>
    ipcRenderer.invoke("aeraos:spatial-objects:update", {
      workspaceId,
      objectId,
      changes,
    }),

  trashSpatialObject: (
    workspaceId: WorkspaceId,
    objectId: string,
  ): Promise<SpatialObject> =>
    ipcRenderer.invoke("aeraos:spatial-objects:trash", {
      workspaceId,
      objectId,
    }),

  restoreSpatialObject: (
    workspaceId: WorkspaceId,
    objectId: string,
  ): Promise<SpatialObject> =>
    ipcRenderer.invoke("aeraos:spatial-objects:restore", {
      workspaceId,
      objectId,
    }),

  listActiveSpatialObjects: (
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> =>
    ipcRenderer.invoke("aeraos:spatial-objects:list-active", workspaceId),

  listTrashSpatialObjects: (
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> =>
    ipcRenderer.invoke("aeraos:spatial-objects:list-trash", workspaceId),

  clearTestWorkspace: (): Promise<{
  deletedCount: number;
  remainingCount: number;
}> => ipcRenderer.invoke("aeraos:spatial-objects:clear-test-workspace"),
});
