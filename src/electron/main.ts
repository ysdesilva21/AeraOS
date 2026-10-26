
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDev } from "./util.js";

import { SqliteSpatialObjectRepository } from "../core/spatial-object/sqlite-spatial-object-repository.js";
import {
  SpatialObjectService,
  type UpdateSpatialObjectInput,
} from "../core/spatial-object/spatial-object-service.js";
import { assertValidResourceReference } from "../core/spatial-object/spatial-object-validation.js";



const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

let spatialObjectRepository: SqliteSpatialObjectRepository | null = null;
let spatialObjectService: SpatialObjectService | null = null;

function getSpatialObjectService(): SpatialObjectService {
  if (!spatialObjectService) {
    throw new Error("Spatial object storage is not initialized.");
  }

  return spatialObjectService;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

ipcMain.handle("aeraos:get-app-version", () => {
  return process.versions.electron;
});

ipcMain.handle(
  "aeraos:spatial-objects:list",
  async (_event, workspaceId: unknown) => {
    if (typeof workspaceId !== "string") {
      throw new Error("Workspace ID must be a string.");
    }

    return getSpatialObjectService().listByWorkspace(workspaceId);
  },
);

ipcMain.handle(
  "aeraos:spatial-objects:create",
  async (_event, input: unknown) => {
    if (!isRecord(input)) {
      throw new Error("Invalid spatial object input.");
    }

    if (
      typeof input.workspaceId !== "string" ||
      typeof input.title !== "string" ||
      !("resource" in input)
    ) {
      throw new Error("Workspace ID, title, and resource are required.");
    }

    const allowedKeys = ["workspaceId", "title", "resource"];

    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      throw new Error("Unexpected field in spatial object input.");
    }

    assertValidResourceReference(input.resource);

    return getSpatialObjectService().create({
      workspaceId: input.workspaceId,
      title: input.title,
      resource: input.resource,
    });
  },
);

ipcMain.handle(
  "aeraos:spatial-objects:update",
  async (_event, input: unknown) => {
    if (!isRecord(input)) {
      throw new Error("Invalid spatial object update input.");
    }

    const allowedKeys = ["workspaceId", "objectId", "changes"];

    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      throw new Error("Unexpected field in spatial object update input.");
    }

    if (
      typeof input.workspaceId !== "string" ||
      typeof input.objectId !== "string" ||
      !isRecord(input.changes)
    ) {
      throw new Error(
        "Workspace ID, object ID, and changes are required.",
      );
    }

    const allowedChangeKeys = [
      "title",
      "importance",
      "status",
      "tags",
      "groupIds",
      "spatial",
      "settings",
    ];

    if (
      Object.keys(input.changes).some(
        (key) => !allowedChangeKeys.includes(key),
      )
    ) {
      throw new Error("Unexpected field in spatial object changes.");
    }

    return getSpatialObjectService().update(
      input.workspaceId,
      input.objectId,
      input.changes as UpdateSpatialObjectInput,
    );
  },
);

ipcMain.handle(
  "aeraos:spatial-objects:trash",
  async (_event, input: unknown) => {
    if (!isRecord(input)) {
      throw new Error("Invalid spatial object trash input.");
    }

    if (
      Object.keys(input).some(
        (key) => !["workspaceId", "objectId"].includes(key),
      )
    ) {
      throw new Error("Unexpected field in spatial object trash input.");
    }

    if (
      typeof input.workspaceId !== "string" ||
      typeof input.objectId !== "string"
    ) {
      throw new Error("Workspace ID and object ID are required.");
    }

    return getSpatialObjectService().moveToTrash(
      input.workspaceId,
      input.objectId,
    );
  },
);

ipcMain.handle(
  "aeraos:spatial-objects:restore",
  async (_event, input: unknown) => {
    if (!isRecord(input)) {
      throw new Error("Invalid spatial object restore input.");
    }

    if (
      Object.keys(input).some(
        (key) => !["workspaceId", "objectId"].includes(key),
      )
    ) {
      throw new Error("Unexpected field in spatial object restore input.");
    }

    if (
      typeof input.workspaceId !== "string" ||
      typeof input.objectId !== "string"
    ) {
      throw new Error("Workspace ID and object ID are required.");
    }

    return getSpatialObjectService().restore(
      input.workspaceId,
      input.objectId,
    );
  },
);

ipcMain.handle(
  "aeraos:spatial-objects:list-active",
  async (_event, workspaceId: unknown) => {
    if (typeof workspaceId !== "string") {
      throw new Error("Workspace ID must be a string.");
    }

    return getSpatialObjectService().listActiveByWorkspace(workspaceId);
  },
);

ipcMain.handle(
  "aeraos:spatial-objects:list-trash",
  async (_event, workspaceId: unknown) => {
    if (typeof workspaceId !== "string") {
      throw new Error("Workspace ID must be a string.");
    }

    return getSpatialObjectService().listTrashByWorkspace(workspaceId);
  },
);
ipcMain.handle("aeraos:spatial-objects:clear-test-workspace", async () => {
  const workspaceId = "workspace-test";
  const service = getSpatialObjectService();

  const objects = await service.listByWorkspace(workspaceId);

  for (const object of objects) {
    await spatialObjectRepository!.delete(workspaceId, object.id);
  }

  return {
    deletedCount: objects.length,
    remainingCount: (await service.listByWorkspace(workspaceId)).length,
  };
});


function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(currentDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev()) {
    void mainWindow.loadURL("http://localhost:5123/");
  } else {
    void mainWindow.loadFile(
      path.join(app.getAppPath(), "dist-react", "index.html"),
    );
  }
}

app.whenReady().then(() => {
  const databasePath = path.join(app.getPath("userData"), "aeraos.db");

  spatialObjectRepository = new SqliteSpatialObjectRepository(databasePath);
  spatialObjectService = new SpatialObjectService(spatialObjectRepository);

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  spatialObjectRepository?.close();
  spatialObjectRepository = null;
  spatialObjectService = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
