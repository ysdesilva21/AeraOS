import { describe, expect, it } from "vitest";
import {
  createSpatialObject,
  getResourceType,
  isInTrash,
} from "./spatial-object";
import type { ResourceReference } from "./spatial-object";

describe("createSpatialObject", () => {
  const baseInput = {
    id: "object-1",
    workspaceId: "workspace-1",
    title: "Project Notes",
    resource: {
      type: "file",
      path: "C:/Projects/notes.pdf",
      format: "pdf",
    } satisfies ResourceReference,
    now: 1000,
  };

  it("creates an object with the provided identity and resource", () => {
    const object = createSpatialObject(baseInput);

    expect(object.id).toBe("object-1");
    expect(object.workspaceId).toBe("workspace-1");
    expect(object.title).toBe("Project Notes");
    expect(object.resource).toEqual(baseInput.resource);
  });

  it("initializes the correct defaults", () => {
    const object = createSpatialObject(baseInput);

    expect(object.importance).toBe(3);
    expect(object.status).toBe("inbox");
    expect(object.tags).toEqual([]);
    expect(object.groupIds).toEqual([]);
    expect(object.relationshipIds).toEqual([]);

    expect(object.spatial).toEqual({
      position: { x: 0, y: 0, z: 0 },
      scale: 1,
      visibility: "visible",
    });

    expect(object.settings).toEqual({});
    expect(object.lifecycle.deletedAt).toBeNull();
    expect(object.lastAccessedAt).toBeNull();
    expect(object.totalFocusTimeMs).toBe(0);
  });

  it("uses the supplied timestamp consistently", () => {
    const object = createSpatialObject(baseInput);

    expect(object.createdAt).toBe(1000);
    expect(object.updatedAt).toBe(1000);
  });

  it("supports application resources", () => {
    const application: ResourceReference = {
      type: "application",
      applicationId: "app-vscode",
      applicationName: "Visual Studio Code",
    };

    const object = createSpatialObject({
      ...baseInput,
      resource: application,
    });

    expect(object.resource).toEqual(application);
    expect(getResourceType(object.resource)).toBe("application");
  });

  it("creates independent mutable defaults for each object", () => {
    const first = createSpatialObject(baseInput);
    const second = createSpatialObject({
      ...baseInput,
      id: "object-2",
    });

    first.tags.push("design");
    first.spatial.position.x = 250;

    expect(second.tags).toEqual([]);
    expect(second.spatial.position.x).toBe(0);
  });
});

describe("isInTrash", () => {
  it("returns false for a newly created object", () => {
    const object = createSpatialObject({
      id: "object-1",
      workspaceId: "workspace-1",
      title: "Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
      now: 1000,
    });

    expect(isInTrash(object)).toBe(false);
  });

  it("returns true when the object has a deletion timestamp", () => {
    const object = createSpatialObject({
      id: "object-1",
      workspaceId: "workspace-1",
      title: "Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
      now: 1000,
    });

    object.lifecycle.deletedAt = 2000;

    expect(isInTrash(object)).toBe(true);
  });
});