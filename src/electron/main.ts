
import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDev } from "./util.js";

import { InMemorySpatialObjectRepository } from "../core/spatial-object/spatial-object-repository.js";
import { SpatialObjectService } from "../core/spatial-object/spatial-object-service.js";
import { assertValidResourceReference } from "../core/spatial-object/spatial-object-validation.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const spatialObjectRepository = new InMemorySpatialObjectRepository();
const spatialObjectService = new SpatialObjectService(
  spatialObjectRepository,
);

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

    return spatialObjectService.listByWorkspace(workspaceId);
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

    return spatialObjectService.create({
      workspaceId: input.workspaceId,
      title: input.title,
      resource: input.resource,
    });
  },
);

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
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
