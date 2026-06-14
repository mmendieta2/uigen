import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, onOpenChange, children }: any) =>
    open ? <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("../SignInForm", () => ({
  SignInForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="sign-in-form">
      <button onClick={onSuccess} data-testid="sign-in-success">
        Trigger success
      </button>
    </div>
  ),
}));

vi.mock("../SignUpForm", () => ({
  SignUpForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="sign-up-form">
      <button onClick={onSuccess} data-testid="sign-up-success">
        Trigger success
      </button>
    </div>
  ),
}));

import { AuthDialog } from "../AuthDialog";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders sign-in form and 'Welcome back' title by default", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} />);

  expect(screen.getByText("Welcome back")).toBeDefined();
  expect(screen.getByTestId("sign-in-form")).toBeDefined();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("renders sign-up form and 'Create an account' title when defaultMode is signup", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);

  expect(screen.getByText("Create an account")).toBeDefined();
  expect(screen.getByTestId("sign-up-form")).toBeDefined();
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
});

test("switches to sign-up form when 'Sign up' link is clicked", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

  expect(screen.getByText("Create an account")).toBeDefined();
  expect(screen.getByTestId("sign-up-form")).toBeDefined();
  expect(screen.queryByTestId("sign-in-form")).toBeNull();
});

test("switches to sign-in form when 'Sign in' link is clicked", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);

  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

  expect(screen.getByText("Welcome back")).toBeDefined();
  expect(screen.getByTestId("sign-in-form")).toBeDefined();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("calls onOpenChange(false) when sign-in form reports success", () => {
  const onOpenChange = vi.fn();
  render(<AuthDialog open={true} onOpenChange={onOpenChange} />);

  fireEvent.click(screen.getByTestId("sign-in-success"));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("calls onOpenChange(false) when sign-up form reports success", () => {
  const onOpenChange = vi.fn();
  render(<AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signup" />);

  fireEvent.click(screen.getByTestId("sign-up-success"));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("does not render dialog content when open is false", () => {
  render(<AuthDialog open={false} onOpenChange={vi.fn()} />);

  expect(screen.queryByTestId("sign-in-form")).toBeNull();
  expect(screen.queryByTestId("sign-up-form")).toBeNull();
});

test("syncs to new defaultMode when the prop value changes", () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(
    <AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signin" />
  );
  expect(screen.getByTestId("sign-in-form")).toBeDefined();

  // Parent switches the prop to "signup" — the dialog should follow
  rerender(<AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signup" />);
  expect(screen.getByTestId("sign-up-form")).toBeDefined();

  // Parent switches back to "signin"
  rerender(<AuthDialog open={true} onOpenChange={onOpenChange} defaultMode="signin" />);
  expect(screen.getByTestId("sign-in-form")).toBeDefined();
});

test("shows sign-in description text in signin mode", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} />);
  expect(screen.getByText(/sign in to your account to continue/i)).toBeDefined();
});

test("shows sign-up description text in signup mode", () => {
  render(<AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />);
  expect(screen.getByText(/start creating ai-powered react components/i)).toBeDefined();
});
