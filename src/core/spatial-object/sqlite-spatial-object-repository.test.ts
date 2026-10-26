
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createSpatialObject } from "./spatial-object.js";
import { SqliteSpatialObjectRepository } from "./sqlite-spatial-object-repository.js";

let directory: string;
let databasePath: string;
let repository: SqliteSpatialObjectRepository;

function makeObject(id: string, workspaceId = "workspace-1") {
  return createSpatialObject({
    id,
    workspaceId,
    title: `Object ${id}`,
    resource: {
      type: "url",
      url: "https://example.com",
    },
    now: 1000,
  });
}

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "aeraos-test-"));
  databasePath = path.join(directory, "test.db");
  repository = new SqliteSpatialObjectRepository(databasePath);
});

afterEach(() => {
  repository.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("SqliteSpatialObjectRepository", () => {
  it("creates and retrieves an object", async () => {
    const object = makeObject("object-1");

    await repository.create(object);

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toEqual(object);
  });

  it("returns null for a missing object", async () => {
    await expect(
      repository.getById("workspace-1", "missing"),
    ).resolves.toBeNull();
  });

  it("rejects duplicate IDs within the same workspace", async () => {
    await repository.create(makeObject("object-1"));

    await expect(
      repository.create(makeObject("object-1")),
    ).rejects.toThrow(/already exists/);
  });

  it("isolates objects by workspace", async () => {
    await repository.create(makeObject("object-1", "workspace-1"));
    await repository.create(makeObject("object-1", "workspace-2"));

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toMatchObject({ workspaceId: "workspace-1" });

    await expect(
      repository.getById("workspace-2", "object-1"),
    ).resolves.toMatchObject({ workspaceId: "workspace-2" });
  });

  it("returns copies so external mutations do not change stored data", async () => {
    await repository.create(makeObject("object-1"));

    const retrieved = await repository.getById(
      "workspace-1",
      "object-1",
    );

    if (!retrieved) {
      throw new Error("Expected object to exist.");
    }

    retrieved.title = "Changed outside repository";
    retrieved.tags.push("external-change");

    const stored = await repository.getById(
      "workspace-1",
      "object-1",
    );

    expect(stored?.title).toBe("Object object-1");
    expect(stored?.tags).toEqual([]);
  });

  it("updates an existing object", async () => {
    const object = makeObject("object-1");
    await repository.create(object);

    await repository.update({
      ...object,
      title: "Updated title",
    });

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toMatchObject({ title: "Updated title" });
  });

  it("deletes an object", async () => {
    await repository.create(makeObject("object-1"));
    await repository.delete("workspace-1", "object-1");

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toBeNull();
  });

  it("lists only objects from the requested workspace", async () => {
    await repository.create(makeObject("object-1", "workspace-1"));
    await repository.create(makeObject("object-2", "workspace-1"));
    await repository.create(makeObject("object-3", "workspace-2"));

    const objects = await repository.listByWorkspace("workspace-1");

    expect(objects).toHaveLength(2);
    expect(objects.map((object) => object.id).sort()).toEqual([
      "object-1",
      "object-2",
    ]);
  });

  it("rejects updating an object that does not exist", async () => {
    await expect(
      repository.update(makeObject("missing")),
    ).rejects.toThrow(/does not exist/);
  });

  it("preserves objects after the database is closed and reopened", async () => {
    const object = makeObject("persistent-object");
    await repository.create(object);

    repository.close();
    repository = new SqliteSpatialObjectRepository(databasePath);

    await expect(
      repository.getById("workspace-1", "persistent-object"),
    ).resolves.toEqual(object);
  });
});
