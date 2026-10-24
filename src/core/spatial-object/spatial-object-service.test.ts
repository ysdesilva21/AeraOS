
import { beforeEach, describe, expect, it } from "vitest";
import { InMemorySpatialObjectRepository } from "./spatial-object-repository";
import { SpatialObjectService } from "./spatial-object-service";

describe("SpatialObjectService", () => {
  let repository: InMemorySpatialObjectRepository;
  let service: SpatialObjectService;

  beforeEach(() => {
    repository = new InMemorySpatialObjectRepository();
    service = new SpatialObjectService(repository);
  });

  it("creates and stores an object", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Project Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    expect(object.id).toBeTruthy();
    expect(object.title).toBe("Project Notes");
    expect(object.workspaceId).toBe("workspace-1");

    await expect(
      service.getById("workspace-1", object.id),
    ).resolves.toEqual(object);
  });

  it("trims the workspace ID and title", async () => {
    const object = await service.create({
      workspaceId: " workspace-1 ",
      title: " Project Notes ",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    expect(object.workspaceId).toBe("workspace-1");
    expect(object.title).toBe("Project Notes");
  });

  it("rejects an empty workspace ID", async () => {
    await expect(
      service.create({
        workspaceId: "   ",
        title: "Notes",
        resource: {
          type: "url",
          url: "https://example.com",
        },
      }),
    ).rejects.toThrow(/Workspace ID is required/);
  });

  it("rejects an empty title", async () => {
    await expect(
      service.create({
        workspaceId: "workspace-1",
        title: "   ",
        resource: {
          type: "url",
          url: "https://example.com",
        },
      }),
    ).rejects.toThrow(/Object title is required/);
  });

  it("returns null when an object does not exist", async () => {
    await expect(
      service.getById("workspace-1", "missing"),
    ).resolves.toBeNull();
  });

  it("rejects an empty workspace ID during retrieval", async () => {
    await expect(
      service.getById("   ", "object-1"),
    ).rejects.toThrow(/Workspace ID is required/);
  });

  it("rejects an empty object ID", async () => {
    await expect(
      service.getById("workspace-1", "   "),
    ).rejects.toThrow(/Object ID is required/);
  });

  it("lists objects only within the requested workspace", async () => {
    await service.create({
      workspaceId: "workspace-1",
      title: "Notes",
      resource: { type: "url", url: "https://example.com/notes" },
    });

    await service.create({
      workspaceId: "workspace-1",
      title: "Design",
      resource: { type: "url", url: "https://example.com/design" },
    });

    await service.create({
      workspaceId: "workspace-2",
      title: "Research",
      resource: { type: "url", url: "https://example.com/research" },
    });

    const objects = await service.listByWorkspace("workspace-1");

    expect(objects).toHaveLength(2);
    expect(objects.every((object) => object.workspaceId === "workspace-1"))
      .toBe(true);
  });

  it("rejects listing with an empty workspace ID", async () => {
    await expect(
      service.listByWorkspace("   "),
    ).rejects.toThrow(/Workspace ID is required/);
  });
  
  it("updates editable fields and persists the changes", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Project Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    const updated = await service.update(
      "workspace-1",
      object.id,
      {
        title: "Updated Notes",
        importance: 5,
        status: "active",
        tags: ["design", "research"],
      },
    );

    expect(updated.title).toBe("Updated Notes");
    expect(updated.importance).toBe(5);
    expect(updated.status).toBe("active");
    expect(updated.tags).toEqual(["design", "research"]);

    await expect(
      service.getById("workspace-1", object.id),
    ).resolves.toEqual(updated);
  });

  it("preserves object identity and creation time", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Original",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    const updated = await service.update(
      "workspace-1",
      object.id,
      { title: "Changed" },
    );

    expect(updated.id).toBe(object.id);
    expect(updated.workspaceId).toBe(object.workspaceId);
    expect(updated.resource).toEqual(object.resource);
    expect(updated.createdAt).toBe(object.createdAt);
  });

  it("rejects updating an object that does not exist", async () => {
    await expect(
      service.update("workspace-1", "missing", { title: "Changed" }),
    ).rejects.toThrow(/was not found/);
  });

  it("rejects an empty updated title", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Original",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    await expect(
      service.update("workspace-1", object.id, { title: "   " }),
    ).rejects.toThrow(/title cannot be empty/);

    await expect(
      service.getById("workspace-1", object.id),
    ).resolves.toMatchObject({ title: "Original" });
  });

  
  it("moves an object to Trash without deleting it", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Important Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    const trashed = await service.moveToTrash(
      "workspace-1",
      object.id,
    );

    expect(trashed.lifecycle.deletedAt).not.toBeNull();

    await expect(
      service.getById("workspace-1", object.id),
    ).resolves.toMatchObject({
      title: "Important Notes",
      lifecycle: { deletedAt: trashed.lifecycle.deletedAt },
    });
  });

  it("restores an object from Trash", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Recoverable Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    await service.moveToTrash("workspace-1", object.id);

    const restored = await service.restore(
      "workspace-1",
      object.id,
    );

    expect(restored.lifecycle.deletedAt).toBeNull();
    expect(restored.id).toBe(object.id);
    expect(restored.title).toBe(object.title);
  });

  it("does not change an object when it is already in Trash", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Notes",
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    const first = await service.moveToTrash(
      "workspace-1",
      object.id,
    );
    const second = await service.moveToTrash(
      "workspace-1",
      object.id,
    );

    expect(second.lifecycle.deletedAt).toBe(first.lifecycle.deletedAt);
    expect(second.updatedAt).toBe(first.updatedAt);
  });

  it("rejects trashing a missing object", async () => {
    await expect(
      service.moveToTrash("workspace-1", "missing"),
    ).rejects.toThrow(/was not found/);
  });

  it("rejects restoring a missing object", async () => {
    await expect(
      service.restore("workspace-1", "missing"),
    ).rejects.toThrow(/was not found/);
  });

  
  it("lists active objects without trashed objects", async () => {
    const active = await service.create({
      workspaceId: "workspace-1",
      title: "Active Notes",
      resource: { type: "url", url: "https://example.com/active" },
    });

    const trashed = await service.create({
      workspaceId: "workspace-1",
      title: "Trashed Notes",
      resource: { type: "url", url: "https://example.com/trashed" },
    });

    await service.moveToTrash("workspace-1", trashed.id);

    const objects = await service.listActiveByWorkspace("workspace-1");

    expect(objects.map((object) => object.id)).toEqual([active.id]);
  });

  it("lists only trashed objects in the Trash view", async () => {
    await service.create({
      workspaceId: "workspace-1",
      title: "Active Notes",
      resource: { type: "url", url: "https://example.com/active" },
    });

    const trashed = await service.create({
      workspaceId: "workspace-1",
      title: "Trashed Notes",
      resource: { type: "url", url: "https://example.com/trashed" },
    });

    await service.moveToTrash("workspace-1", trashed.id);

    const objects = await service.listTrashByWorkspace("workspace-1");

    expect(objects).toHaveLength(1);
    expect(objects[0].id).toBe(trashed.id);
    expect(objects[0].lifecycle.deletedAt).not.toBeNull();
  });

  
  it("rejects unsafe URL resources during creation", async () => {
    await expect(
      service.create({
        workspaceId: "workspace-1",
        title: "Unsafe Link",
        resource: {
          type: "url",
          url: "javascript:alert(1)",
        },
      }),
    ).rejects.toThrow(/Only HTTP and HTTPS/);

    await expect(
      service.listByWorkspace("workspace-1"),
    ).resolves.toHaveLength(0);
  });

  it("rejects relative paths for file resources", async () => {
    await expect(
      service.create({
        workspaceId: "workspace-1",
        title: "Invalid File",
        resource: {
          type: "file",
          path: "notes.pdf",
        },
      }),
    ).rejects.toThrow(/absolute local path/);
  });

  
  it("rejects invalid importance values at runtime", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Notes",
      resource: { type: "url", url: "https://example.com" },
    });

    await expect(
      service.update("workspace-1", object.id, {
        importance: 9 as 5,
      }),
    ).rejects.toThrow(/Importance must be between 1 and 5/);
  });

  it("rejects attempts to update protected fields", async () => {
    const object = await service.create({
      workspaceId: "workspace-1",
      title: "Notes",
      resource: { type: "url", url: "https://example.com" },
    });

    await expect(
      service.update("workspace-1", object.id, {
        id: "different-id",
      } as { title?: string }),
    ).rejects.toThrow(/cannot be updated/);

    await expect(
      service.getById("workspace-1", object.id),
    ).resolves.toMatchObject({ id: object.id, title: "Notes" });
  });


});
