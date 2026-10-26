
import { useState } from "react";
import type { SpatialObject } from "../core/spatial-object/spatial-object";
import "./App.css";

const TEST_WORKSPACE_ID = "workspace-test";

function App() {
  const [status, setStatus] = useState("Ready to test AeraOS storage.");
  const [objects, setObjects] = useState<SpatialObject[]>([]);
  const [busy, setBusy] = useState(false);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshObjects() {
    const result = await window.aeraos.listSpatialObjects(
      TEST_WORKSPACE_ID,
    );
    setObjects(result);
  }

  async function createObject() {
    const created = await window.aeraos.createSpatialObject({
      workspaceId: TEST_WORKSPACE_ID,
      title: `Runtime Test ${new Date().toLocaleTimeString()}`,
      resource: {
        type: "url",
        url: "https://example.com",
      },
    });

    await refreshObjects();
    setStatus(`Created object: ${created.title}`);
  }

  async function updateObject(object: SpatialObject) {
    const updated = await window.aeraos.updateSpatialObject(
      TEST_WORKSPACE_ID,
      object.id,
      { title: `${object.title} (updated)` },
    );

    await refreshObjects();
    setStatus(`Updated object: ${updated.title}`);
  }

  async function trashObject(object: SpatialObject) {
    await window.aeraos.trashSpatialObject(
      TEST_WORKSPACE_ID,
      object.id,
    );

    await refreshObjects();
    setStatus(`Moved "${object.title}" to trash.`);
  }

  async function restoreObject(object: SpatialObject) {
    await window.aeraos.restoreSpatialObject(
      TEST_WORKSPACE_ID,
      object.id,
    );

    await refreshObjects();
    setStatus(`Restored "${object.title}".`);
  }

  async function loadActive() {
    const result = await window.aeraos.listActiveSpatialObjects(
      TEST_WORKSPACE_ID,
    );
    setObjects(result);
    setStatus(`Loaded ${result.length} active object(s).`);
  }

  async function loadTrash() {
    const result = await window.aeraos.listTrashSpatialObjects(
      TEST_WORKSPACE_ID,
    );
    setObjects(result);
    setStatus(`Loaded ${result.length} trashed object(s).`);
  }

  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>AeraOS — Storage Runtime Test</h1>
      <p>{status}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button disabled={busy} onClick={() => void runAction(createObject)}>
          Create object
        </button>
        <button disabled={busy} onClick={() => void runAction(refreshObjects)}>
          List all
        </button>
        <button disabled={busy} onClick={() => void runAction(loadActive)}>
          List active
        </button>
        <button disabled={busy} onClick={() => void runAction(loadTrash)}>
          List trash
        </button>
      </div>

      <hr />

      {objects.length === 0 ? (
        <p>No objects in this list.</p>
      ) : (
        <ul>
          {objects.map((object) => (
            <li key={object.id} style={{ marginBottom: 16 }}>
              <strong>{object.title}</strong>
              <div>
                <small>ID: {object.id}</small>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  disabled={busy}
                  onClick={() => void runAction(() => updateObject(object))}
                >
                  Update title
                </button>
                <button
                  disabled={busy}
                  onClick={() => void runAction(() => trashObject(object))}
                >
                  Trash
                </button>
                <button
                  disabled={busy}
                  onClick={() => void runAction(() => restoreObject(object))}
                >
                  Restore
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;
