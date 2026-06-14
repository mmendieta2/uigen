// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import type { LanguageModelV1Message } from "@ai-sdk/provider";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => ({ provider: "anthropic", modelId: "claude-haiku-4-5" })),
}));

import { MockLanguageModel, getLanguageModel } from "@/lib/provider";

const makeDoGenerateOptions = (messages: LanguageModelV1Message[]) =>
  ({
    inputFormat: "messages" as const,
    mode: { type: "regular" as const },
    prompt: messages,
  }) as any;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

// --- MockLanguageModel static properties ---

test("MockLanguageModel has correct specificationVersion", () => {
  const model = new MockLanguageModel("mock-test");
  expect(model.specificationVersion).toBe("v1");
});

test("MockLanguageModel has provider 'mock'", () => {
  const model = new MockLanguageModel("mock-test");
  expect(model.provider).toBe("mock");
});

test("MockLanguageModel stores the given modelId", () => {
  const model = new MockLanguageModel("mock-claude-haiku");
  expect(model.modelId).toBe("mock-claude-haiku");
});

test("MockLanguageModel defaults to 'tool' object generation mode", () => {
  const model = new MockLanguageModel("test");
  expect(model.defaultObjectGenerationMode).toBe("tool");
});

// --- doGenerate — step routing ---

test("doGenerate with 0 tool messages creates App.jsx (step 0)", async () => {
  const model = new MockLanguageModel("test");
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a counter" }] },
  ];

  const promise = model.doGenerate(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(1);
  const call = result.toolCalls![0];
  expect(call.toolName).toBe("str_replace_editor");
  const args = JSON.parse(call.args as string);
  expect(args.command).toBe("create");
  expect(args.path).toBe("/App.jsx");
  expect(result.finishReason).toBe("tool-calls");
});

test("doGenerate with 1 tool message creates the component file (step 1)", async () => {
  const model = new MockLanguageModel("test");
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a counter" }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok" }] },
  ];

  const promise = model.doGenerate(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(1);
  const args = JSON.parse(result.toolCalls![0].args as string);
  expect(args.command).toBe("create");
  expect(args.path).toContain("Counter");
});

test("doGenerate with 2 tool messages applies str_replace (step 2)", async () => {
  const model = new MockLanguageModel("test");
  const toolMsg = (id: string): LanguageModelV1Message => ({
    role: "tool",
    content: [{ type: "tool-result", toolCallId: id, toolName: "str_replace_editor", result: "ok" }],
  });
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a counter" }] },
    toolMsg("c1"),
    toolMsg("c2"),
  ];

  const promise = model.doGenerate(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls).toHaveLength(1);
  const args = JSON.parse(result.toolCalls![0].args as string);
  expect(args.command).toBe("str_replace");
});

test("doGenerate with 3+ tool messages returns a summary with no tool calls (step 3)", async () => {
  const model = new MockLanguageModel("test");
  const toolMsg = (id: string): LanguageModelV1Message => ({
    role: "tool",
    content: [{ type: "tool-result", toolCallId: id, toolName: "str_replace_editor", result: "ok" }],
  });
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a counter" }] },
    toolMsg("c1"),
    toolMsg("c2"),
    toolMsg("c3"),
  ];

  const promise = model.doGenerate(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await promise;

  expect(result.toolCalls!).toHaveLength(0);
  expect(result.finishReason).toBe("stop");
  expect(result.text).toContain("Counter");
});

// --- doGenerate — component type detection ---

test("doGenerate detects 'form' keyword and names component ContactForm", async () => {
  const model = new MockLanguageModel("test");
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "create a contact form" }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok" }] },
  ];

  const promise = model.doGenerate(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await promise;

  const args = JSON.parse(result.toolCalls![0].args as string);
  expect(args.path).toContain("ContactForm");
});

test("doGenerate detects 'card' keyword and names component Card", async () => {
  const model = new MockLanguageModel("test");
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a card component" }] },
    { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok" }] },
  ];

  const promise = model.doGenerate(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await promise;

  const args = JSON.parse(result.toolCalls![0].args as string);
  expect(args.path).toContain("Card");
});

// --- doStream ---

test("doStream returns a ReadableStream", async () => {
  const model = new MockLanguageModel("test");
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a counter" }] },
  ];

  const resultPromise = model.doStream(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const result = await resultPromise;

  expect(result.stream).toBeInstanceOf(ReadableStream);
  expect(result.warnings).toEqual([]);
});

test("doStream produces text-delta and finish chunks", async () => {
  const model = new MockLanguageModel("test");
  const messages: LanguageModelV1Message[] = [
    { role: "user", content: [{ type: "text", text: "make a counter" }] },
  ];

  const resultPromise = model.doStream(makeDoGenerateOptions(messages));
  await vi.runAllTimersAsync();
  const { stream } = await resultPromise;

  const reader = stream.getReader();
  const chunks: any[] = [];

  while (true) {
    const readPromise = reader.read();
    await vi.runAllTimersAsync();
    const { done, value } = await readPromise;
    if (done) break;
    chunks.push(value);
  }

  const types = chunks.map((c) => c.type);
  expect(types).toContain("text-delta");
  expect(types).toContain("finish");
});

// --- getLanguageModel ---

test("getLanguageModel returns MockLanguageModel when ANTHROPIC_API_KEY is unset", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  const model = getLanguageModel();
  expect(model).toBeInstanceOf(MockLanguageModel);
});

test("getLanguageModel returns MockLanguageModel when ANTHROPIC_API_KEY is the placeholder", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "your-api-key-here");
  const model = getLanguageModel();
  expect(model).toBeInstanceOf(MockLanguageModel);
});

test("getLanguageModel returns the Anthropic model when a real key is set", () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-real-key-12345");
  const model = getLanguageModel();
  expect(model).not.toBeInstanceOf(MockLanguageModel);
});
