// ============================================
// TERIN Toolkit — Bookmarks Zustand Store
// ============================================
// Manages the state for bookmarks and bookmark folders.
// Persists to browser.storage.local via StorageManager.

import { create } from "zustand";
import type { Bookmark, BookmarksMap, BookmarkFolder, BookmarkFoldersMap } from "@/types";
import { StorageManager } from "@/lib/storage";

const BOOKMARKS_KEY = "bookmarks";
const FOLDERS_KEY = "bookmark_folders";

/** The default folder that always exists */
export const DEFAULT_FOLDER: BookmarkFolder = {
    id: "uncategorized",
    name: "Uncategorized",
    createdAt: 0,
};

/** Generate a simple UUID v4 */
function uuid(): string {
    return crypto.randomUUID();
}

interface BookmarkState {
    bookmarks: BookmarksMap;
    folders: BookmarkFoldersMap;
    /** Whether the initial load from storage has completed */
    loaded: boolean;

    // ---- Actions ----
    /** Load all bookmarks and folders from persistent storage */
    loadFromStorage: () => Promise<void>;
    /** Add a new bookmark */
    addBookmark: (data: Omit<Bookmark, "id" | "createdAt">) => Promise<Bookmark>;
    /** Remove a bookmark by id */
    removeBookmark: (id: string) => Promise<void>;
    /** Update a bookmark's mutable fields (title, url, folderId) */
    updateBookmark: (id: string, updates: Partial<Pick<Bookmark, "title" | "url" | "folderId">>) => Promise<void>;
    /** Move a bookmark to a different folder */
    moveBookmark: (id: string, folderId: string) => Promise<void>;
    /** Add a new folder */
    addFolder: (name: string, parentId?: string) => Promise<BookmarkFolder>;
    /** Remove a folder (all its subfolders are removed, and all their bookmarks move to "uncategorized") */
    removeFolder: (id: string) => Promise<void>;
    /** Rename a folder */
    renameFolder: (id: string, newName: string) => Promise<void>;
    /** Move a folder to a different parent folder */
    moveFolder: (folderId: string, newParentId?: string) => Promise<void>;
}

async function persistBookmarks(bookmarks: BookmarksMap): Promise<void> {
    await StorageManager.set(BOOKMARKS_KEY, bookmarks);
}

async function persistFolders(folders: BookmarkFoldersMap): Promise<void> {
    await StorageManager.set(FOLDERS_KEY, folders);
}

export const useBookmarkStore = create<BookmarkState>()((set, get) => ({
    bookmarks: {},
    folders: { [DEFAULT_FOLDER.id]: DEFAULT_FOLDER },
    loaded: false,

    loadFromStorage: async () => {
        const [bookmarks, folders] = await Promise.all([
            StorageManager.get<BookmarksMap>(BOOKMARKS_KEY, {}),
            StorageManager.get<BookmarkFoldersMap>(FOLDERS_KEY, {
                [DEFAULT_FOLDER.id]: DEFAULT_FOLDER,
            }),
        ]);
        // Ensure the default folder always exists
        if (!folders[DEFAULT_FOLDER.id]) {
            folders[DEFAULT_FOLDER.id] = DEFAULT_FOLDER;
        }
        set({ bookmarks, folders, loaded: true });
    },

    addBookmark: async (data) => {
        const bookmark: Bookmark = {
            ...data,
            id: uuid(),
            createdAt: Date.now(),
        };
        const next = { ...get().bookmarks, [bookmark.id]: bookmark };
        set({ bookmarks: next });
        await persistBookmarks(next);
        return bookmark;
    },

    removeBookmark: async (id) => {
        const next = { ...get().bookmarks };
        delete next[id];
        set({ bookmarks: next });
        await persistBookmarks(next);
    },

    updateBookmark: async (id, updates) => {
        const current = get().bookmarks[id];
        if (!current) return;
        const next = {
            ...get().bookmarks,
            [id]: { ...current, ...updates },
        };
        set({ bookmarks: next });
        await persistBookmarks(next);
    },

    moveBookmark: async (id, folderId) => {
        const current = get().bookmarks[id];
        if (!current) return;
        const next = {
            ...get().bookmarks,
            [id]: { ...current, folderId },
        };
        set({ bookmarks: next });
        await persistBookmarks(next);
    },

    addFolder: async (name, parentId) => {
        // Prevent identically named folders in the same parent
        const isDuplicate = Object.values(get().folders).some(
            (f) => f.name.toLowerCase() === name.toLowerCase() && f.parentId === parentId
        );
        if (isDuplicate) {
            // Ideally we'd throw an error or alert, but silently returning keeps existing signature simple.
            throw new Error(`A folder named "${name}" already exists in this location.`);
        }

        const folder: BookmarkFolder = {
            id: uuid(),
            name,
            parentId,
            createdAt: Date.now(),
        };
        const next = { ...get().folders, [folder.id]: folder };
        set({ folders: next });
        await persistFolders(next);
        return folder;
    },

    removeFolder: async (id) => {
        // Cannot delete the default folder
        if (id === DEFAULT_FOLDER.id) return;

        const folders = { ...get().folders };

        // Find all descendant folders recursively
        const idsToDelete = new Set<string>([id]);
        let addedNew;
        do {
            addedNew = false;
            for (const f of Object.values(folders)) {
                if (f.parentId && idsToDelete.has(f.parentId) && !idsToDelete.has(f.id)) {
                    idsToDelete.add(f.id);
                    addedNew = true;
                }
            }
        } while (addedNew);

        // Move all bookmarks in ANY of the deleted folders to "uncategorized"
        const bookmarks = { ...get().bookmarks };
        for (const key of Object.keys(bookmarks)) {
            if (idsToDelete.has(bookmarks[key].folderId)) {
                bookmarks[key] = { ...bookmarks[key], folderId: DEFAULT_FOLDER.id };
            }
        }

        // Delete the folders
        for (const deleteId of idsToDelete) {
            delete folders[deleteId];
        }

        set({ bookmarks, folders });
        await Promise.all([persistBookmarks(bookmarks), persistFolders(folders)]);
    },

    renameFolder: async (id, newName) => {
        if (id === DEFAULT_FOLDER.id) return;
        const current = get().folders[id];
        if (!current) return;

        // Prevent identically named siblings
        const isDuplicate = Object.values(get().folders).some(
            (f) => f.id !== id && f.name.toLowerCase() === newName.toLowerCase() && f.parentId === current.parentId
        );
        if (isDuplicate) {
            throw new Error(`A folder named "${newName}" already exists in this location.`);
        }

        const next = {
            ...get().folders,
            [id]: { ...current, name: newName },
        };
        set({ folders: next });
        await persistFolders(next);
    },

    moveFolder: async (folderId, newParentId) => {
        if (folderId === DEFAULT_FOLDER.id) return; // Cannot move default folder
        if (folderId === newParentId) return; // Cannot move into itself

        const folders = get().folders;
        const current = folders[folderId];
        if (!current) return;

        // Prevent identically named siblings in the NEW parent location
        const isDuplicate = Object.values(folders).some(
            (f) => f.id !== folderId && f.name.toLowerCase() === current.name.toLowerCase() && f.parentId === newParentId
        );
        if (isDuplicate) {
            throw new Error(`A folder named "${current.name}" already exists in the destination location.`);
        }

        // Cycle check: Ensure newParentId is not a descendant of folderId
        if (newParentId) {
            let currentAncestorId: string | undefined = newParentId;
            while (currentAncestorId) {
                if (currentAncestorId === folderId) {
                    // newParentId is technically inside folderId. Cancel move to prevent cycles.
                    return;
                }
                const parentNode: BookmarkFolder | undefined = folders[currentAncestorId];
                if (!parentNode) break;
                currentAncestorId = parentNode.parentId;
            }
        }

        const next = {
            ...folders,
            [folderId]: { ...current, parentId: newParentId },
        };
        set({ folders: next });
        await persistFolders(next);
    }
}));
