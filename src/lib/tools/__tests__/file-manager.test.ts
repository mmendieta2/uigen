import { test, expect, beforeEach } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildFileManagerTool } from "@/lib/tools/file-manager";

let fs: VirtualFileSystem;
let tool: ReturnType<typeof buildFileManagerTool>;

const execOpts = { toolCallId: "test", messages: [] as any[] };

beforeEach(() => {
  fs = new VirtualFileSystem();
  tool = buildFileManagerTool(fs);
});

// rename — success paths
test("rename moves a file to a new path", async () => {
  fs.createFile("/old.txt", "content");
  const result = await tool.execute(
    { command: "rename", path: "/old.txt", new_path: "/new.txt" },
    execOpts
  );
  expect(result.success).toBe(true);
  expect((result as any).message).toContain("Successfully renamed");
  expect(fs.exists("/new.txt")).toBe(true);
  expect(fs.exists("/old.txt")).toBe(false);
  expect(fs.readFile("/new.txt")).toBe("content");
});

test("rename creates parent directories for the destination", async () => {
  fs.createFile("/file.txt", "data");
  const result = await tool.execute(
    { command: "rename", path: "/file.txt", new_path: "/subdir/nested/file.txt" },
    execOpts
  );
  expect(result.success).toBe(true);
  expect(fs.readFile("/subdir/nested/file.txt")).toBe("data");
});

test("rename moves a directory with all its children", async () => {
  fs.createFile("/src/index.ts", "index");
  fs.createFile("/src/utils.ts", "utils");
  const result = await tool.execute(
    { command: "rename", path: "/src", new_path: "/app" },
    execOpts
  );
  expect(result.success).toBe(true);
  expect(fs.exists("/src")).toBe(false);
  expect(fs.readFile("/app/index.ts")).toBe("index");
  expect(fs.readFile("/app/utils.ts")).toBe("utils");
});

// rename — error paths
test("rename returns error when new_path is not provided", async () => {
  fs.createFile("/old.txt", "content");
  const result = await tool.execute(
    { command: "rename", path: "/old.txt" },
    execOpts
  );
  expect(result.success).toBe(false);
  expect((result as any).error).toBe("new_path is required for rename command");
  expect(fs.exists("/old.txt")).toBe(true);
});

test("rename returns failure when source does not exist", async () => {
  const result = await tool.execute(
    { command: "rename", path: "/missing.txt", new_path: "/dest.txt" },
    execOpts
  );
  expect(result.success).toBe(false);
  expect((result as any).error).toContain("Failed to rename");
});

test("rename returns failure when destination already exists", async () => {
  fs.createFile("/source.txt", "src");
  fs.createFile("/dest.txt", "dst");
  const result = await tool.execute(
    { command: "rename", path: "/source.txt", new_path: "/dest.txt" },
    execOpts
  );
  expect(result.success).toBe(false);
  expect(fs.readFile("/source.txt")).toBe("src");
  expect(fs.readFile("/dest.txt")).toBe("dst");
});

// delete — success paths
test("delete removes an existing file", async () => {
  fs.createFile("/file.txt", "content");
  const result = await tool.execute(
    { command: "delete", path: "/file.txt" },
    execOpts
  );
  expect(result.success).toBe(true);
  expect((result as any).message).toContain("Successfully deleted");
  expect(fs.exists("/file.txt")).toBe(false);
});

test("delete recursively removes a directory and its contents", async () => {
  fs.createFile("/dir/a.ts", "a");
  fs.createFile("/dir/sub/b.ts", "b");
  const result = await tool.execute(
    { command: "delete", path: "/dir" },
    execOpts
  );
  expect(result.success).toBe(true);
  expect(fs.exists("/dir")).toBe(false);
  expect(fs.exists("/dir/sub/b.ts")).toBe(false);
});

// delete — error paths
test("delete returns failure when path does not exist", async () => {
  const result = await tool.execute(
    { command: "delete", path: "/missing.txt" },
    execOpts
  );
  expect(result.success).toBe(false);
  expect((result as any).error).toContain("Failed to delete");
});
