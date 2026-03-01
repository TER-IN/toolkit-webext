// ============================================
// TERIN Toolkit — URL Shortener Zustand Store
// ============================================
// Manages the state for shortened URLs.
// Persists to browser.storage.local via StorageManager.

import { create } from "zustand";
import type { ShortUrl, ShortUrlsMap } from "@/types";
import { StorageManager } from "@/lib/storage";

const SHORT_URLS_KEY = "short_urls";

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

/** Generate a UUID v4 */
function uuid(): string {
    return crypto.randomUUID();
}

interface UrlShortenerState {
    shortUrls: ShortUrlsMap;
    /** Whether the initial load from storage has completed */
    loaded: boolean;

    // ---- Actions ----
    /** Load all short URLs from persistent storage */
    loadFromStorage: () => Promise<void>;
    /** Add a new short URL entry. Optionally supply a custom code. */
    addShortUrl: (
        data: Pick<ShortUrl, "originalUrl" | "title"> & { code?: string },
    ) => Promise<ShortUrl>;
    /** Remove a short URL by id */
    removeShortUrl: (id: string) => Promise<void>;
    /** Update mutable fields (title, originalUrl) of a short URL */
    updateShortUrl: (
        id: string,
        updates: Partial<Pick<ShortUrl, "title" | "originalUrl">>,
    ) => Promise<void>;
    /** Find a short URL by its code */
    findByCode: (code: string) => ShortUrl | undefined;
    /** Find a short URL by original URL */
    findByOriginalUrl: (url: string) => ShortUrl | undefined;
}

async function persistShortUrls(shortUrls: ShortUrlsMap): Promise<void> {
    await StorageManager.set(SHORT_URLS_KEY, shortUrls);
}

export const useUrlShortenerStore = create<UrlShortenerState>()((set, get) => ({
    shortUrls: {},
    loaded: false,

    loadFromStorage: async () => {
        const shortUrls = await StorageManager.get<ShortUrlsMap>(SHORT_URLS_KEY, {});
        set({ shortUrls, loaded: true });
    },

    addShortUrl: async (data) => {
        const existing = get().shortUrls;

        // Generate a unique code (handle collisions)
        const existingCodes = new Set(Object.values(existing).map((s) => s.code));
        let code = data.code?.trim() || generateCode();
        while (existingCodes.has(code)) {
            code = generateCode();
        }

        const shortUrl: ShortUrl = {
            id: uuid(),
            code,
            originalUrl: data.originalUrl,
            title: data.title || data.originalUrl,
            createdAt: Date.now(),
        };

        const next = { ...existing, [shortUrl.id]: shortUrl };
        set({ shortUrls: next });
        await persistShortUrls(next);
        return shortUrl;
    },

    removeShortUrl: async (id) => {
        const next = { ...get().shortUrls };
        delete next[id];
        set({ shortUrls: next });
        await persistShortUrls(next);
    },

    updateShortUrl: async (id, updates) => {
        const current = get().shortUrls[id];
        if (!current) return;
        const next = {
            ...get().shortUrls,
            [id]: { ...current, ...updates },
        };
        set({ shortUrls: next });
        await persistShortUrls(next);
    },

    findByCode: (code) => {
        return Object.values(get().shortUrls).find((s) => s.code === code);
    },

    findByOriginalUrl: (url) => {
        return Object.values(get().shortUrls).find((s) => s.originalUrl === url);
    },
}));
