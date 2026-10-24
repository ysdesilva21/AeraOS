/*Spatial Object Data Model*/

export type SpatialObjectId = string;
export type WorkspaceId = string;
export type GroupId = string;
export type RelationshipId = string; 

/*Resources - resource when open user activates an object*/
export type ResourceType = "file" | "folder" | "url" | "application" | "native";

export type ResourceReference = 
| {
    type: "file"; /*Absolute local path; validate and access through electron*/
    path: string; /* Detected extension or MIME type */
    format? : string;
}
| {
    type: "folder"; /*Absolute local path; validate and access through electron*/
    path: string;
}
| {
    type: "url";   /** Validate the URL and allowed scheme before opening it. */
    url: string;
}
| {
    type: "application";
    applicationId: string; /** Stable ID assigned by AeraOS to this application entry. */
    applicationName: string; /** Display name, e.g. "Visual Studio Code". */
    executablePath?: string;/** Optional path to the installed application's executable. */
    launchArguments?: string[];/** Optional launch arguments, if supported and validated. */
    
}
| {
    type: "native"; /** Stable identifier for an AeraOS-owned resource. */
    resourceId: string;
    resourceKind: string;  /** Kind of native resource, e.g. "note". */
};

/*Workflow - describes progress only. It does not represent visibility, trash,
 selection, focus, or any other UI/lifecycle condition.
 */
export type ObjectWorkflowStatus = "inbox" | "active" | "in-review" | "waiting" | "paused" | "completed" ;

/*Spatial persistation*/
export type ObjectVisibility = "visible" | "hidden" ;

export interface SpatialPosition {
    x: number;
    y:number;
    z:number;
}

export interface SpatialProperties {
    position: SpatialPosition;
    scale:number;   /** Positive visual scale multiplier; 1 is the default scale. */
    visibility: ObjectVisibility;
}

/*Object settings*/
/**
 * Per-object configuration only. Global preferences such as app theme,
 * reduced motion, and high contrast belong in a separate application settings
 * model.
 */

export interface SpatialObjectSettings {
    iconOverride?: string;
    openWith? : "system-default" | "browser" | "aeraos";
}

/*Lifecycle /trash - null means the object is in trash*/
export interface SpatialObjectLifecycle {
    deletedAt: number | null;
}

/*Persisten Spatial Object */
export type ObjectImportance = 1 | 2 | 3 | 4 | 5 ;

export interface SpatialObject {
    id:SpatialObjectId;   /** Stable unique ID, normally generated as a UUID. */
    workspaceId: WorkspaceId; /** Workspace this object belongs to. */
    title: string; /** User-editable display title; independent from the underlying filename. */
    resource: ResourceReference; /** Typed reference to the resource that opens on activation. */
    importance: ObjectImportance;  /** Optional semantic importance; presentation may map this to visual scale. */
    status: ObjectWorkflowStatus; /** Workflow progress only. */
    tags: string[]; /** User-defined labels used for search and filtering. */
    groupIds: GroupId[];  /** Group IDs only; Group records are owned by the Group model. */
    relationshipIds: RelationshipId[]; /* Direct realtion IDs only */
    spatial: SpatialProperties; /** Persisted position, scale, and visibility in the spatial workspace. */
    settings: SpatialObjectSettings; /** Per-object configuration, independent of workflow and lifecycle. */
    lifecycle: SpatialObjectLifecycle; /** Trash metadata, independent of workflow status. */
    createdAt: number; /** When this AeraOS object was created, not when its external resource was created. */
    updatedAt: number; /** When this object's persistent metadata last changed. */
    lastAccessedAt: number | null; /** Last successful resource open; null if never opened. */
    totalFocusTimeMs: number; /** Accumulated active Focus Mode time in milliseconds. */
}

/*Transient niteraction state*/
export interface SpatialObjectInteractionState {
  selected: boolean;
  hovered: boolean;
  focused: boolean; /** Start time of the current focus session; null when not timing. */
  focusStartedAt: number | null;
  interaction: "idle" | "dragging" | "resizing" | "opening";
}

/*Helpers*/
export function getResourceType(resource: ResourceReference): ResourceType {
  return resource.type;
}
export function isInTrash(object: SpatialObject): boolean {
  return object.lifecycle.deletedAt !== null;
}

/** Create a new object with defaults; ID generation and persistence are external. */
export function createSpatialObject(input: {
  id: SpatialObjectId;
  workspaceId: WorkspaceId;
  title: string;
  resource: ResourceReference;
  now?: number;
}): SpatialObject {
  const now = input.now ?? Date.now();

  return {
    id: input.id,
    workspaceId: input.workspaceId,
    title: input.title,
    resource: input.resource,
    importance: 3,
    status: "inbox",
    tags: [],
    groupIds: [],
    relationshipIds: [],
    spatial: {
      position: { x: 0, y: 0, z: 0 },
      scale: 1,
      visibility: "visible",
    },
    settings: {},
    lifecycle: {
      deletedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: null,
    totalFocusTimeMs: 0,
  };
}
