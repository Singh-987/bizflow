"use client";

import { authclient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export default function Login() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, seamlessly forward to home dashboard
  useEffect(() => {
    let cancelled = false;

    authclient.getSession().then(({ data }) => {
      if (!cancelled && data?.user) {
        router.replace("/");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function login() {
    setErrorMessage("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authclient.signIn.email({
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Invalid email or password.");
        return;
      }

      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch {
      setErrorMessage("Unable to log in. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function createAccount() {
    setErrorMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await authclient.signUp.email({
        name: cleanName,
        email: cleanEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to create account.");
        return;
      }

      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch {
      setErrorMessage("Something went wrong while creating the account.");
    } finally {
      setLoading(false);
    }
  }

  const isBusy = loading || isPending;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6">
      <div className="w-full max-w-md">
        {/* Brand logo header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-sm dark:bg-slate-100 dark:text-slate-900">
            R
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Rentello</h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Your rentals. Under control.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h2>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {isSignUp
                ? "Enter your details to get started with Rentello."
                : "Log in to manage your properties and rentals."}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isBusy) {
                void (isSignUp ? createAccount() : login());
              }
            }}
          >
            {isSignUp && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. John Doe"
                  value={name}
                  disabled={isBusy}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:ring-blue-900"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                disabled={isBusy}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:ring-blue-900"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
                  value={password}
                  disabled={isBusy}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:ring-blue-900"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    disabled={isBusy}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-500 dark:focus:ring-blue-900"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus:ring-offset-slate-900"
            >
              {isBusy ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>{isSignUp ? "Creating account..." : "Logging in..."}</span>
                </>
              ) : isSignUp ? (
                "Create account"
              ) : (
                "Log in"
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp((current) => !current);
                setErrorMessage("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="font-semibold text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
            >
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Securely manage your properties, tenants, and rental records.
        </p>
      </div>
    </main>
  );
}