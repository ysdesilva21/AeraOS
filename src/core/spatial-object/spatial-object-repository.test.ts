
import { describe, expect, it } from "vitest";
import { createSpatialObject } from "./spatial-object";
import { InMemorySpatialObjectRepository } from "./spatial-object-repository";

function makeObject(
  id: string,
  workspaceId = "workspace-1",
) {
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

describe("InMemorySpatialObjectRepository", () => {
  it("creates and retrieves an object", async () => {
    const repository = new InMemorySpatialObjectRepository();
    const object = makeObject("object-1");

    await repository.create(object);

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toEqual(object);
  });

  it("returns null for a missing object", async () => {
    const repository = new InMemorySpatialObjectRepository();

    await expect(
      repository.getById("workspace-1", "missing"),
    ).resolves.toBeNull();
  });

  it("rejects duplicate IDs within the same workspace", async () => {
    const repository = new InMemorySpatialObjectRepository();

    await repository.create(makeObject("object-1"));

    await expect(
      repository.create(makeObject("object-1")),
    ).rejects.toThrow(/already exists/);
  });

  it("isolates objects by workspace", async () => {
    const repository = new InMemorySpatialObjectRepository();

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
    const repository = new InMemorySpatialObjectRepository();

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
    const repository = new InMemorySpatialObjectRepository();
    const object = makeObject("object-1");

    await repository.create(object);

    const updated = { ...object, title: "Updated title" };
    await repository.update(updated);

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toMatchObject({ title: "Updated title" });
  });

  it("deletes an object", async () => {
    const repository = new InMemorySpatialObjectRepository();

    await repository.create(makeObject("object-1"));
    await repository.delete("workspace-1", "object-1");

    await expect(
      repository.getById("workspace-1", "object-1"),
    ).resolves.toBeNull();
  });

  it("lists only objects from the requested workspace", async () => {
    const repository = new InMemorySpatialObjectRepository();

    await repository.create(makeObject("object-1", "workspace-1"));
    await repository.create(makeObject("object-2", "workspace-1"));
    await repository.create(makeObject("object-3", "workspace-2"));

    const objects = await repository.listByWorkspace("workspace-1");

    expect(objects).toHaveLength(2);
    expect(objects.map((object) => object.id)).toEqual([
      "object-1",
      "object-2",
    ]);
  });

  it("rejects updating an object that does not exist", async () => {
    const repository = new InMemorySpatialObjectRepository();

    await expect(
      repository.update(makeObject("missing")),
    ).rejects.toThrow(/does not exist/);
  });
});
