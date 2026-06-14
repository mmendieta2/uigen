// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT } from "jose";
import type { NextRequest } from "next/server";

// Stateful in-memory cookie store shared by the next/headers mock.
const { store, cookieStore } = vi.hoisted(() => {
  const store = new Map<string, { value: string; [key: string]: any }>();
  const cookieStore = {
    set: vi.fn((name: string, value: string, opts: Record<string, any> = {}) => {
      store.set(name, { value, ...opts });
    }),
    get: vi.fn((name: string) => {
      const entry = store.get(name);
      return entry ? { value: entry.value } : undefined;
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
  };
  return { store, cookieStore };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

// Imported after the mocks are registered.
import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";

const COOKIE_NAME = "auth-token";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

beforeEach(() => {
  store.clear();
  cookieStore.set.mockClear();
  cookieStore.get.mockClear();
  cookieStore.delete.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === COOKIE_NAME && token ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

test("createSession stores a token under the auth cookie", async () => {
  await createSession("user-1", "user@example.com");

  expect(cookieStore.set).toHaveBeenCalledTimes(1);
  const entry = store.get(COOKIE_NAME);
  expect(entry).toBeDefined();
  expect(typeof entry!.value).toBe("string");
  expect(entry!.value.length).toBeGreaterThan(0);
});

test("createSession sets secure cookie options", async () => {
  await createSession("user-1", "user@example.com");

  const [, , opts] = cookieStore.set.mock.calls[0];
  expect(opts.httpOnly).toBe(true);
  expect(opts.sameSite).toBe("lax");
  expect(opts.path).toBe("/");
  expect(opts.expires).toBeInstanceOf(Date);
  // Expiry is roughly 7 days out.
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const delta = (opts.expires as Date).getTime() - Date.now();
  expect(delta).toBeGreaterThan(sevenDays - 60_000);
  expect(delta).toBeLessThanOrEqual(sevenDays);
});

test("createSession marks the cookie secure only in production", async () => {
  vi.stubEnv("NODE_ENV", "development");
  await createSession("user-1", "user@example.com");
  expect(cookieStore.set.mock.calls[0][2].secure).toBe(false);

  cookieStore.set.mockClear();

  vi.stubEnv("NODE_ENV", "production");
  await createSession("user-1", "user@example.com");
  expect(cookieStore.set.mock.calls[0][2].secure).toBe(true);
});

test("createSession encodes userId and email into the token", async () => {
  await createSession("user-42", "alice@example.com");

  const session = await getSession();
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-42");
  expect(session!.email).toBe("alice@example.com");
});

test("getSession returns null when no cookie is present", async () => {
  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession round-trips a session created by createSession", async () => {
  await createSession("user-7", "bob@example.com");

  const session = await getSession();
  expect(session).toMatchObject({
    userId: "user-7",
    email: "bob@example.com",
  });
});

test("getSession returns null for a malformed token", async () => {
  store.set(COOKIE_NAME, { value: "not-a-valid-jwt" });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for a token signed with a different secret", async () => {
  const token = await new SignJWT({ userId: "x", email: "x@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode("a-totally-different-secret"));
  store.set(COOKIE_NAME, { value: token });

  const session = await getSession();
  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await new SignJWT({ userId: "x", email: "x@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1h")
    .setIssuedAt()
    .sign(SECRET);
  store.set(COOKIE_NAME, { value: token });

  const session = await getSession();
  expect(session).toBeNull();
});

test("deleteSession removes the auth cookie", async () => {
  await createSession("user-1", "user@example.com");
  expect(store.has(COOKIE_NAME)).toBe(true);

  await deleteSession();

  expect(cookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
  expect(store.has(COOKIE_NAME)).toBe(false);
});

test("verifySession returns null when the request has no token", async () => {
  const session = await verifySession(makeRequest());
  expect(session).toBeNull();
});

test("verifySession returns the payload for a valid request token", async () => {
  const token = await new SignJWT({
    userId: "user-9",
    email: "carol@example.com",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);

  const session = await verifySession(makeRequest(token));
  expect(session).toMatchObject({
    userId: "user-9",
    email: "carol@example.com",
  });
});

test("verifySession returns null for an invalid request token", async () => {
  const session = await verifySession(makeRequest("garbage-token"));
  expect(session).toBeNull();
});
