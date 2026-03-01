// ============================================
// TERIN Toolkit — Shared Type Definitions
// ============================================

/**
 * Represents a per-domain CSS override rule.
 */
export interface CssOverride {
    /** The hostname this override applies to, e.g. "github.com" */
    hostname: string;
    /** The raw CSS string to inject */
    css: string;
    /** Whether this override is currently active */
    enabled: boolean;
}

/**
 * Shape of the cssOverrides data stored in browser.storage.local.
 * Keyed by hostname for O(1) lookup.
 */
export type CssOverridesMap = Record<string, CssOverride>;

// ---- Bookmark types ----

/**
 * Represents a single saved bookmark.
 */
export interface Bookmark {
    /** Unique identifier (UUID) */
    id: string;
    /** Page title */
    title: string;
    /** Full URL */
    url: string;
    /** Favicon URL (optional, best-effort) */
    favicon?: string;
    /** ID of the folder this bookmark belongs to */
    folderId: string;
    /** Unix timestamp (ms) when the bookmark was created */
    createdAt: number;
}

/**
 * Represents a bookmark folder for organising bookmarks.
 */
export interface BookmarkFolder {
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** ID of the parent folder (for nesting) */
    parentId?: string;
    /** Unix timestamp (ms) when the folder was created */
    createdAt: number;
}

/** All bookmarks, keyed by bookmark.id */
export type BookmarksMap = Record<string, Bookmark>;

/** All bookmark folders, keyed by folder.id */
export type BookmarkFoldersMap = Record<string, BookmarkFolder>;

// ---- Short URL types ----

/**
 * Represents a shortened URL entry.
 */
export interface ShortUrl {
    /** Unique identifier (UUID) */
    id: string;
    /** 6-char alphanumeric short code (unique) */
    code: string;
    /** The original full URL */
    originalUrl: string;
    /** Display title (page title or user-supplied label) */
    title: string;
    /** Unix timestamp (ms) when the short URL was created */
    createdAt: number;
}

/** All short URLs, keyed by short URL id */
export type ShortUrlsMap = Record<string, ShortUrl>;

// ---- Message types for background <-> content script communication ----

export const MSG_TOGGLE_DARK_MODE = "TOGGLE_DARK_MODE" as const;
export const MSG_REMOVE_CSS = "REMOVE_CSS" as const;
export const MSG_INJECT_CSS = "INJECT_CSS" as const;
export const MSG_GET_STATUS = "GET_DARK_MODE_STATUS" as const;
export const MSG_ADD_BOOKMARK = "ADD_BOOKMARK" as const;
export const MSG_GET_BOOKMARK_STATUS = "GET_BOOKMARK_STATUS" as const;
export const MSG_SHORTEN_URL = "SHORTEN_URL" as const;
export const MSG_GET_SHORT_URL_STATUS = "GET_SHORT_URL_STATUS" as const;

export interface ToggleDarkModeMessage {
    type: typeof MSG_TOGGLE_DARK_MODE;
    hostname: string;
}

export interface RemoveCssMessage {
    type: typeof MSG_REMOVE_CSS;
    hostname: string;
}

export interface InjectCssMessage {
    type: typeof MSG_INJECT_CSS;
    hostname: string;
    css: string;
}

export interface GetStatusMessage {
    type: typeof MSG_GET_STATUS;
    hostname: string;
}

export interface AddBookmarkMessage {
    type: typeof MSG_ADD_BOOKMARK;
    url: string;
    title: string;
    favicon?: string;
}

export interface GetBookmarkStatusMessage {
    type: typeof MSG_GET_BOOKMARK_STATUS;
    url: string;
}

export interface ShortenUrlMessage {
    type: typeof MSG_SHORTEN_URL;
    url: string;
    title: string;
}

export interface GetShortUrlStatusMessage {
    type: typeof MSG_GET_SHORT_URL_STATUS;
    url: string;
}

export type ExtensionMessage =
    | ToggleDarkModeMessage
    | RemoveCssMessage
    | InjectCssMessage
    | GetStatusMessage
    | AddBookmarkMessage
    | GetBookmarkStatusMessage
    | ShortenUrlMessage
    | GetShortUrlStatusMessage;
