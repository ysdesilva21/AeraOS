
import Database from "better-sqlite3";
import type {
  SpatialObject,
  SpatialObjectId,
  WorkspaceId,
} from "./spatial-object.js";
import type { SpatialObjectRepository } from "./spatial-object-repository.js";

export class SqliteSpatialObjectRepository
  implements SpatialObjectRepository
{
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    this.db = new Database(databasePath);

    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS spatial_objects (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_spatial_objects_workspace
      ON spatial_objects (workspace_id);
    `);
  }

  async create(object: SpatialObject): Promise<void> {
    const existing = this.db
      .prepare(
        `SELECT 1 FROM spatial_objects
         WHERE workspace_id = ? AND id = ?`,
      )
      .get(object.workspaceId, object.id);

    if (existing) {
      throw new Error(
        `Spatial object "${object.id}" already exists in this workspace.`,
      );
    }

    this.db
      .prepare(
        `INSERT INTO spatial_objects
          (id, workspace_id, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        object.id,
        object.workspaceId,
        JSON.stringify(object),
        object.createdAt,
        object.updatedAt,
      );
  }

  async getById(
    workspaceId: WorkspaceId,
    objectId: SpatialObjectId,
  ): Promise<SpatialObject | null> {
    const row = this.db
      .prepare(
        `SELECT data FROM spatial_objects
         WHERE workspace_id = ? AND id = ?`,
      )
      .get(workspaceId, objectId) as { data: string } | undefined;

    return row ? (JSON.parse(row.data) as SpatialObject) : null;
  }

  async listByWorkspace(
    workspaceId: WorkspaceId,
  ): Promise<SpatialObject[]> {
    const rows = this.db
      .prepare(
        `SELECT data FROM spatial_objects
         WHERE workspace_id = ?
         ORDER BY created_at ASC`,
      )
      .all(workspaceId) as Array<{ data: string }>;

    return rows.map((row) => JSON.parse(row.data) as SpatialObject);
  }

  async update(object: SpatialObject): Promise<void> {
    const result = this.db
      .prepare(
        `UPDATE spatial_objects
         SET data = ?, updated_at = ?
         WHERE workspace_id = ? AND id = ?`,
      )
      .run(
        JSON.stringify(object),
        object.updatedAt,
        object.workspaceId,
        object.id,
      );

    if (result.changes === 0) {
      throw new Error(
        `Spatial object "${object.id}" does not exist in this workspace.`,
      );
    }
  }

  async delete(
    workspaceId: WorkspaceId,
    objectId: SpatialObjectId,
  ): Promise<void> {
    this.db
      .prepare(
        `DELETE FROM spatial_objects
         WHERE workspace_id = ? AND id = ?`,
      )
      .run(workspaceId, objectId);
  }

  close(): void {
    this.db.close();
  }
}
