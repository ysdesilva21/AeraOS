
import { describe, expect, it } from "vitest";
import { assertValidResourceReference } from "./spatial-object-validation";

describe("assertValidResourceReference", () => {
  it("accepts an absolute file resource", () => {
    expect(() =>
      assertValidResourceReference({
        type: "file",
        path: "C:\\Projects\\notes.pdf",
        format: "pdf",
      }),
    ).not.toThrow();
  });

  it("rejects relative file paths", () => {
    expect(() =>
      assertValidResourceReference({
        type: "file",
        path: "notes.pdf",
      }),
    ).toThrow(/absolute local path/);
  });

  it("accepts HTTP and HTTPS URLs", () => {
    expect(() =>
      assertValidResourceReference({
        type: "url",
        url: "https://example.com",
      }),
    ).not.toThrow();

    expect(() =>
      assertValidResourceReference({
        type: "url",
        url: "http://example.com",
      }),
    ).not.toThrow();
  });

  it("rejects unsafe URL schemes", () => {
    expect(() =>
      assertValidResourceReference({
        type: "url",
        url: "javascript:alert(1)",
      }),
    ).toThrow(/Only HTTP and HTTPS/);

    expect(() =>
      assertValidResourceReference({
        type: "url",
        url: "file:///C:/Windows/win.ini",
      }),
    ).toThrow(/Only HTTP and HTTPS/);
  });

  it("rejects malformed resource values", () => {
    expect(() => assertValidResourceReference(null))
      .toThrow(/must be an object/);

    expect(() =>
      assertValidResourceReference({ type: "unknown" }),
    ).toThrow(/Unsupported resource type/);
  });

  it("validates application resources", () => {
    expect(() =>
      assertValidResourceReference({
        type: "application",
        applicationId: "app-vscode",
        applicationName: "Visual Studio Code",
        launchArguments: ["--new-window"],
      }),
    ).not.toThrow();

    expect(() =>
      assertValidResourceReference({
        type: "application",
        applicationId: "",
        applicationName: "Visual Studio Code",
      }),
    ).toThrow(/Application ID is required/);
  });

  it("validates native resources", () => {
    expect(() =>
      assertValidResourceReference({
        type: "native",
        resourceId: "note-1",
        resourceKind: "note",
      }),
    ).not.toThrow();

    expect(() =>
      assertValidResourceReference({
        type: "native",
        resourceId: "note-1",
        resourceKind: "",
      }),
    ).toThrow(/Native resource kind is required/);
  });
});
