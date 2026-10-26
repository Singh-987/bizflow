"use client";

import AppShell from "@/components/layout/AppShell";
import { authclient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
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

    const router = useRouter();

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

                const savedTheme = localStorage.getItem("bizflow-theme");
                const isDark = savedTheme === "dark";

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
            setPasswordMessage("Please fill all the password fields.");
            setPasswordMessageType("error");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage("New passwords do not match.");
            setPasswordMessageType("error");
            return;
        }

        if (newPassword.length < 8) {
            setPasswordMessage("Password must be at least 8 characters.");
            setPasswordMessageType("error");
            return;
        }

        if (newPassword === currentPassword) {
            setPasswordMessage(
                "New password cannot be the same as the current password."
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
                    error.message || "Unable to update the password."
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
        } catch {
            setPasswordMessage(
                "Unable to update the password. Check your connection and try again."
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

        localStorage.setItem(
            "bizflow-theme",
            nextMode ? "dark" : "light"
        );
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

            setSessionMessage("All other sessions have been signed out.");
            setSessionMessageType("success");
        } catch {
            setSessionMessage(
                "Unable to sign out other sessions. Check your connection and try again."
            );
            setSessionMessageType("error");
        } finally {
            setRevokingSessions(false);
        }
    };

    const messageClass = (type: "success" | "error" | "") =>
        type === "success"
            ? "text-green-700 dark:text-green-400"
            : "text-red-600 dark:text-red-400";

    if (loadingUser) {
        return (
            <AppShell>
                <div className="flex min-h-48 items-center justify-center">
                    <p
                        role="status"
                        className="text-sm text-slate-500 dark:text-slate-400"
                    >
                        Loading account settings...
                    </p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        Settings
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage your account and application preferences.
                    </p>
                </div>

                {/* Account */}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Account
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Your account information.
                    </p>

                    <div className="mt-6 space-y-5">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Name
                            </label>
                            <div className="mt-1 break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {user?.name || "Not set"}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Email
                            </label>
                            <div className="mt-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {user?.email || "Not available"}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
                            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Password
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Update your account password.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowPasswordForm(!showPasswordForm);
                                    setPasswordMessage("");
                                    setPasswordMessageType("");
                                }}
                                className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                {showPasswordForm
                                    ? "Cancel"
                                    : "Change Password"}
                            </button>

                            {showPasswordForm && (
                                <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                                    {/* Current password */}
                                    <div>
                                        <label
                                            htmlFor="currentPassword"
                                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                                        >
                                            Current Password
                                        </label>

                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                                            <input
                                                id="currentPassword"
                                                type={
                                                    showCurrentPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="current-password"
                                                value={currentPassword}
                                                onChange={(e) =>
                                                    setCurrentPassword(
                                                        e.target.value
                                                    )
                                                }
                                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-700"
                                            />

                                            <button
                                                type="button"
                                                aria-label={
                                                    showCurrentPassword
                                                        ? "Hide current password"
                                                        : "Show current password"
                                                }
                                                onClick={() =>
                                                    setShowCurrentPassword(
                                                        !showCurrentPassword
                                                    )
                                                }
                                                className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                            >
                                                {showCurrentPassword
                                                    ? "Hide"
                                                    : "Show"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* New password */}
                                    <div>
                                        <label
                                            htmlFor="newPassword"
                                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                                        >
                                            New Password
                                        </label>

                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                                            <input
                                                id="newPassword"
                                                type={
                                                    showNewPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="new-password"
                                                value={newPassword}
                                                onChange={(e) =>
                                                    setNewPassword(
                                                        e.target.value
                                                    )
                                                }
                                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-700"
                                            />

                                            <button
                                                type="button"
                                                aria-label={
                                                    showNewPassword
                                                        ? "Hide new password"
                                                        : "Show new password"
                                                }
                                                onClick={() =>
                                                    setShowNewPassword(
                                                        !showNewPassword
                                                    )
                                                }
                                                className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                            >
                                                {showNewPassword
                                                    ? "Hide"
                                                    : "Show"}
                                            </button>
                                        </div>

                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Use at least 8 characters.
                                        </p>
                                    </div>

                                    {/* Confirm password */}
                                    <div>
                                        <label
                                            htmlFor="confirmPassword"
                                            className="text-sm font-medium text-slate-700 dark:text-slate-300"
                                        >
                                            Confirm New Password
                                        </label>

                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                                            <input
                                                id="confirmPassword"
                                                type={
                                                    showConfirmPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                autoComplete="new-password"
                                                value={confirmPassword}
                                                onChange={(e) =>
                                                    setConfirmPassword(
                                                        e.target.value
                                                    )
                                                }
                                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-700"
                                            />

                                            <button
                                                type="button"
                                                aria-label={
                                                    showConfirmPassword
                                                        ? "Hide confirmation password"
                                                        : "Show confirmation password"
                                                }
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        !showConfirmPassword
                                                    )
                                                }
                                                className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                            >
                                                {showConfirmPassword
                                                    ? "Hide"
                                                    : "Show"}
                                            </button>
                                        </div>
                                    </div>

                                    {passwordMessage && (
                                        <p
                                            role="status"
                                            aria-live="polite"
                                            className={`text-sm ${messageClass(
                                                passwordMessageType
                                            )}`}
                                        >
                                            {passwordMessage}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={handlePasswordChange}
                                            disabled={changingPassword}
                                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                        >
                                            {changingPassword
                                                ? "Updating..."
                                                : "Update Password"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowPasswordForm(false);
                                                setCurrentPassword("");
                                                setNewPassword("");
                                                setConfirmPassword("");
                                                setPasswordMessage("");
                                                setPasswordMessageType("");
                                                setShowCurrentPassword(false);
                                                setShowNewPassword(false);
                                                setShowConfirmPassword(false);
                                            }}
                                            disabled={changingPassword}
                                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Appearance */}
                <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Appearance
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Customize how Rentello looks for you.
                    </p>

                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Dark Mode
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Use a darker theme throughout the application.
                            </p>
                        </div>

                        <button
                            type="button"
                            role="switch"
                            aria-checked={darkMode}
                            aria-label="Dark mode"
                            onClick={handleDarkModeToggle}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                                darkMode
                                    ? "bg-slate-900 dark:bg-slate-100"
                                    : "bg-slate-300 dark:bg-slate-600"
                            }`}
                        >
                            <span
                                className={`absolute top-1 h-4 w-4 rounded-full transition ${
                                    darkMode
                                        ? "left-6 bg-white dark:bg-slate-900"
                                        : "left-1 bg-white"
                                }`}
                            />
                        </button>
                    </div>
                </section>

                {/* Security */}
                <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Security
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage your active login sessions.
                    </p>

                    <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                Active Sessions
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Sign out of all other devices where your
                                account is logged in.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRevokeOtherSessions}
                            disabled={revokingSessions}
                            className="w-full shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {revokingSessions
                                ? "Signing out..."
                                : "Sign out other sessions"}
                        </button>
                    </div>

                    {sessionMessage && (
                        <p
                            role="status"
                            aria-live="polite"
                            className={`mt-4 text-sm ${messageClass(
                                sessionMessageType
                            )}`}
                        >
                            {sessionMessage}
                        </p>
                    )}
                </section>
            </div>
        </AppShell>
    );
}