import type { ResourceReference } from "./spatial-object.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAbsoluteLocalPath(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  // Accept POSIX paths, Windows drive paths, and UNC paths.
  return (
    value.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    /^\\\\[^\\]+\\[^\\]+/.test(value)
  );
}

export function assertValidResourceReference(
  value: unknown,
): asserts value is ResourceReference {
  if (!isRecord(value)) {
    throw new Error("Resource reference must be an object.");
  }

  switch (value.type) {
    case "file":
      if (!isAbsoluteLocalPath(value.path)) {
        throw new Error("File resources require an absolute local path.");
      }

      if (
        value.format !== undefined &&
        typeof value.format !== "string"
      ) {
        throw new Error("File format must be a string.");
      }
      return;

    case "folder":
      if (!isAbsoluteLocalPath(value.path)) {
        throw new Error("Folder resources require an absolute local path.");
      }
      return;

    case "url": {
      if (typeof value.url !== "string") {
        throw new Error("URL resources require a valid URL.");
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(value.url);
      } catch {
        throw new Error("URL resources require a valid URL.");
      }

      if (
        parsedUrl.protocol !== "https:" &&
        parsedUrl.protocol !== "http:"
      ) {
        throw new Error("Only HTTP and HTTPS URLs are allowed.");
      }
      return;
    }

    case "application":
      if (!isNonEmptyString(value.applicationId)) {
        throw new Error("Application ID is required.");
      }

      if (!isNonEmptyString(value.applicationName)) {
        throw new Error("Application name is required.");
      }

      if (
        value.executablePath !== undefined &&
        !isAbsoluteLocalPath(value.executablePath)
      ) {
        throw new Error("Executable path must be absolute.");
      }

      if (
        value.launchArguments !== undefined &&
        (
          !Array.isArray(value.launchArguments) ||
          !value.launchArguments.every(
            (argument) => typeof argument === "string",
          )
        )
      ) {
        throw new Error("Launch arguments must be an array of strings.");
      }
      return;

    case "native":
      if (!isNonEmptyString(value.resourceId)) {
        throw new Error("Native resource ID is required.");
      }

      if (!isNonEmptyString(value.resourceKind)) {
        throw new Error("Native resource kind is required.");
      }
      return;

    default:
      throw new Error("Unsupported resource type.");
  }
}

export function validateSpatialObjectChanges(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error("Object changes must be an object.");
  }

  const allowedKeys = new Set([
    "title",
    "importance",
    "status",
    "tags",
    "groupIds",
    "spatial",
    "settings",
  ]);

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Field "${key}" cannot be updated.`);
    }
  }

  if (
    "title" in value &&
    (typeof value.title !== "string" || !value.title.trim())
  ) {
    throw new Error("Object title cannot be empty.");
  }

  if (
    "importance" in value &&
    ![1, 2, 3, 4, 5].includes(value.importance as number)
  ) {
    throw new Error("Importance must be between 1 and 5.");
  }

  if (
    "status" in value &&
    ![
      "inbox",
      "active",
      "in-review",
      "waiting",
      "paused",
      "completed",
    ].includes(value.status as string)
  ) {
    throw new Error("Invalid object workflow status.");
  }

  for (const key of ["tags", "groupIds"] as const) {
    if (
      key in value &&
      (
        !Array.isArray(value[key]) ||
        !value[key].every(
          (item: unknown) => typeof item === "string",
        )
      )
    ) {
      throw new Error(`${key} must be an array of strings.`);
    }
  }

  
  
  if ("spatial" in value) {
    const spatial = value.spatial;

    if (!isRecord(spatial)) {
      throw new Error("Invalid spatial properties.");
    }

    const position = spatial.position;

    if (
      !isRecord(position) ||
      !["x", "y", "z"].every(
        (axis) =>
          typeof position[axis] === "number" &&
          Number.isFinite(position[axis]),
      ) ||
      typeof spatial.scale !== "number" ||
      !Number.isFinite(spatial.scale) ||
      spatial.scale <= 0 ||
      !["visible", "hidden"].includes(spatial.visibility as string)
    ) {
      throw new Error("Invalid spatial properties.");
    }
  }

}
