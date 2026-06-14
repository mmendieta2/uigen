import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";
import { SignInForm } from "../SignInForm";

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

test("renders email and password fields with sign-in button", () => {
  setupAuth();
  render(<SignInForm />);

  expect(screen.getByLabelText(/email/i)).toBeDefined();
  expect(screen.getByLabelText(/password/i)).toBeDefined();
  expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
});

test("calls signIn with the entered email and password", async () => {
  const { signIn } = setupAuth();
  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "secret123");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => {
    expect(signIn).toHaveBeenCalledWith("user@example.com", "secret123");
  });
});

test("calls onSuccess callback after a successful sign-in", async () => {
  setupAuth({ signIn: vi.fn().mockResolvedValue({ success: true }) });
  const onSuccess = vi.fn();
  render(<SignInForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "pass");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
});

test("does not call onSuccess after a failed sign-in", async () => {
  setupAuth({
    signIn: vi.fn().mockResolvedValue({ success: false, error: "Invalid credentials" }),
  });
  const onSuccess = vi.fn();
  render(<SignInForm onSuccess={onSuccess} />);

  await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() =>
    expect(screen.getByText("Invalid credentials")).toBeDefined()
  );
  expect(onSuccess).not.toHaveBeenCalled();
});

test("shows server error message when sign-in fails", async () => {
  setupAuth({
    signIn: vi.fn().mockResolvedValue({ success: false, error: "Wrong password" }),
  });
  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "bad");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(screen.getByText("Wrong password")).toBeDefined());
});

test("shows a fallback error message when sign-in result has no error string", async () => {
  setupAuth({
    signIn: vi.fn().mockResolvedValue({ success: false }),
  });
  render(<SignInForm />);

  await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
  await userEvent.type(screen.getByLabelText(/password/i), "x");
  fireEvent.submit(screen.getByRole("button").closest("form")!);

  await waitFor(() => expect(screen.getByText("Failed to sign in")).toBeDefined());
});

test("disables fields and button while loading", () => {
  setupAuth({ isLoading: true });
  render(<SignInForm />);

  expect(screen.getByLabelText(/email/i)).toHaveProperty("disabled", true);
  expect(screen.getByLabelText(/password/i)).toHaveProperty("disabled", true);
  expect(screen.getByRole("button")).toHaveProperty("disabled", true);
});

test("button label changes to 'Signing in...' while loading", () => {
  setupAuth({ isLoading: true });
  render(<SignInForm />);

  expect(screen.getByRole("button", { name: /signing in/i })).toBeDefined();
});

test("clears error message between submissions", async () => {
  const signIn = vi.fn()
    .mockResolvedValueOnce({ success: false, error: "Bad creds" })
    .mockResolvedValueOnce({ success: true });
  setupAuth({ signIn });
  render(<SignInForm />);

  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const form = screen.getByRole("button").closest("form")!;

  await userEvent.type(emailInput, "a@b.com");
  await userEvent.type(passwordInput, "wrong");
  fireEvent.submit(form);

  await waitFor(() => expect(screen.getByText("Bad creds")).toBeDefined());

  fireEvent.submit(form);

  await waitFor(() => {
    expect(screen.queryByText("Bad creds")).toBeNull();
  });
});
