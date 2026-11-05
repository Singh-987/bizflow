"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { authclient } from "@/lib/auth-client";
import { formatDate } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Properties", href: "/properties" },
  { name: "Tenants", href: "/tenants" },
  { name: "Leases", href: "/leases" },
  { name: "Payments", href: "/payments" },
  { name: "Expenses", href: "/expenses" },
  { name: "Financials", href: "/financials" },
];

type SearchResult = {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  isRead: boolean;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<
    "ALL" | "UNREAD" | "OVERDUE" | "UPCOMING"
  >("ALL");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Clear path transition state on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setPendingPath(null);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, [pathname]);

  function handleNavigation(href: string) {
    const destinationPath = href.split("?")[0].split("#")[0];
    if (destinationPath === pathname) return;

    setPendingPath(destinationPath);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      setPendingPath(null);
    }, 10000);
  }

  // Sync theme
  useEffect(() => {
    const savedTheme =
      localStorage.getItem("rentello-theme") ||
      localStorage.getItem("bizflow-theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // Check auth session
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const result = await authclient.getSession();
        if (cancelled) return;

        if (!result.data?.user) {
          router.replace("/login");
          return;
        }

        setAuthChecking(false);
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Search debouncing
  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearchLoading(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = await response.json();

        if (!cancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  // Load activities when popover opens
  useEffect(() => {
    if (!showNotifications) return;

    let cancelled = false;

    async function loadActivity() {
      setActivityLoading(true);
      setActivityError(false);

      try {
        const response = await fetch("/api/activity");

        if (!response.ok) {
          throw new Error("Failed to load activity");
        }

        const data = await response.json();

        if (!cancelled) {
          setActivities(data.activity ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        if (!cancelled) {
          setActivityError(true);
        }
      } finally {
        if (!cancelled) {
          setActivityLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [showNotifications]);

  // Outside click to close notification drawer
  useEffect(() => {
    if (!showNotifications) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showNotifications]);

  // Initial unread count
  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const response = await fetch("/api/activity");
        if (!response.ok) return;

        const data = await response.json();
        setUnreadCount(data.unreadCount ?? 0);
      } catch (error) {
        console.error("Failed to load unread count:", error);
      }
    }

    loadUnreadCount();
  }, []);

  async function markAllAsRead() {
    const unreadActivities = activities.filter((item) => !item.isRead);
    if (unreadActivities.length === 0 || markingAllRead) return;

    setMarkingAllRead(true);

    try {
      const response = await fetch("/api/activity/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityIds: unreadActivities.map((item) => item.id),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read.");
      }

      setActivities((current) =>
        current.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function logout() {
    try {
      const { error } = await authclient.signOut();

      if (error) {
        alert("Logout failed. Please try again.");
        return;
      }

      setSearch("");
      setSearchResults([]);
      setActivities([]);
      setUnreadCount(0);
      setShowNotifications(false);

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout request failed:", error);
      alert("Unable to log out. Please check your connection and try again.");
    }
  }

  const filteredActivities = activities
    .filter((item) => {
      switch (notificationFilter) {
        case "UNREAD":
          return !item.isRead;
        case "OVERDUE":
          return item.type === "OVERDUE";
        case "UPCOMING":
          return item.type === "UPCOMING";
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
          <span>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-full">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
          <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Rentello
            </Link>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => handleNavigation(item.href)}
                  className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    {item.name}
                    {pendingPath === item.href && (
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                        role="status"
                        aria-label={`Loading ${item.name}`}
                      />
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <Link
              href="/settings"
              prefetch={false}
              onClick={() => handleNavigation("/settings")}
              className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${pathname.startsWith("/settings")
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
            >
              <span className="flex items-center justify-between gap-2">
                Settings
                {pendingPath === "/settings" && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                    role="status"
                    aria-label="Loading Settings"
                  />
                )}
              </span>
            </Link>
          </div>
        </aside>

        {/* Main Header & Content Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:flex-nowrap md:px-6">
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={
                  mobileMenuOpen
                    ? "Close navigation menu"
                    : "Open navigation menu"
                }
                aria-expanded={mobileMenuOpen}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 active:scale-[0.98] dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <Link
                href="/"
                prefetch={false}
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white md:hidden"
              >
                Rentello
              </Link>
            </div>

            {/* Global Search Bar */}
            <div className="relative order-last w-full min-w-0 md:order-none md:max-w-md md:flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties, tenants, units..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}

              {search && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {searchLoading && (
                    <div className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      Searching records...
                    </div>
                  )}

                  {!searchLoading && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      No matching records found.
                    </div>
                  )}

                  {!searchLoading &&
                    searchResults.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.href}
                        prefetch={false}
                        onClick={(event) => {
                          event.preventDefault();
                          setSearch("");
                          setSearchResults([]);

                          const [basePath, existingQuery] = result.href.split("?");
                          const params = new URLSearchParams(existingQuery || "");

                          // 1. Ensure target ID is in query params
                          params.set("highlight", String(result.id));

                          // 2. Add timestamp nonce so every single click is a unique URL change
                          params.set("_hNonce", String(Date.now()));

                          router.push(`${basePath}?${params.toString()}`);
                        }}
                        className="block border-b border-slate-100 px-4 py-2.5 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          {result.type}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {result.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {result.subtitle}
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>

            {/* Notifications & User Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <div ref={notificationRef} className="relative">
                <button
                  type="button"
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 active:scale-[0.98] dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 [@media(max-width:767px)]:fixed [@media(max-width:767px)]:left-2 [@media(max-width:767px)]:right-2 [@media(max-width:767px)]:top-16 [@media(max-width:767px)]:w-auto">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold text-slate-900 dark:text-white">
                          Notifications
                        </h2>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            disabled={
                              markingAllRead ||
                              activities.every((item) => item.isRead)
                            }
                            className="text-xs font-medium text-blue-600 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                          >
                            {markingAllRead ? "Marking..." : "Mark all read"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNotifications(false)}
                            aria-label="Close notifications"
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(
                          ["ALL", "UNREAD", "OVERDUE", "UPCOMING"] as const
                        ).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setNotificationFilter(filter)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition active:scale-[0.98] ${notificationFilter === filter
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              }`}
                          >
                            {filter === "ALL"
                              ? "All"
                              : filter === "UNREAD"
                                ? "Unread"
                                : filter === "OVERDUE"
                                  ? "Overdue"
                                  : "Upcoming"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {activityLoading && (
                        <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          Loading activity...
                        </div>
                      )}

                      {!activityLoading && activityError && (
                        <div className="px-4 py-6 text-center text-xs text-rose-500">
                          Unable to load notifications. Please try again.
                        </div>
                      )}

                      {!activityLoading &&
                        !activityError &&
                        filteredActivities.length === 0 && (
                          <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            No notifications found.
                          </div>
                        )}

                      {!activityLoading &&
                        !activityError &&
                        filteredActivities.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            prefetch={false}
                            onClick={async () => {
                              if (!item.isRead) {
                                setActivities((current) =>
                                  current.map((act) =>
                                    act.id === item.id
                                      ? { ...act, isRead: true }
                                      : act
                                  )
                                );
                                setUnreadCount((c) => Math.max(0, c - 1));

                                try {
                                  await fetch("/api/activity/read", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      activityId: item.id,
                                    }),
                                  });
                                } catch (e) {
                                  console.error("Read status error:", e);
                                }
                              }
                              setShowNotifications(false);
                            }}
                            className={`block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${item.isRead
                                ? "opacity-75"
                                : "bg-blue-50/50 dark:bg-slate-800/40"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                  {item.title}
                                </div>
                                <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  {item.description}
                                </div>
                                <div className="mt-1.5 text-[10px] text-slate-400">
                                  {formatDate(item.createdAt)}
                                </div>
                              </div>
                              <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                {item.type}
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          </header>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
              />

              <nav className="absolute left-0 right-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:hidden">
                {navigation.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleNavigation(item.href);
                      }}
                      className={`mb-1 block rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${active
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        {item.name}
                        {pendingPath === item.href && (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        )}
                      </span>
                    </Link>
                  );
                })}

                <Link
                  href="/settings"
                  prefetch={false}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleNavigation("/settings");
                  }}
                  className={`mt-2 block rounded-lg border-t border-slate-200 px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] dark:border-slate-800 ${pathname.startsWith("/settings")
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    Settings
                    {pendingPath === "/settings" && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    )}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-1 block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] dark:text-rose-400 dark:hover:bg-slate-800"
                >
                  Logout
                </button>
              </nav>
            </>
          )}

          {/* Main Viewport */}
          <main className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {pendingPath && (
              <div
                className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:hidden"
                role="status"
              >
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                <span>Navigating...</span>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}