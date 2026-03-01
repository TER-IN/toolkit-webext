// ============================================
// TERIN Toolkit — Command Palette Component
// ============================================
// A floating command palette injected into web pages.
// Toggled via Ctrl/Cmd + Shift + K.

import { useState, useEffect, useRef, useCallback } from "react";
import browser from "webextension-polyfill";
import { MSG_TOGGLE_DARK_MODE, MSG_GET_STATUS, MSG_ADD_BOOKMARK, MSG_GET_BOOKMARK_STATUS, MSG_SHORTEN_URL, MSG_GET_SHORT_URL_STATUS } from "@/types";

/** Available commands in the palette */
interface Command {
    id: string;
    label: string;
    description: string;
    icon: string;   // emoji for simplicity in content script (no lucide in shadow DOM)
    action: () => Promise<void>;
}

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isShortened, setIsShortened] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const hostname = window.location.hostname;

    // Fetch current dark mode status when palette opens
    const refreshStatus = useCallback(async () => {
        try {
            const [darkRes, bmRes, shortRes] = await Promise.all([
                browser.runtime.sendMessage({
                    type: MSG_GET_STATUS,
                    hostname,
                }),
                browser.runtime.sendMessage({
                    type: MSG_GET_BOOKMARK_STATUS,
                    url: window.location.href,
                }),
                browser.runtime.sendMessage({
                    type: MSG_GET_SHORT_URL_STATUS,
                    url: window.location.href,
                }),
            ]);
            if (darkRes && typeof darkRes === "object" && "enabled" in darkRes) {
                setDarkModeEnabled((darkRes as { enabled: boolean }).enabled);
            }
            if (bmRes && typeof bmRes === "object" && "bookmarked" in bmRes) {
                setIsBookmarked((bmRes as { bookmarked: boolean }).bookmarked);
            }
            if (shortRes && typeof shortRes === "object" && "shortened" in shortRes) {
                setIsShortened((shortRes as { shortened: boolean }).shortened);
            }
        } catch {
            // Extension context might not be available
        }
    }, [hostname]);

    // ---- Commands ----
    const commands: Command[] = [
        {
            id: "toggle-dark-mode",
            label: "Toggle Dark Mode",
            description: darkModeEnabled
                ? `Disable dark mode on ${hostname}`
                : `Enable dark mode on ${hostname}`,
            icon: darkModeEnabled ? "☀️" : "🌙",
            action: async () => {
                try {
                    const response = await browser.runtime.sendMessage({
                        type: MSG_TOGGLE_DARK_MODE,
                        hostname,
                    });
                    if (response && typeof response === "object" && "enabled" in response) {
                        setDarkModeEnabled((response as { enabled: boolean }).enabled);
                    }
                } catch (err) {
                    console.error("[TERIN] Failed to toggle dark mode:", err);
                }
                setIsOpen(false);
            },
        },
        {
            id: "bookmark-page",
            label: "Bookmark This Page",
            description: isBookmarked
                ? "Already bookmarked"
                : "Save current page to bookmarks",
            icon: isBookmarked ? "⭐" : "☆",
            action: async () => {
                if (isBookmarked) {
                    setIsOpen(false);
                    return;
                }
                try {
                    // Attempt to grab the favicon URL
                    const faviconLink = document.querySelector<HTMLLinkElement>(
                        'link[rel~="icon"], link[rel="shortcut icon"]',
                    );
                    const favicon = faviconLink?.href || `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

                    const response = await browser.runtime.sendMessage({
                        type: MSG_ADD_BOOKMARK,
                        url: window.location.href,
                        title: document.title || window.location.href,
                        favicon,
                    });
                    if (response && typeof response === "object" && "added" in response) {
                        setIsBookmarked(true);
                    }
                } catch (err) {
                    console.error("[TERIN] Failed to bookmark page:", err);
                }
                setIsOpen(false);
            },
        },
        {
            id: "shorten-url",
            label: "Shorten This URL",
            description: isShortened
                ? "Already shortened — copy again"
                : "Create a short URL and copy to clipboard",
            icon: "🔗",
            action: async () => {
                try {
                    const response = await browser.runtime.sendMessage({
                        type: MSG_SHORTEN_URL,
                        url: window.location.href,
                        title: document.title || window.location.href,
                    });
                    if (response && typeof response === "object" && "shortUrl" in response) {
                        const shortUrl = (response as { shortUrl: string }).shortUrl;
                        await navigator.clipboard.writeText(shortUrl);
                        setIsShortened(true);
                    }
                } catch (err) {
                    console.error("[TERIN] Failed to shorten URL:", err);
                }
                setIsOpen(false);
            },
        },
    ];

    // Filter commands based on search query
    const filtered = query.trim()
        ? commands.filter(
            (cmd) =>
                cmd.label.toLowerCase().includes(query.toLowerCase()) ||
                cmd.description.toLowerCase().includes(query.toLowerCase()),
        )
        : commands;

    // ---- Keyboard shortcut to open/close ----
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ctrl/Cmd + Shift + K to toggle palette
            if (e.key === "K" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen((prev) => {
                    const next = !prev;
                    if (next) {
                        refreshStatus();
                    }
                    return next;
                });
                setQuery("");
                setActiveIndex(0);
            }
        }

        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [refreshStatus]);

    // Focus input when palette opens
    useEffect(() => {
        if (isOpen) {
            // Small delay to allow the DOM to render
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // ---- Keyboard navigation inside the palette ----
    function handleInputKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape") {
            e.preventDefault();
            setIsOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[activeIndex]) {
                filtered[activeIndex].action();
            }
        }
    }

    if (!isOpen) return null;

    return (
        <div
            className="terin-overlay"
            onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget) setIsOpen(false);
            }}
        >
            <div className="terin-palette">
                {/* Search input */}
                <div className="terin-input-wrapper">
                    <input
                        ref={inputRef}
                        className="terin-input"
                        type="text"
                        placeholder="Type a command…"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleInputKeyDown}
                    />
                </div>

                {/* Results */}
                <div className="terin-results">
                    {filtered.length === 0 ? (
                        <div
                            style={{
                                padding: "20px",
                                textAlign: "center",
                                color: "rgba(255,255,255,0.35)",
                                fontSize: "14px",
                            }}
                        >
                            No matching commands
                        </div>
                    ) : (
                        filtered.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                className={`terin-result-item${index === activeIndex ? " terin-active" : ""}`}
                                onClick={() => cmd.action()}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                <span className="terin-result-icon">{cmd.icon}</span>
                                <span className="terin-result-label">{cmd.label}</span>
                                <span className="terin-result-badge">{cmd.description}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="terin-footer">
                    <span>TERIN Toolkit</span>
                    <div className="terin-kbd">
                        <kbd>↑↓</kbd> navigate
                        <kbd>↵</kbd> select
                        <kbd>esc</kbd> close
                    </div>
                </div>
            </div>
        </div>
    );
}
