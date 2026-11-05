"use client";

import AppShell from "@/components/layout/AppShell";
import { authclient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<{
    name?: string | null;
    email?: string | null;
  } | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordMessageType, setPasswordMessageType] = useState<
    "success" | "error" | ""
  >("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionMessageType, setSessionMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [revokingSessions, setRevokingSessions] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const result = await authclient.getSession();

        if (cancelled) return;

        if (!result.data?.user) {
          router.replace("/login");
          return;
        }

        setUser(result.data.user);

        const savedTheme =
          localStorage.getItem("rentello-theme") ||
          localStorage.getItem("bizflow-theme");
        const isDark =
          savedTheme === "dark" ||
          (!savedTheme &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        setDarkMode(isDark);
        document.documentElement.classList.toggle("dark", isDark);
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handlePasswordChange = async () => {
    setPasswordMessage("");
    setPasswordMessageType("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("Please fill in all password fields.");
      setPasswordMessageType("error");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("New password must be at least 8 characters long.");
      setPasswordMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      setPasswordMessageType("error");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordMessage(
        "New password cannot be the same as your current password."
      );
      setPasswordMessageType("error");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await authclient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (error) {
        setPasswordMessage(
          error.message || "Unable to update your password."
        );
        setPasswordMessageType("error");
        return;
      }

      setPasswordMessage("Password updated successfully.");
      setPasswordMessageType("success");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setTimeout(() => {
        setShowPasswordForm(false);
      }, 1500);
    } catch {
      setPasswordMessage(
        "Unable to update your password. Please check your connection and try again."
      );
      setPasswordMessageType("error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDarkModeToggle = () => {
    const nextMode = !darkMode;

    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);

    localStorage.setItem("rentello-theme", nextMode ? "dark" : "light");
    localStorage.setItem("bizflow-theme", nextMode ? "dark" : "light");
  };

  const handleRevokeOtherSessions = async () => {
    setSessionMessage("");
    setSessionMessageType("");
    setRevokingSessions(true);

    try {
      const { error } = await authclient.revokeOtherSessions();

      if (error) {
        setSessionMessage(
          error.message || "Unable to sign out other sessions."
        );
        setSessionMessageType("error");
        return;
      }

      setSessionMessage("All other active sessions have been signed out.");
      setSessionMessageType("success");
    } catch {
      setSessionMessage(
        "Unable to sign out other sessions. Please check your connection and try again."
      );
      setSessionMessageType("error");
    } finally {
      setRevokingSessions(false);
    }
  };

  if (loadingUser) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" />
          <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your account credentials, security preferences, and display settings.
          </p>
        </div>

        {/* Account Details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Account Profile
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Personal identity and authentication details.
          </p>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Full Name
                </label>
                <div className="mt-1 break-words rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                  {user?.name || "Not set"}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="mt-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                  {user?.email || "Not available"}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Account Password
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Change your password to keep your account secure.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setPasswordMessage("");
                    setPasswordMessageType("");
                  }}
                  className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {showPasswordForm ? "Cancel" : "Change Password"}
                </button>
              </div>

              {showPasswordForm && (
                <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:p-5">
                  {/* Current password */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Current Password
                    </label>

                    <div className="relative mt-1">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter current password"
                        value={currentPassword}
                        disabled={changingPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-14 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        {showCurrentPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        New Password
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          value={newPassword}
                          disabled={changingPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-14 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          {showNewPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Confirm New Password
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          disabled={changingPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-14 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {passwordMessage && (
                    <div
                      role="alert"
                      className={`rounded-lg border px-3.5 py-2.5 text-sm ${
                        passwordMessageType === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                      }`}
                    >
                      {passwordMessageType === "success" ? "✓ " : ""}
                      {passwordMessage}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={changingPassword}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {changingPassword ? (
                        <>
                          <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Updating...</span>
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={changingPassword}
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setPasswordMessage("");
                        setPasswordMessageType("");
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Display & Appearance */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Display & Appearance
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Customize interface styling for your device.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Dark Mode
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Enable dark theme for improved contrast in low-light environments.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              aria-label="Toggle dark mode"
              onClick={handleDarkModeToggle}
              className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                darkMode ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                  darkMode ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Active Sessions & Security */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Session Security
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Control connected devices and authenticated tokens.
          </p>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Active Devices
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Sign out of all other browsers and mobile devices except this one.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={revokingSessions}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {revokingSessions ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Signing out...</span>
                </>
              ) : (
                "Sign out other sessions"
              )}
            </button>
          </div>

          {sessionMessage && (
            <div
              role="alert"
              className={`mt-4 rounded-lg border px-3.5 py-2.5 text-sm ${
                sessionMessageType === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {sessionMessageType === "success" ? "✓ " : ""}
              {sessionMessage}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}