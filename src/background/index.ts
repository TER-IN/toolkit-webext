// ============================================
// TERIN Toolkit — Background Service Worker
// ============================================
// Responsibilities:
// 1. Listen for tab updates and inject saved CSS overrides.
// 2. Handle messages from the content script (toggle dark mode, bookmarks, etc.)

import browser from "webextension-polyfill";
import type { CssOverridesMap, BookmarksMap, BookmarkFoldersMap, Bookmark, ShortUrl, ShortUrlsMap, ExtensionMessage } from "@/types";
import { MSG_TOGGLE_DARK_MODE, MSG_GET_STATUS, MSG_ADD_BOOKMARK, MSG_GET_BOOKMARK_STATUS, MSG_SHORTEN_URL, MSG_GET_SHORT_URL_STATUS } from "@/types";

const STORAGE_KEY = "terin_css_overrides";
const BOOKMARKS_KEY = "terin_bookmarks";
const FOLDERS_KEY = "terin_bookmark_folders";
const SHORT_URLS_KEY = "terin_short_urls";

/** Default dark-mode CSS snippet (must match the store's default) */
const DEFAULT_DARK_CSS = `html {
  filter: invert(1) hue-rotate(180deg) !important;
}
img, video, iframe {
  filter: invert(1) hue-rotate(180deg) !important;
}`;

// ---- Helpers ----

/** Read the full overrides map from storage */
async function getOverrides(): Promise<CssOverridesMap> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as CssOverridesMap) ?? {};
}

/** Persist the full overrides map to storage */
async function saveOverrides(overrides: CssOverridesMap): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEY]: overrides });
}

/** Read all bookmarks from storage */
async function getBookmarks(): Promise<BookmarksMap> {
    const result = await browser.storage.local.get(BOOKMARKS_KEY);
    return (result[BOOKMARKS_KEY] as BookmarksMap) ?? {};
}

/** Persist bookmarks to storage */
async function saveBookmarks(bookmarks: BookmarksMap): Promise<void> {
    await browser.storage.local.set({ [BOOKMARKS_KEY]: bookmarks });
}

/** Read all bookmark folders from storage */
async function getFolders(): Promise<BookmarkFoldersMap> {
    const result = await browser.storage.local.get(FOLDERS_KEY);
    return (result[FOLDERS_KEY] as BookmarkFoldersMap) ?? {};
}

/** Extract the hostname from a URL string, returns null for non-http URLs */
function extractHostname(url: string | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.hostname;
        }
    } catch {
        // Invalid URL
    }
    return null;
}

// ---- Short URL helpers ----

/** Characters used for generating short codes */
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;

/** Generate a random alphanumeric short code */
function generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    return code;
}

/** Read all short URLs from storage */
async function getShortUrls(): Promise<ShortUrlsMap> {
    const result = await browser.storage.local.get(SHORT_URLS_KEY);
    return (result[SHORT_URLS_KEY] as ShortUrlsMap) ?? {};
}

/** Persist short URLs to storage */
async function saveShortUrls(shortUrls: ShortUrlsMap): Promise<void> {
    await browser.storage.local.set({ [SHORT_URLS_KEY]: shortUrls });
}

/** Build the redirect URL for a short code */
function buildRedirectUrl(code: string): string {
    return browser.runtime.getURL(`index.html#/go/${code}`);
}

/** Inject CSS into a specific tab */
async function injectCss(tabId: number, css: string): Promise<void> {
    try {
        await browser.scripting.insertCSS({
            target: { tabId },
            css,
        });
    } catch (err) {
        // Tab might have navigated away or be a restricted page
        console.warn(`[TERIN] Failed to inject CSS into tab ${tabId}:`, err);
    }
}

/** Remove previously injected CSS from a tab */
async function removeCss(tabId: number, css: string): Promise<void> {
    try {
        await browser.scripting.removeCSS({
            target: { tabId },
            css,
        });
    } catch (err) {
        console.warn(`[TERIN] Failed to remove CSS from tab ${tabId}:`, err);
    }
}

// ---- Tab update listener ----
// When a tab finishes loading, check if its hostname has an active CSS override.

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;

    const hostname = extractHostname(tab.url);
    if (!hostname) return;

    const overrides = await getOverrides();
    const override = overrides[hostname];

    if (override && override.enabled) {
        await injectCss(tabId, override.css);
    }
});

// ---- Message listener ----
// Handle messages from content scripts and dashboard page.

browser.runtime.onMessage.addListener(
    async (rawMessage: unknown, sender: browser.Runtime.MessageSender) => {
        const message = rawMessage as ExtensionMessage;

        if (message.type === MSG_TOGGLE_DARK_MODE) {
            const { hostname } = message;
            const overrides = await getOverrides();
            const existing = overrides[hostname];

            const tabId = sender.tab?.id;

            if (existing) {
                // Toggle the existing override
                const nowEnabled = !existing.enabled;
                overrides[hostname] = { ...existing, enabled: nowEnabled };
                await saveOverrides(overrides);

                if (tabId) {
                    if (nowEnabled) {
                        await injectCss(tabId, existing.css);
                    } else {
                        await removeCss(tabId, existing.css);
                    }
                }

                return { toggled: true, enabled: nowEnabled };
            } else {
                // Create a new override with the default dark CSS
                overrides[hostname] = {
                    hostname,
                    css: DEFAULT_DARK_CSS,
                    enabled: true,
                };
                await saveOverrides(overrides);

                if (tabId) {
                    await injectCss(tabId, DEFAULT_DARK_CSS);
                }

                return { toggled: true, enabled: true };
            }
        }

        if (message.type === MSG_GET_STATUS) {
            const { hostname } = message;
            const overrides = await getOverrides();
            const existing = overrides[hostname];
            return { enabled: existing?.enabled ?? false };
        }

        // ---- Bookmark handlers ----

        if (message.type === MSG_ADD_BOOKMARK) {
            const { url, title, favicon } = message;
            const bookmarks = await getBookmarks();

            // Check if already bookmarked (by URL)
            const existing = Object.values(bookmarks).find((b) => b.url === url);
            if (existing) {
                return { added: false, existing: true, id: existing.id };
            }

            // Ensure default folder exists
            const folders = await getFolders();
            if (!folders["uncategorized"]) {
                folders["uncategorized"] = {
                    id: "uncategorized",
                    name: "Uncategorized",
                    createdAt: 0,
                };
                await browser.storage.local.set({ [FOLDERS_KEY]: folders });
            }

            const bookmark: Bookmark = {
                id: crypto.randomUUID(),
                title: title || url,
                url,
                favicon,
                folderId: "uncategorized",
                createdAt: Date.now(),
            };

            bookmarks[bookmark.id] = bookmark;
            await saveBookmarks(bookmarks);

            return { added: true, id: bookmark.id };
        }

        if (message.type === MSG_GET_BOOKMARK_STATUS) {
            const { url } = message;
            const bookmarks = await getBookmarks();
            const exists = Object.values(bookmarks).some((b) => b.url === url);
            return { bookmarked: exists };
        }

        // ---- URL Shortener handlers ----

        if (message.type === MSG_SHORTEN_URL) {
            const { url, title } = message;
            const shortUrls = await getShortUrls();

            // Check if URL is already shortened
            const existing = Object.values(shortUrls).find((s) => s.originalUrl === url);
            if (existing) {
                return {
                    shortened: true,
                    alreadyExisted: true,
                    code: existing.code,
                    shortUrl: buildRedirectUrl(existing.code),
                    id: existing.id,
                };
            }

            // Generate a unique code
            const existingCodes = new Set(Object.values(shortUrls).map((s) => s.code));
            let code = generateCode();
            while (existingCodes.has(code)) {
                code = generateCode();
            }

            const shortUrl: ShortUrl = {
                id: crypto.randomUUID(),
                code,
                originalUrl: url,
                title: title || url,
                createdAt: Date.now(),
            };

            shortUrls[shortUrl.id] = shortUrl;
            await saveShortUrls(shortUrls);

            return {
                shortened: true,
                alreadyExisted: false,
                code,
                shortUrl: buildRedirectUrl(code),
                id: shortUrl.id,
            };
        }

        if (message.type === MSG_GET_SHORT_URL_STATUS) {
            const { url } = message;
            const shortUrls = await getShortUrls();
            const existing = Object.values(shortUrls).find((s) => s.originalUrl === url);
            return {
                shortened: !!existing,
                code: existing?.code ?? null,
                shortUrl: existing ? buildRedirectUrl(existing.code) : null,
            };
        }

        return undefined;
    },
);

// ---- Toolbar icon click → open dashboard ----
browser.action.onClicked.addListener(() => {
    const dashboardUrl = browser.runtime.getURL("index.html");
    browser.tabs.create({ url: dashboardUrl });
});

// Log that the service worker has started
console.log("[TERIN] Background service worker started.");
