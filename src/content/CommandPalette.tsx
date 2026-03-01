// ============================================
// TERIN Toolkit — Command Palette Component
// ============================================
// A floating command palette injected into web pages.
// Toggled via Ctrl/Cmd + Shift + K.

import { useState, useEffect, useRef, useCallback } from "react";
import browser from "webextension-polyfill";
import { MSG_TOGGLE_DARK_MODE, MSG_GET_STATUS, MSG_ADD_BOOKMARK, MSG_GET_BOOKMARK_STATUS, MSG_SHORTEN_URL, MSG_GET_SHORT_URL_STATUS } from "@/types";
import {
    getStringLength,
    toUpperCase,
    toLowerCase,
    toTitleCase,
    toSentenceCase,
    removeAccents,
    removeExtraSpaces,
    stringToBinary,
    binaryToString,
    base64Encode,
    base64Decode,
    urlEncode,
    urlDecode,
} from "@/lib/string-tools";

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
    const resultsRef = useRef<HTMLDivElement>(null);

    // Capture the text selection at the moment the palette opens,
    // before the input steals focus and de-selects the highlighted text.
    const capturedSelectionRef = useRef<string>("");

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
            id: "open-home",
            label: "Open TERIN Home",
            description: "Open the extension dashboard",
            icon: "🏠",
            action: async () => {
                const dashboardUrl = browser.runtime.getURL("index.html");
                window.open(dashboardUrl, "_blank");
                setIsOpen(false);
            },
        },
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

        // ---- String Tools ----
        ...buildStringToolCommands(),
    ];

    /**
     * Build the 11 string-tool commands.
     * Each one uses the captured text selection (snapshotted when palette opened),
     * transforms it, copies the result to clipboard, and shows an alert.
     * If no text was selected, it navigates the user to the dedicated tool page.
     */
    function buildStringToolCommands(): Command[] {
        /** Helper: use captured selection, run transform, copy & alert */
        function makeStringCommand(
            id: string,
            label: string,
            description: string,
            icon: string,
            transform: (s: string) => string,
            /** Hash route for the fallback dashboard page */
            dashboardRoute: string,
        ): Command {
            return {
                id,
                label,
                description,
                icon,
                action: async () => {
                    // Use the selection captured when the palette opened
                    const selected = capturedSelectionRef.current;
                    if (!selected) {
                        // No text was selected → navigate to the dedicated tool page
                        const dashboardUrl = browser.runtime.getURL(`index.html#${dashboardRoute}`);
                        window.open(dashboardUrl, "_blank");
                        setIsOpen(false);
                        return;
                    }
                    try {
                        const result = transform(selected);
                        await navigator.clipboard.writeText(result);
                        // Truncate alert for very long results
                        const display = result.length > 500
                            ? result.slice(0, 500) + "… (truncated, full text copied)"
                            : result;
                        alert(display);
                    } catch (err) {
                        alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
                    }
                    setIsOpen(false);
                },
            };
        }

        return [
            makeStringCommand(
                "string-length",
                "String Length",
                "Count characters in highlighted text",
                "📏",
                (s) => `Length: ${getStringLength(s)}`,
                "/string-tools",
            ),
            makeStringCommand(
                "to-upper-case",
                "To Upper Case",
                "Convert highlighted text to UPPER CASE",
                "🔠",
                toUpperCase,
                "/string-tools",
            ),
            makeStringCommand(
                "to-lower-case",
                "To Lower Case",
                "Convert highlighted text to lower case",
                "🔡",
                toLowerCase,
                "/string-tools",
            ),
            makeStringCommand(
                "to-title-case",
                "To Title Case",
                "Capitalise Each Word in highlighted text",
                "🏷️",
                toTitleCase,
                "/string-tools",
            ),
            makeStringCommand(
                "to-sentence-case",
                "To Sentence Case",
                "Capitalise first letter of each sentence",
                "💬",
                toSentenceCase,
                "/string-tools",
            ),
            makeStringCommand(
                "remove-accents",
                "Remove Accents",
                "Strip diacritical marks from highlighted text",
                "🅰️",
                removeAccents,
                "/string-tools",
            ),
            makeStringCommand(
                "remove-spaces",
                "Remove Extra Spaces",
                "Collapse multiple spaces in highlighted text",
                "⬜",
                removeExtraSpaces,
                "/string-tools",
            ),
            makeStringCommand(
                "string-to-binary",
                "String → Binary",
                "Convert highlighted text to 8-bit binary",
                "🔢",
                stringToBinary,
                "/converters",
            ),
            makeStringCommand(
                "binary-to-string",
                "Binary → String",
                "Convert highlighted binary back to text",
                "🔤",
                binaryToString,
                "/converters",
            ),
            makeStringCommand(
                "base64-encode",
                "Base64 Encode",
                "Encode highlighted text as Base64",
                "🔒",
                base64Encode,
                "/converters",
            ),
            makeStringCommand(
                "base64-decode",
                "Base64 Decode",
                "Decode highlighted Base64 text",
                "🔓",
                base64Decode,
                "/converters",
            ),
            makeStringCommand(
                "url-encode",
                "URL Encode",
                "Percent-encode highlighted text",
                "🔗",
                urlEncode,
                "/url-tools",
            ),
            makeStringCommand(
                "url-decode",
                "URL Decode",
                "Decode percent-encoded highlighted text",
                "🌐",
                urlDecode,
                "/url-tools",
            ),
        ];
    }

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
                        // Snapshot the current text selection before the palette steals focus
                        capturedSelectionRef.current = window.getSelection()?.toString() ?? "";
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

    // Auto-scroll active item into view when navigating with keyboard
    useEffect(() => {
        if (!isOpen || !resultsRef.current) return;
        const container = resultsRef.current;
        const activeElement = container.children[activeIndex] as HTMLElement | undefined;
        if (activeElement) {
            activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [activeIndex, isOpen]);

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
                <div className="terin-results" ref={resultsRef}>
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
