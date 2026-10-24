import { contextBridge, ipcRenderer } from "electron";
import type { CreateSpatialObjectInput } from "../core/spatial-object/spatial-object-service.js";
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
});