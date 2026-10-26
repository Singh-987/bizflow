"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { authclient } from "@/lib/auth-client";

const navigation = [
    {
        name: "Dashboard",
        href: "/",
    },

    {
        name: "Properties",
        href: "/properties",
    },
    {
        name: "Tenants",
        href: "/tenants",
    },
    {
        name: "Leases",
        href: "/leases",
    },
    {
        name: "Payments",
        href: "/payments",
    },
    {
        name: "Expenses",
        href: "/expenses",
    },
    {
        name: "Financials",
        href: "/financials"
    }
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

export default function AppShell({ children, }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [pendingPath, setPendingPath]= useState<string | null>(null);
    const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
    setMobileMenuOpen(false);
    setPendingPath(null);

    if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
    }
}, [pathname]);
    const router = useRouter();
   function handleNavigation(href: string) {
    const destinationPath = href.split("?")[0].split("#")[0];

    if (destinationPath === pathname) return;

    setPendingPath(destinationPath);

    if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
        setPendingPath(null);
    }, 15000);
}
    const [authChecking, setAuthChecking]= useState(true);
    const [search, setSearch] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const norificationRef = useRef<HTMLDivElement>(null);
    const [activities, setActivities] =
        useState<ActivityItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activityLoading, setActivityLoading] =
        useState(false);
    const [activityError, setActivityError] =
        useState(false);
    const [notificationFilter, setNotificationFilter] = useState<"ALL" | "UNREAD" | "OVERDUE" | "UPCOMING">("ALL");
    const [markingAllRead, setMarkingAllRead] = useState(false);
    const filteredActivities = activities.filter((item) => {
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
            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
        });
    useEffect(() => {
        const savedTheme = localStorage.getItem("bizflow-theme");
        document.documentElement.classList.toggle(
            "dark",
            savedTheme === "dark"
        );
    }, []);
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
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search]);
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
    useEffect(() => {
        if (!showNotifications) return;
        function handleOutsideClick(event: MouseEvent) {
            if (
                norificationRef.current &&
                !norificationRef.current.contains(event.target as Node)
            ) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [showNotifications])
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
        if (unreadActivities.length === 0 || markingAllRead) {
            return;
        }
        setMarkingAllRead(true);

        try {
            const response = await fetch("/api/activity/read", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    activityIds: unreadActivities.map((item) => item.id),
                }),
            });
            if (!response.ok) {
                throw new Error("Failed to mark notifications as read.");
            }
            setActivities((current) => current.map((item) => ({ ...item, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all notification as read:", error);
        } finally {
            setMarkingAllRead(false);
        }
    }

    async function logout() {
    try {
        const { error } = await authclient.signOut();

        if (error) {
            console.error("Logout failed:", error.message);
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
if (authChecking) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Checking session...
            </p>
        </div>
    );
}
    return (
        <div className="h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <div className="flex h-full">
                <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
                    <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
                        <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Rentello
                        </div>
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
                                    onClick={() => handleNavigation(item.href)}
                                    className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${active
                                        ? "bg-slate-900 text-white"
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
                            onClick={() => handleNavigation("/settings")}
                            className="block rounded-lg px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <header className="relative z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:flex-nowrap md:px-6">
                        <div className="flex shrink-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen((open) => !open)}
                                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                                aria-expanded={mobileMenuOpen}
                                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                            >
                                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>

                            <Link
                                href="/"
                                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white md:hidden"
                            >
                                Rentello
                            </Link>

                            <h1 className="hidden text-lg font-semibold text-slate-900 dark:text-white md:block">
                                Rentello
                            </h1>
                        </div>
                        <div className="relative order-last w-full min-w-0 md:order-none md:max-w-md md:flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search properties, tenants, units..."
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
                            />

                            {search && (
                                <button
                                    type="button"
                                    aria-label="Clear search"
                                    onClick={() => {
                                        setSearch("");
                                        setSearchResults([]);
                                    }}
                                    className="absolute right-2 top-1/2
            -translate-y-1/2 px-2 text-slate-400"
                                >
                                    ×
                                </button>
                            )}

                            {search && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-2
            overflow-hidden rounded-lg border border-slate-200
            bg-white shadow-lg dark:border-slate-700
            dark:bg-slate-900"
                                >
                                    {searchLoading && (
                                        <div className="px-4 py-3 text-sm text-slate-500">
                                            Searching...
                                        </div>
                                    )}

                                    {!searchLoading && searchResults.length === 0 && (
                                        <div className="px-4 py-3 text-sm text-slate-500">
                                            No results found.
                                        </div>
                                    )}

                                    {!searchLoading &&
                                        searchResults.map((result) => (
                                            <Link
    key={`${result.type}-${result.id}`}
    href={result.href}
    onClick={(event) => {
        event.preventDefault();


    setSearch("");
    setSearchResults([]);

    const destination = new URL(result.href, window.location.origin);
    destination.searchParams.set("_highlightRun", crypto.randomUUID());

    router.push(
        `${destination.pathname}${destination.search}${destination.hash}`
    );
}}



                                                className="block border-b border-slate-100
                        px-4 py-3 hover:bg-slate-50
                        dark:border-slate-800
                        dark:hover:bg-slate-800"
                                            >
                                                <div className="text-xs font-medium
                            text-slate-400"
                                                >
                                                    {result.type}
                                                </div>

                                                <div className="text-sm font-medium
                            text-slate-900 dark:text-white"
                                                >
                                                    {result.title}
                                                </div>

                                                <div className="text-xs text-slate-500
                            dark:text-slate-400"
                                                >
                                                    {result.subtitle}
                                                </div>
                                            </Link>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="absolute right-4 top-3 flex items-center gap-2 md:static md:gap-3">
                            <div ref={norificationRef} className="relative">
                                <button
    type="button"
    aria-label="Notifications"
    aria-expanded={showNotifications}
    onClick={() =>
        setShowNotifications(!showNotifications)
    }
    className="relative rounded-lg p-2 text-slate-600
        hover:bg-slate-100 dark:text-slate-300
        dark:hover:bg-slate-800"
>
                                    <Bell size={20} />

                                    {unreadCount > 0 && (
                                        <span
                                            className="absolute -right-0.5 -top-0.5
        flex h-4 min-w-4 items-center justify-center
        rounded-full bg-red-500 px-1 text-[10px]
        font-bold text-white"
                                        >
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute right-0 top-full z-50 mt-2
    w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-1rem)]
    rounded-lg border border-slate-200
    bg-white shadow-lg
    dark:border-slate-700
    dark:bg-slate-900
    [@media(max-width:767px)]:fixed
    [@media(max-width:767px)]:right-2
    [@media(max-width:767px)]:left-2
    [@media(max-width:767px)]:top-16
    [@media(max-width:767px)]:w-auto"
>
                                        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                                            <div className="flex items-center justify-between gap-2">
                                                <h2 className="font-semibold text-slate-900 dark:text-white">
                                                    Notifications
                                                </h2>
                                                <button
                                                    type="button"
                                                    onClick={markAllAsRead}
                                                    disabled={
                                                        markingAllRead || activities.every((item) => item.isRead)
                                                    }
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400">
                                                    {markingAllRead ? "Marking" : "Mark all as read"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNotifications(false)}
                                                    aria-label="close notifications"
                                                    title="Close notifications"
                                                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(["ALL", "UNREAD", "OVERDUE", "UPCOMING"] as const).map((filter) => (
                                                    <button
                                                        key={filter}
                                                        type="button"
                                                        onClick={() => setNotificationFilter(filter)}
                                                        className={`rounded-full px-3 py-1 text-xs font-medium ${notificationFilter === filter
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
                                                                    : "Upcoming"
                                                        }
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="max-h-96 overflow-y-auto">
                                            {activityLoading && (
                                                <div className="px-4 py-6 text-center text-sm
            text-slate-500 dark:text-slate-400"
                                                >
                                                    Loading activity...
                                                </div>
                                            )}

                                            {!activityLoading && activityError && (
                                                <div className="px-4 py-6 text-center text-sm
            text-red-500"
                                                >
                                                    Couldn't load activity. Close and reopen
                                                    notifications to try again.
                                                </div>
                                            )}

                                            {!activityLoading &&
                                                !activityError &&
                                                filteredActivities.length === 0 && (
                                                    <div className="px-4 py-6 text-center text-sm
                text-slate-500 dark:text-slate-400"
                                                    >
                                                        No activity yet.
                                                    </div>
                                                )}

                                            {!activityLoading &&
                                                !activityError &&
                                                filteredActivities.map((item) => (
                                                    <Link
                                                        key={item.id}
                                                        href={item.href}
                                                        onClick={async (event) => {
                                                            event.preventDefault();

                                                            if (!item.isRead) {
                                                                setActivities((current) =>
                                                                    current.map((activity) =>
                                                                        activity.id === item.id
                                                                            ? { ...activity, isRead: true }
                                                                            : activity
                                                                    )
                                                                );

                                                                setUnreadCount((count) => Math.max(0, count - 1));

                                                                try {
                                                                    const response = await fetch("/api/activity/read", {
                                                                        method: "POST",
                                                                        headers: {
                                                                            "Content-Type": "application/json",
                                                                        },
                                                                        body: JSON.stringify({
                                                                            activityId: item.id,
                                                                        }),
                                                                    });

                                                                    if (!response.ok) {
                                                                        throw new Error("Failed to save read status");
                                                                    }
                                                                } catch {
                                                                    setActivities((current) =>
                                                                        current.map((activity) =>
                                                                            activity.id === item.id
                                                                                ? { ...activity, isRead: false }
                                                                                : activity
                                                                        )
                                                                    );

                                                                    setUnreadCount((count) => count + 1);
                                                                }
                                                            }

                                                            setShowNotifications(false);

const destination = new URL(item.href, window.location.origin);
destination.searchParams.set("_highlightRun", String(Date.now()));

router.push(
    `${destination.pathname}${destination.search}${destination.hash}`
);
                                                        }}
                                                        className={`block border-b border-slate-200 px-4 py-3 transition-colors hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800 ${item.isRead
                                                            ? "opacity-70"
                                                            : "bg-blue-50/70 dark:bg-slate-800/70"
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                    {item.title}
                                                                </div>

                                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                    {item.description}
                                                                </div>

                                                                <div className="mt-2 text-[11px] text-slate-400">
                                                                    {new Date(item.createdAt).toLocaleString()}
                                                                </div>
                                                            </div>

                                                            <span className="shrink-0 rounded-md bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                                {item.type === "PAYMENT"
                                                                    ? "View Payments"
                                                                    : item.type === "ELECTRICITY"
                                                                        ? "View Unit"
                                                                        : item.type === "EXPENSE"
                                                                            ? "View Expenses"
                                                                            : "View Details"}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={logout}
                                className="rounded-lg px-2 py-2 text-xs font-medium md:px-3 md:text-sm text-slate-600 transition hover:bg-slate-600
        hover:text-slate-900 dark:text-slate-300
        dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </header>
                    {mobileMenuOpen && (
                        <>
                            <button
                                type="button"
                                aria-label="Close navigation menu"
                                onClick={() => setMobileMenuOpen(false)}
                                className="fixed inset-0 z-40 bg-black/30 md:hidden"
                            />


                            <nav className="absolute left-0 right-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden">
                                {navigation.map((item) => {
                                    const active =
                                        item.href === "/"
                                            ? pathname === "/"
                                            : pathname.startsWith(item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => {
    setMobileMenuOpen(false);
    handleNavigation(item.href);
}}
                                            className={`mb-1 block rounded-lg px-4 py-3 text-sm font-medium transition ${active
                                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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

                                <Link
                                    href="/settings"
                                    onClick={() => handleNavigation("/settings")}
                                    className="mt-2 block rounded-lg border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
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

                                <button
                                    type="button"
                                    onClick={logout}
                                    className="mt-1 block w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-800"
                                >
                                    Logout
                                </button>
                            </nav>
                        </>


                    )}

                    <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}