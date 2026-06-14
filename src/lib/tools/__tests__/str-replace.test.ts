import { test, expect, beforeEach } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";

let fs: VirtualFileSystem;
let tool: ReturnType<typeof buildStrReplaceTool>;

beforeEach(() => {
  fs = new VirtualFileSystem();
  tool = buildStrReplaceTool(fs);
});

test("tool has the correct id", () => {
  expect(tool.id).toBe("str_replace_editor");
});

// view
test("view returns file content with line numbers", async () => {
  fs.createFile("/test.txt", "line1\nline2\nline3");
  const result = await tool.execute({ command: "view", path: "/test.txt" });
  expect(result).toBe("1\tline1\n2\tline2\n3\tline3");
});

test("view with view_range returns only those lines", async () => {
  fs.createFile("/test.txt", "a\nb\nc\nd\ne");
  const result = await tool.execute({
    command: "view",
    path: "/test.txt",
    view_range: [2, 4],
  });
  expect(result).toBe("2\tb\n3\tc\n4\td");
});

test("view lists directory contents", async () => {
  fs.createDirectory("/src");
  fs.createFile("/src/index.ts", "");
  const result = await tool.execute({ command: "view", path: "/src" });
  expect(result).toContain("[FILE] index.ts");
});

test("view returns error for non-existent path", async () => {
  const result = await tool.execute({ command: "view", path: "/missing.txt" });
  expect(result).toBe("File not found: /missing.txt");
});

// create
test("create makes a new file with content", async () => {
  const result = await tool.execute({
    command: "create",
    path: "/App.jsx",
    file_text: "export default function App() {}",
  });
  expect(result).toBe("File created: /App.jsx");
  expect(fs.readFile("/App.jsx")).toBe("export default function App() {}");
});

test("create uses empty string when file_text is omitted", async () => {
  await tool.execute({ command: "create", path: "/empty.txt" });
  expect(fs.readFile("/empty.txt")).toBe("");
});

test("create returns error when file already exists", async () => {
  fs.createFile("/App.jsx", "existing");
  const result = await tool.execute({
    command: "create",
    path: "/App.jsx",
    file_text: "new",
  });
  expect(result).toBe("Error: File already exists: /App.jsx");
  expect(fs.readFile("/App.jsx")).toBe("existing");
});

test("create builds parent directories automatically", async () => {
  await tool.execute({
    command: "create",
    path: "/src/components/Button.tsx",
    file_text: "export const Button = () => null;",
  });
  expect(fs.exists("/src/components")).toBe(true);
  expect(fs.readFile("/src/components/Button.tsx")).toBe(
    "export const Button = () => null;"
  );
});

// str_replace
test("str_replace replaces matching text in a file", async () => {
  fs.createFile("/test.txt", "hello world");
  const result = await tool.execute({
    command: "str_replace",
    path: "/test.txt",
    old_str: "hello",
    new_str: "goodbye",
  });
  expect(result).toContain("Replaced 1 occurrence(s)");
  expect(fs.readFile("/test.txt")).toBe("goodbye world");
});

test("str_replace replaces all occurrences", async () => {
  fs.createFile("/test.txt", "foo foo foo");
  await tool.execute({
    command: "str_replace",
    path: "/test.txt",
    old_str: "foo",
    new_str: "bar",
  });
  expect(fs.readFile("/test.txt")).toBe("bar bar bar");
});

test("str_replace returns error when old_str is absent from file", async () => {
  fs.createFile("/test.txt", "hello world");
  const result = await tool.execute({
    command: "str_replace",
    path: "/test.txt",
    old_str: "notpresent",
    new_str: "x",
  });
  expect(result).toContain("String not found in file");
});

test("str_replace with omitted old_str returns error", async () => {
  fs.createFile("/test.txt", "content");
  const result = await tool.execute({
    command: "str_replace",
    path: "/test.txt",
  });
  expect(result).toContain("Error:");
});

test("str_replace returns error for non-existent file", async () => {
  const result = await tool.execute({
    command: "str_replace",
    path: "/missing.txt",
    old_str: "x",
    new_str: "y",
  });
  expect(result).toContain("Error:");
});

// insert
test("insert adds text at the specified line", async () => {
  fs.createFile("/test.txt", "line1\nline2");
  const result = await tool.execute({
    command: "insert",
    path: "/test.txt",
    insert_line: 1,
    new_str: "inserted",
  });
  expect(result).toContain("Text inserted at line 1");
  expect(fs.readFile("/test.txt")).toBe("line1\ninserted\nline2");
});

test("insert defaults to line 0 when insert_line is omitted", async () => {
  fs.createFile("/test.txt", "line1\nline2");
  await tool.execute({ command: "insert", path: "/test.txt", new_str: "first" });
  expect(fs.readFile("/test.txt")).toBe("first\nline1\nline2");
});

test("insert returns error for out-of-range line number", async () => {
  fs.createFile("/test.txt", "one\ntwo");
  const result = await tool.execute({
    command: "insert",
    path: "/test.txt",
    insert_line: 99,
    new_str: "x",
  });
  expect(result).toContain("Invalid line number");
});

test("insert returns error for non-existent file", async () => {
  const result = await tool.execute({
    command: "insert",
    path: "/missing.txt",
    insert_line: 0,
    new_str: "x",
  });
  expect(result).toContain("Error:");
});

// undo_edit
test("undo_edit returns a not-supported message", async () => {
  const result = await tool.execute({
    command: "undo_edit",
    path: "/test.txt",
  });
  expect(result).toContain("undo_edit command is not supported");
  expect(result).toContain("str_replace");
});
