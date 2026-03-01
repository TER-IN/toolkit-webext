// ============================================
// TERIN Toolkit — Dashboard Layout
// ============================================
// Persistent sidebar + main content area.

import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
    Home,
    Paintbrush,
    Bookmark,
    Link2,
    Type,
    ArrowLeftRight,
    Settings,
    AlertCircle,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FsSyncManager, type SyncState } from "@/lib/fs-sync";
import browser from "webextension-polyfill";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
    { to: "/", label: "Home", icon: Home },
    { to: "/css-injector", label: "CSS Overrides", icon: Paintbrush },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { to: "/url-tools", label: "URL Tools", icon: Link2 },
    { to: "/string-tools", label: "String Tools", icon: Type },
    { to: "/converters", label: "Converters", icon: ArrowLeftRight },
] as const;

export function DashboardLayout() {
    const [syncState, setSyncState] = useState<SyncState>("disconnected");
    // Load persisted state if available
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem("terin-ui-sidebar-collapsed") === "true";
    });

    useEffect(() => {
        let unsubscribe = () => { };

        async function initAutoSync() {
            const state = await FsSyncManager.verifyPermission(false);
            setSyncState(state);

            if (state === "connected") {
                await FsSyncManager.syncNow();
                const listener = () => {
                    FsSyncManager.pushLocalChanges();
                };
                browser.storage.local.onChanged.addListener(listener);
                unsubscribe = () =>
                    browser.storage.local.onChanged.removeListener(listener);
            }
        }

        initAutoSync();
        return () => unsubscribe();
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("terin-ui-sidebar-collapsed", String(next));
            return next;
        });
    };

    return (
        <TooltipProvider>
            <div className="flex h-screen bg-background text-foreground">
                {/* ---- Sidebar ---- */}
                <aside
                    className={cn(
                        "flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out shrink-0",
                        isCollapsed ? "w-[72px]" : "w-64"
                    )}
                >
                    {/* Brand */}
                    <div
                        className={cn(
                            "flex h-16 items-center border-b border-border overflow-hidden",
                            isCollapsed ? "justify-center px-0" : "px-6 gap-2"
                        )}
                    >
                        <img
                            src="/icons/icon-128.png"
                            alt="TERIN Logo"
                            className="h-8 w-8 rounded-lg object-contain shrink-0"
                        />
                        {!isCollapsed && (
                            <span className="text-lg font-semibold tracking-tight whitespace-nowrap">
                                TERIN Toolkit
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className={cn("flex-1 space-y-2 p-3", isCollapsed && "items-center flex flex-col")}>
                        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
                            const linkContent = (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={to === "/"}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center rounded-lg py-2 text-sm font-medium transition-colors h-10 w-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isCollapsed ? "justify-center px-0" : "px-3 gap-3",
                                            isActive
                                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                        )
                                    }
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
                                </NavLink>
                            );

                            if (isCollapsed) {
                                return (
                                    <Tooltip key={to} delayDuration={0}>
                                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                                        <TooltipContent side="right">{label}</TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return linkContent;
                        })}
                    </nav>

                    {/* Settings Nav Item (at the bottom) */}
                    <div className="border-t border-border p-3">
                        {(() => {
                            const settingsLink = (
                                <NavLink
                                    to="/settings"
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center rounded-lg py-2 text-sm font-medium transition-colors h-10 w-full relative outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isCollapsed ? "justify-center px-0" : "px-3 justify-between",
                                            isActive
                                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                        )
                                    }
                                >
                                    <div className={cn("flex justify-center", isCollapsed ? "" : "gap-3")}>
                                        <Settings className="h-5 w-5 shrink-0" />
                                        {!isCollapsed && <span>Settings</span>}
                                    </div>
                                    {!isCollapsed && syncState === "requires_permission" && (
                                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                    )}
                                    {isCollapsed && syncState === "requires_permission" && (
                                        <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
                                    )}
                                </NavLink>
                            );

                            if (isCollapsed) {
                                return (
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild className="relative">
                                            {settingsLink}
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Settings</TooltipContent>
                                    </Tooltip>
                                );
                            }
                            return settingsLink;
                        })()}
                    </div>

                    {/* Toggle and Footer */}
                    <div className="flex items-center justify-between border-t border-border p-4">
                        {!isCollapsed && (
                            <div className="text-xs text-muted-foreground truncate opacity-50">
                                v{__APP_VERSION__}
                            </div>
                        )}
                        <button
                            onClick={toggleSidebar}
                            className={cn(
                                "flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isCollapsed && "w-full"
                            )}
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isCollapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
                        </button>
                    </div>
                </aside>

                {/* ---- Main content ---- */}
                <main className="flex-1 overflow-y-auto p-8 relative">
                    <Outlet />
                </main>
            </div>
        </TooltipProvider>
    );
}
