import { test, expect, beforeEach } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "@/lib/anon-work-tracker";

beforeEach(() => {
  sessionStorage.clear();
});

// getHasAnonWork
test("getHasAnonWork returns false when nothing is stored", () => {
  expect(getHasAnonWork()).toBe(false);
});

test("getHasAnonWork returns true after work is stored", () => {
  setHasAnonWork([{ role: "user", content: "hello" }], {});
  expect(getHasAnonWork()).toBe(true);
});

// setHasAnonWork — what triggers storage
test("setHasAnonWork stores when messages array is non-empty", () => {
  setHasAnonWork([{ role: "user", content: "hi" }], {});
  expect(getHasAnonWork()).toBe(true);
});

test("setHasAnonWork stores when fileSystemData has more than just root", () => {
  setHasAnonWork([], {
    "/": { type: "directory" },
    "/App.jsx": { type: "file", content: "" },
  });
  expect(getHasAnonWork()).toBe(true);
});

test("setHasAnonWork does NOT store when messages are empty and only root exists", () => {
  setHasAnonWork([], { "/": { type: "directory" } });
  expect(getHasAnonWork()).toBe(false);
});

test("setHasAnonWork does NOT store when both arguments are empty", () => {
  setHasAnonWork([], {});
  expect(getHasAnonWork()).toBe(false);
});

// getAnonWorkData
test("getAnonWorkData returns null when nothing is stored", () => {
  expect(getAnonWorkData()).toBeNull();
});

test("getAnonWorkData returns stored messages and file system data", () => {
  const messages = [{ role: "user", content: "build a button" }];
  const fileSystemData = { "/App.jsx": { type: "file", content: "..." } };
  setHasAnonWork(messages, fileSystemData);

  const data = getAnonWorkData();
  expect(data).not.toBeNull();
  expect(data!.messages).toEqual(messages);
  expect(data!.fileSystemData).toEqual(fileSystemData);
});

test("getAnonWorkData returns null when stored JSON is malformed", () => {
  sessionStorage.setItem("uigen_anon_data", "{not valid json{{");
  expect(getAnonWorkData()).toBeNull();
});

test("getAnonWorkData returns null when only the flag key is set (no data key)", () => {
  sessionStorage.setItem("uigen_has_anon_work", "true");
  expect(getAnonWorkData()).toBeNull();
});

// clearAnonWork
test("clearAnonWork removes the stored flag and data", () => {
  setHasAnonWork([{ role: "user", content: "x" }], {});
  clearAnonWork();
  expect(getHasAnonWork()).toBe(false);
  expect(getAnonWorkData()).toBeNull();
});

test("clearAnonWork is safe to call when nothing is stored", () => {
  expect(() => clearAnonWork()).not.toThrow();
});

test("clearAnonWork allows fresh work to be stored afterwards", () => {
  setHasAnonWork([{ role: "user", content: "first" }], {});
  clearAnonWork();
  expect(getHasAnonWork()).toBe(false);

  setHasAnonWork([{ role: "user", content: "second" }], {});
  expect(getHasAnonWork()).toBe(true);
  expect(getAnonWorkData()!.messages[0].content).toBe("second");
});
