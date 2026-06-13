import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ToolInvocation as ToolInvocationType } from "ai";
import { ToolInvocation, getToolMessage } from "../ToolInvocation";

afterEach(() => {
  cleanup();
});

// getToolMessage — str_replace_editor
test("getToolMessage: create -> Creating <name>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "create",
      path: "/App.jsx",
    })
  ).toBe("Creating App.jsx");
});

test("getToolMessage: str_replace -> Editing <name>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "str_replace",
      path: "/src/components/Button.tsx",
    })
  ).toBe("Editing Button.tsx");
});

test("getToolMessage: insert -> Editing <name>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "insert",
      path: "/src/App.jsx",
    })
  ).toBe("Editing App.jsx");
});

test("getToolMessage: view -> Viewing <name>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "view",
      path: "/types.ts",
    })
  ).toBe("Viewing types.ts");
});

test("getToolMessage: undo_edit -> Undoing changes to <name>", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "undo_edit",
      path: "/App.jsx",
    })
  ).toBe("Undoing changes to App.jsx");
});

test("getToolMessage: extracts basename from nested path", () => {
  expect(
    getToolMessage("str_replace_editor", {
      command: "create",
      path: "/src/components/ui/Card.tsx",
    })
  ).toBe("Creating Card.tsx");
});

// getToolMessage — file_manager
test("getToolMessage: rename shows both names", () => {
  expect(
    getToolMessage("file_manager", {
      command: "rename",
      path: "/Old.tsx",
      new_path: "/components/New.tsx",
    })
  ).toBe("Renaming Old.tsx to New.tsx");
});

test("getToolMessage: rename without new_path", () => {
  expect(
    getToolMessage("file_manager", {
      command: "rename",
      path: "/Old.tsx",
    })
  ).toBe("Renaming Old.tsx");
});

test("getToolMessage: delete -> Deleting <name>", () => {
  expect(
    getToolMessage("file_manager", {
      command: "delete",
      path: "/Unused.tsx",
    })
  ).toBe("Deleting Unused.tsx");
});

// getToolMessage — fallback
test("getToolMessage: unknown tool falls back to tool name", () => {
  expect(getToolMessage("some_other_tool", { path: "/x" })).toBe(
    "some_other_tool"
  );
});

test("getToolMessage: missing args falls back to tool name", () => {
  expect(getToolMessage("str_replace_editor", {})).toBe("str_replace_editor");
  expect(getToolMessage("str_replace_editor", undefined)).toBe(
    "str_replace_editor"
  );
});

// Component rendering
test("ToolInvocation renders a friendly message instead of the raw tool name", () => {
  const toolInvocation: ToolInvocationType = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(screen.queryByText("str_replace_editor")).toBeNull();
});

test("ToolInvocation shows a spinner while in progress", () => {
  const toolInvocation: ToolInvocationType = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
    state: "call",
  };

  const { container } = render(
    <ToolInvocation toolInvocation={toolInvocation} />
  );

  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocation shows the completion dot when finished", () => {
  const toolInvocation: ToolInvocationType = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "result",
    result: "Success",
  };

  const { container } = render(
    <ToolInvocation toolInvocation={toolInvocation} />
  );

  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolInvocation falls back to raw tool name when args are empty", () => {
  const toolInvocation: ToolInvocationType = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: {},
    state: "result",
    result: "Success",
  };

  render(<ToolInvocation toolInvocation={toolInvocation} />);

  expect(screen.getByText("str_replace_editor")).toBeDefined();
});
