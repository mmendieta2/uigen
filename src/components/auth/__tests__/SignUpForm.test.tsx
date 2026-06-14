import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";
import { SignUpForm } from "../SignUpForm";

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function setupAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  const defaults = {
    signIn: vi.fn().mockResolvedValue({ success: true }),
    signUp: vi.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  };
  mockUseAuth.mockReturnValue({ ...defaults, ...overrides });
  return defaults;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders email, password, and confirm password fields with sign-up button", () => {
  setupAuth();
  render(<SignUpForm />);

  expect(screen.getByLabelText(/^email$/i)).toBeDefined();
  expect(screen.getByLabelText(/^password$/i)).toBeDefined();
  expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  expect(screen.getByRole("button", { name: /sign up/i })).toBeDefined();
});

test("shows password mismatch error without calling signUp", async () => {
  const { signUp } = setupAuth();
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "different456");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() =>
    expect(screen.getByText("Passwords do not match")).toBeDefined()
  );
  expect(signUp).not.toHaveBeenCalled();
});

test("calls signUp with email and password when passwords match", async () => {
  const { signUp } = setupAuth();
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText(/^email$/i), "new@example.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "securepass");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "securepass");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() =>
    expect(signUp).toHaveBeenCalledWith("new@example.com", "securepass")
  );
});

test("calls onSuccess after successful sign-up", async () => {
  setupAuth({ signUp: vi.fn().mockResolvedValue({ success: true }) });
  const onSuccess = vi.fn();
  render(<SignUpForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText(/^email$/i), "new@example.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "pass12345");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "pass12345");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
});

test("does not call onSuccess after failed sign-up", async () => {
  setupAuth({
    signUp: vi.fn().mockResolvedValue({ success: false, error: "Email taken" }),
  });
  const onSuccess = vi.fn();
  render(<SignUpForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText(/^email$/i), "taken@example.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "pass12345");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "pass12345");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(screen.getByText("Email taken")).toBeDefined());
  expect(onSuccess).not.toHaveBeenCalled();
});

test("shows server error message on failed sign-up", async () => {
  setupAuth({
    signUp: vi.fn().mockResolvedValue({ success: false, error: "Email already exists" }),
  });
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText(/^email$/i), "dup@example.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "pass12345");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "pass12345");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() =>
    expect(screen.getByText("Email already exists")).toBeDefined()
  );
});

test("shows fallback error message when result has no error string", async () => {
  setupAuth({
    signUp: vi.fn().mockResolvedValue({ success: false }),
  });
  render(<SignUpForm />);

  await userEvent.type(screen.getByLabelText(/^email$/i), "a@b.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "pass12345");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "pass12345");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(screen.getByText("Failed to sign up")).toBeDefined());
});

test("disables all fields and button while loading", () => {
  setupAuth({ isLoading: true });
  render(<SignUpForm />);

  expect(screen.getByLabelText(/^email$/i)).toHaveProperty("disabled", true);
  expect(screen.getByLabelText(/^password$/i)).toHaveProperty("disabled", true);
  expect(screen.getByLabelText(/confirm password/i)).toHaveProperty("disabled", true);
  expect(screen.getByRole("button")).toHaveProperty("disabled", true);
});

test("button label changes to 'Creating account...' while loading", () => {
  setupAuth({ isLoading: true });
  render(<SignUpForm />);

  expect(screen.getByRole("button", { name: /creating account/i })).toBeDefined();
});

test("shows minimum length hint for password field", () => {
  setupAuth();
  render(<SignUpForm />);

  expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
});
