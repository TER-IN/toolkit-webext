// ============================================
// TERIN Toolkit — File System Sync Manager
// ============================================
// Manages the File System Access API for auto-syncing JSON data.

import { StorageManager } from "./storage";
import { idb } from "./idb";

const SYNC_HANDLE_KEY = "sync_folder_handle";
const SYNC_FILENAME = "terin_sync.json";

export type SyncState = "disconnected" | "requires_permission" | "connected";

/** File System Access API interfaces (partial) */
interface FileSystemHandle {
    kind: "file" | "directory";
    name: string;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
}

export class FsSyncManager {
    /** Prompt the user to select a local directory */
    static async selectSyncFolder(): Promise<void> {
        if (!("showDirectoryPicker" in window)) {
            throw new Error("File System Access API is not supported in this browser. Try Chrome or Edge, or adjust your Brave Shields/Privacy settings.");
        }

        try {
            // @ts-expect-error: window.showDirectoryPicker is available in Chromium
            const handle = await window.showDirectoryPicker({
                mode: "readwrite",
                id: "terin_sync_folder",
            });
            await idb.set(SYNC_HANDLE_KEY, handle);
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                console.error("Failed to select sync folder:", err);
                throw err;
            }
            // If it's an AbortError (user cancelled), throw a specific silent error so the UI knows not to alert
            throw new Error("ABORTED");
        }
    }

    /** Remove the stored directory handle */
    static async disconnect(): Promise<void> {
        await idb.delete(SYNC_HANDLE_KEY);
    }

    /** Retrieve the stored handle, if any */
    private static async getHandle(): Promise<FileSystemDirectoryHandle | undefined> {
        return idb.get<FileSystemDirectoryHandle>(SYNC_HANDLE_KEY);
    }

    /** 
     * Verify we have readwrite permission for the handle.
     * Chromium drops this across browser restarts so users must re-prompt.
     */
    static async verifyPermission(promptUser = false): Promise<SyncState> {
        const handle = await this.getHandle();
        if (!handle) return "disconnected";

        try {
            // @ts-expect-error: queryPermission exists on handle in Chromium
            const state = await handle.queryPermission({ mode: "readwrite" });
            if (state === "granted") return "connected";

            if (promptUser) {
                // @ts-expect-error: requestPermission exists on handle in Chromium
                const newRequest = await handle.requestPermission({ mode: "readwrite" });
                return newRequest === "granted" ? "connected" : "requires_permission";
            }

            return "requires_permission";
        } catch (err) {
            console.error("Permission check failed:", err);
            return "disconnected"; // Handle might be stale
        }
    }

    /**
     * Read the sync file from disk, merge it into browser.storage.local,
     * and overwrite the file with the merged state.
     */
    static async syncNow(): Promise<void> {
        const state = await this.verifyPermission(false);
        if (state !== "connected") return;

        const dirHandle = await this.getHandle();
        if (!dirHandle) return;

        try {
            let fileText = "";
            let fileExisted = false;

            try {
                const fileHandle = await dirHandle.getFileHandle(SYNC_FILENAME);
                const file = await fileHandle.getFile();
                fileText = await file.text();
                fileExisted = true;
            } catch (err) {
                // File doesn't exist yet, that's fine.
            }

            if (fileExisted && fileText.trim()) {
                try {
                    const payload = JSON.parse(fileText);
                    // Merge strategy will unite items. Imported wins on ID collision.
                    await StorageManager.importAll(payload, "merge");
                } catch (e) {
                    console.error("Corrupt sync file, skipping merge:", e);
                }
            }

            // Immediately rewrite the file with our current (now merged) state
            await this.pushLocalChanges();
        } catch (err) {
            console.error("syncNow failed:", err);
            throw err;
        }
    }

    /**
     * Serialize the current browser.storage.local state and write to the file.
     */
    static async pushLocalChanges(): Promise<void> {
        const state = await this.verifyPermission(false);
        if (state !== "connected") return;

        const dirHandle = await this.getHandle();
        if (!dirHandle) return;

        try {
            const data = await StorageManager.exportAll();
            const payloadString = JSON.stringify(data, null, 2);

            const fileHandle = await dirHandle.getFileHandle(SYNC_FILENAME, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(payloadString);
            await writable.close();

            // Mark last sync time
            await StorageManager.set("last_sync_time", Date.now());
        } catch (err) {
            console.error("pushLocalChanges failed:", err);
        }
    }
}
