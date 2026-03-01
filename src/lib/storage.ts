// ============================================
// TERIN Toolkit — Storage Manager
// ============================================
// Thin wrapper over browser.storage.local.
// Designed so we can swap in File System Access API syncing later
// without changing consumer code.

import browser from "webextension-polyfill";

const STORAGE_KEY_PREFIX = "terin_";

/**
 * Generic storage manager using the browser extension storage API.
 *
 * All keys are prefixed with "terin_" to avoid collisions.
 * Methods are async and Promise-based for cross-browser compat.
 */
export class StorageManager {
    /** Build the prefixed key */
    private static key(name: string): string {
        return `${STORAGE_KEY_PREFIX}${name}`;
    }

    /**
     * Retrieve a value from storage.
     * Returns `defaultValue` if the key doesn't exist.
     */
    static async get<T>(name: string, defaultValue: T): Promise<T> {
        const key = StorageManager.key(name);
        const result = await browser.storage.local.get(key);
        return (result[key] as T) ?? defaultValue;
    }

    /**
     * Persist a value to storage.
     */
    static async set<T>(name: string, value: T): Promise<void> {
        const key = StorageManager.key(name);
        await browser.storage.local.set({ [key]: value });
    }

    /**
     * Remove a key from storage.
     */
    static async remove(name: string): Promise<void> {
        const key = StorageManager.key(name);
        await browser.storage.local.remove(key);
    }

    /**
     * Listen for changes to a specific key.
     * Returns an unsubscribe function.
     */
    static onChange<T>(
        name: string,
        callback: (newValue: T | undefined) => void,
    ): () => void {
        const key = StorageManager.key(name);
        const listener = (
            changes: Record<string, browser.Storage.StorageChange>,
        ) => {
            if (key in changes) {
                callback(changes[key].newValue as T | undefined);
            }
        };
        browser.storage.local.onChanged.addListener(listener);
        return () => browser.storage.local.onChanged.removeListener(listener);
    }

    /**
     * Export all data managed by StorageManager.
     */
    static async exportAll(): Promise<ExportPayload> {
        const allData = await browser.storage.local.get(null);
        const pluginData: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(allData)) {
            if (key.startsWith(STORAGE_KEY_PREFIX)) {
                // Strip the prefix for the export payload
                const cleanKey = key.slice(STORAGE_KEY_PREFIX.length);
                pluginData[cleanKey] = value;
            }
        }

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: pluginData,
        };
    }

    /**
     * Import data with a specified merge strategy.
     */
    static async importAll(payload: ExportPayload, strategy: ImportStrategy): Promise<void> {
        if (!payload || !payload.data) {
            throw new Error("Invalid export payload");
        }

        const allData = await browser.storage.local.get(null);

        if (strategy === "replace") {
            // Remove all existing terin_* keys
            const keysToRemove = Object.keys(allData).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
            if (keysToRemove.length > 0) {
                await browser.storage.local.remove(keysToRemove);
            }

            // Set the new keys
            const newStorage: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(payload.data)) {
                newStorage[StorageManager.key(key)] = value;
            }
            if (Object.keys(newStorage).length > 0) {
                await browser.storage.local.set(newStorage);
            }
        } else if (strategy === "merge") {
            // For each key in payload, merge with existing (if any)
            const updates: Record<string, unknown> = {};

            for (const [key, importedValue] of Object.entries(payload.data)) {
                const storageKey = StorageManager.key(key);
                const existingValue = allData[storageKey];

                // Assuming all our top-level data are objects/maps (e.g., Record<string, Bookmark>)
                if (
                    typeof existingValue === "object" && existingValue !== null && !Array.isArray(existingValue) &&
                    typeof importedValue === "object" && importedValue !== null && !Array.isArray(importedValue)
                ) {
                    updates[storageKey] = { ...existingValue, ...(importedValue as Record<string, unknown>) };
                } else {
                    // Fallback to overwrite if not a plain object or doesn't exist yet
                    updates[storageKey] = importedValue;
                }
            }

            if (Object.keys(updates).length > 0) {
                await browser.storage.local.set(updates);
            }
        }
    }
}

export interface ExportPayload {
    version: number;
    exportedAt: string;
    data: Record<string, unknown>;
}

export type ImportStrategy = "replace" | "merge";
