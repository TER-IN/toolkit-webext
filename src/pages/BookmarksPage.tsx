// ============================================
// TERIN Toolkit — Bookmarks Dashboard Page
// ============================================
// Full bookmark management: search, folder sidebar, CRUD operations,
// edit/move/delete dialogs.

import { useEffect, useState, useMemo } from "react";
import {
    Bookmark as BookmarkIcon,
    FolderPlus,
    Plus,
    Pencil,
    Trash2,
    FolderInput,
    Search,
    ExternalLink,
    Globe,
    Star,
    ArrowDownAZ,
    ArrowUpZA,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useBookmarkStore, DEFAULT_FOLDER } from "@/stores/useBookmarkStore";
import type { Bookmark } from "@/types";

export function BookmarksPage() {
    const {
        loaded,
        loadFromStorage,
        folders,
        addFolder,
        removeFolder,
        renameFolder,
        moveFolder,
        bookmarks,
        addBookmark,
        removeBookmark,
        updateBookmark,
        moveBookmark
    } = useBookmarkStore();

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    // Search & Sort states
    const [searchQuery, setSearchQuery] = useState("");
    const [folderSearchQuery, setFolderSearchQuery] = useState("");
    const [folderSortMode, setFolderSortMode] = useState<"asc" | "desc">("asc");

    // Drag and Drop folder state
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    // Add bookmark dialog
    const [showAddBookmark, setShowAddBookmark] = useState(false);
    const [newBookmarkTitle, setNewBookmarkTitle] = useState("");
    const [newBookmarkUrl, setNewBookmarkUrl] = useState("");
    const [newBookmarkFolder, setNewBookmarkFolder] = useState(DEFAULT_FOLDER.id);

    // Edit bookmark dialog
    const [editTarget, setEditTarget] = useState<Bookmark | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editUrl, setEditUrl] = useState("");
    const [editFolder, setEditFolder] = useState("");

    // Move bookmark dialog
    const [moveTarget, setMoveTarget] = useState<Bookmark | null>(null);
    const [moveBookmarkFolderId, setMoveBookmarkFolderId] = useState("");

    // Add folder dialog
    const [showAddFolder, setShowAddFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newFolderParentId, setNewFolderParentId] = useState<string>("none");

    // Rename folder dialog
    const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
    const [renameFolderName, setRenameFolderName] = useState("");

    // ---- Load data on mount ----
    useEffect(() => {
        if (!loaded) {
            loadFromStorage();
        }
    }, [loaded, loadFromStorage]);

    // ---- Derived data ----
    const folderList = useMemo(() => Object.values(folders), [folders]);

    /** Build an indented flat list of folders to display correct hierarchy */
    const hierarchicalFolders = useMemo(() => {
        const result: Array<{ folder: typeof folders[string]; depth: number; pathName: string }> = [];
        const built = new Set<string>();

        function addChildren(parentId: string | undefined, depth: number, parentPathName: string) {
            let children = folderList.filter((f) => f.id !== DEFAULT_FOLDER.id && f.parentId === parentId);

            if (folderSortMode === "asc") {
                children.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                children.sort((a, b) => b.name.localeCompare(a.name));
            }

            for (const child of children) {
                if (!built.has(child.id)) {
                    built.add(child.id);
                    const pathName = parentPathName ? `${parentPathName} > ${child.name}` : child.name;
                    result.push({ folder: child, depth, pathName });
                    addChildren(child.id, depth + 1, pathName);
                }
            }
        }

        // Add default folder first
        result.push({ folder: DEFAULT_FOLDER, depth: 0, pathName: DEFAULT_FOLDER.name });
        built.add(DEFAULT_FOLDER.id);

        addChildren(undefined, 0, "");

        // Catch any orphans (shouldn't happen, but safe fallback)
        for (const f of folderList) {
            if (!built.has(f.id)) {
                result.push({ folder: f, depth: 0, pathName: f.name });
                built.add(f.id);
            }
        }

        return result;
    }, [folderList, folderSortMode]);

    const filteredSidebarFolders = useMemo(() => {
        if (!folderSearchQuery.trim()) return hierarchicalFolders;
        const q = folderSearchQuery.toLowerCase();
        // Always show the default folder
        return hierarchicalFolders.filter((item) =>
            item.folder.id === DEFAULT_FOLDER.id ||
            item.folder.name.toLowerCase().includes(q)
        );
    }, [hierarchicalFolders, folderSearchQuery]);

    const allBookmarks = useMemo(() => Object.values(bookmarks), [bookmarks]);

    const filteredBookmarks = useMemo(() => {
        let list = allBookmarks;

        // Filter by folder
        if (selectedFolderId) {
            list = list.filter((b) => b.folderId === selectedFolderId);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (b) =>
                    b.title.toLowerCase().includes(q) ||
                    b.url.toLowerCase().includes(q),
            );
        }

        // Sort by createdAt descending (newest first)
        return list.sort((a, b) => b.createdAt - a.createdAt);
    }, [allBookmarks, selectedFolderId, searchQuery]);

    /** Count bookmarks in a folder */
    function folderCount(folderId: string): number {
        return allBookmarks.filter((b) => b.folderId === folderId).length;
    }

    // ---- Handlers ----

    async function handleAddBookmark() {
        const url = newBookmarkUrl.trim();
        if (!url) return;
        // Simple URL validation
        try {
            new URL(url);
        } catch {
            return;
        }

        // Try to get favicon from Google API
        let hostname = "";
        try {
            hostname = new URL(url).hostname;
        } catch { /* skip */ }
        const favicon = hostname
            ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
            : undefined;

        await addBookmark({
            title: newBookmarkTitle.trim() || url,
            url,
            favicon,
            folderId: newBookmarkFolder,
        });
        setNewBookmarkTitle("");
        setNewBookmarkUrl("");
        setNewBookmarkFolder(DEFAULT_FOLDER.id);
        setShowAddBookmark(false);
    }

    function handleOpenEdit(bookmark: Bookmark) {
        setEditTarget(bookmark);
        setEditTitle(bookmark.title);
        setEditUrl(bookmark.url);
        setEditFolder(bookmark.folderId);
    }

    async function handleSaveEdit() {
        if (!editTarget) return;
        await updateBookmark(editTarget.id, {
            title: editTitle.trim() || editTarget.url,
            url: editUrl.trim() || editTarget.url,
            folderId: editFolder,
        });
        setEditTarget(null);
    }

    function handleOpenMove(bookmark: Bookmark) {
        setMoveTarget(bookmark);
        setMoveBookmarkFolderId(bookmark.folderId);
    }

    const handleMoveBookmark = async () => {
        if (!moveTarget || !moveBookmarkFolderId) return;
        await moveBookmark(moveTarget.id, moveBookmarkFolderId);
        setMoveTarget(null);
        setMoveBookmarkFolderId("");
    };

    async function handleAddFolder() {
        const name = newFolderName.trim();
        if (!name) return;
        try {
            await addFolder(name, newFolderParentId === "none" ? undefined : newFolderParentId);
            setNewFolderName("");
            setNewFolderParentId("none");
            setShowAddFolder(false);
        } catch (e: any) {
            alert(e.message);
        }
    }

    async function handleRenameFolder() {
        if (!renameFolderId) return;
        const name = renameFolderName.trim();
        if (!name) return;
        try {
            await renameFolder(renameFolderId, name);
            setRenameFolderId(null);
            setRenameFolderName("");
        } catch (e: any) {
            alert(e.message);
        }
    }

    async function handleDeleteFolder(folderId: string) {
        if (folderId === DEFAULT_FOLDER.id) return;
        await removeFolder(folderId);
        if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
        }
    }

    /** Format a Unix timestamp to a readable date */
    function formatDate(ts: number): string {
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }

    /** Truncate a URL for display */
    function truncateUrl(url: string, max = 50): string {
        try {
            const parsed = new URL(url);
            const display = parsed.hostname + parsed.pathname;
            return display.length > max ? display.slice(0, max) + "…" : display;
        } catch {
            return url.length > max ? url.slice(0, max) + "…" : url;
        }
    }

    return (
        <TooltipProvider>
            <div className="flex h-full gap-6">
                {/* ---- Folder Sidebar ---- */}
                <div className="flex w-56 flex-col shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Folders
                        </h2>
                        <div className="flex gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setFolderSortMode(prev => prev === "asc" ? "desc" : "asc")}
                                    >
                                        {folderSortMode === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpZA className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Toggle Sort</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setShowAddFolder(true)}
                                    >
                                        <FolderPlus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>New Folder</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                        <Input
                            placeholder="Find folder..."
                            value={folderSearchQuery}
                            onChange={(e) => setFolderSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <ScrollArea className="flex-1 -mx-1">
                        <div className="space-y-0.5 px-1">
                            {/* "All" tab */}
                            <button
                                onClick={() => setSelectedFolderId(null)}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOverFolderId("top-level");
                                }}
                                onDragLeave={() => setDragOverFolderId(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const draggedId = e.dataTransfer.getData("folderId");
                                    setDragOverFolderId(null);
                                    if (draggedId) moveFolder(draggedId, undefined);
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${dragOverFolderId === "top-level" ? "ring-2 ring-primary" : ""
                                    } ${selectedFolderId === null
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Star className="h-4 w-4" />
                                    All Bookmarks
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {allBookmarks.length}
                                </Badge>
                            </button>

                            <Separator className="my-2" />

                            {filteredSidebarFolders.map(({ folder, depth }) => {
                                // Default folder doesn't get indented or shown in dropdowns differently, 
                                // but we skip it here because it's already rendered above the separator
                                if (folder.id === DEFAULT_FOLDER.id) return null;

                                return (
                                    <div
                                        key={folder.id}
                                        className={cn(
                                            "group relative flex items-center rounded-lg transition-all",
                                            dragOverFolderId === folder.id && "ring-2 ring-primary bg-sidebar-accent/50"
                                        )}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("folderId", folder.id);
                                            e.dataTransfer.effectAllowed = "move";
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault(); // Necessary to allow dropping
                                            e.dataTransfer.dropEffect = "move";
                                            if (dragOverFolderId !== folder.id) {
                                                setDragOverFolderId(folder.id);
                                            }
                                        }}
                                        onDragLeave={(e) => {
                                            // Only unset if we are actually leaving the row, not just over a child element
                                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                                setDragOverFolderId(null);
                                            }
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            const draggedId = e.dataTransfer.getData("folderId");
                                            setDragOverFolderId(null);
                                            if (draggedId && draggedId !== folder.id) {
                                                try {
                                                    await moveFolder(draggedId, folder.id);
                                                } catch (err: any) {
                                                    alert(err.message);
                                                }
                                            }
                                        }}
                                    >
                                        <button
                                            onClick={() => setSelectedFolderId(folder.id)}
                                            style={{ paddingLeft: `${depth * 1}rem` }}
                                            className={cn(
                                                "flex-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none w-full",
                                                selectedFolderId === folder.id
                                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                    : "text-muted-foreground group-hover:bg-sidebar-accent/50 group-hover:text-sidebar-accent-foreground"
                                            )}
                                        >
                                            <span className="flex items-center gap-2 truncate ps-2 pr-6">
                                                <BookmarkIcon className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{folder.name}</span>
                                            </span>
                                            <Badge variant="secondary" className="text-xs shrink-0 ml-2 me-6 group-hover:bg-background">
                                                {folderCount(folder.id)}
                                            </Badge>
                                        </button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                className="absolute right-1 h-6 w-6 flex items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                        setRenameFolderId(folder.id);
                                                        setRenameFolderName(folder.name);
                                                    }}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteFolder(folder.id);
                                                    }}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>

                {/* ---- Main Content ---- */}
                <div className="flex-1 space-y-6 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedFolderId
                                    ? `Viewing "${folders[selectedFolderId]?.name ?? ""}"`
                                    : "All saved bookmarks across every folder"}
                            </p>
                        </div>
                        <Button onClick={() => setShowAddBookmark(true)} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Bookmark
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search bookmarks by title or URL…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Bookmark List */}
                    {filteredBookmarks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
                            <BookmarkIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-muted-foreground">
                                {searchQuery
                                    ? "No bookmarks match your search."
                                    : selectedFolderId
                                        ? "This folder is empty."
                                        : "No bookmarks yet."}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {searchQuery
                                    ? "Try a different search term."
                                    : (
                                        <>
                                            Use the Command Palette (
                                            <kbd className="rounded border px-1">Ctrl+Shift+K</kbd>
                                            ) on any page, or add one manually above.
                                        </>
                                    )}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredBookmarks.map((bookmark) => (
                                <div
                                    key={bookmark.id}
                                    className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
                                >
                                    {/* Favicon */}
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        {bookmark.favicon ? (
                                            <img
                                                src={bookmark.favicon}
                                                alt=""
                                                className="h-5 w-5 rounded-sm"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                                }}
                                            />
                                        ) : null}
                                        <Globe
                                            className={`h-5 w-5 text-muted-foreground ${bookmark.favicon ? "hidden" : ""}`}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate text-sm">
                                                {bookmark.title}
                                            </p>
                                            <Badge variant="outline" className="text-xs shrink-0">
                                                {folders[bookmark.folderId]?.name ?? "Unknown"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {truncateUrl(bookmark.url, 70)}
                                        </p>
                                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                                            Added {formatDate(bookmark.createdAt)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => window.open(bookmark.url, "_blank")}
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Open</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleOpenMove(bookmark)}
                                                >
                                                    <FolderInput className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Move to folder</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleOpenEdit(bookmark)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Edit</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => removeBookmark(bookmark.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ============== Dialogs ============== */}

                {/* ---- Add Bookmark Dialog ---- */}
                <Dialog open={showAddBookmark} onOpenChange={setShowAddBookmark}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add Bookmark</DialogTitle>
                            <DialogDescription>
                                Enter the URL and an optional title for your bookmark.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bm-url">URL</Label>
                                <Input
                                    id="bm-url"
                                    value={newBookmarkUrl}
                                    onChange={(e) => setNewBookmarkUrl(e.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bm-title">Title (optional)</Label>
                                <Input
                                    id="bm-title"
                                    value={newBookmarkTitle}
                                    onChange={(e) => setNewBookmarkTitle(e.target.value)}
                                    placeholder="My bookmark"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Folder</Label>
                                <Select
                                    value={newBookmarkFolder}
                                    onValueChange={setNewBookmarkFolder}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hierarchicalFolders.map(({ folder, pathName }) => (
                                            <SelectItem key={folder.id} value={folder.id}>
                                                {pathName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddBookmark(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddBookmark}
                                disabled={!newBookmarkUrl.trim()}
                            >
                                Add Bookmark
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ---- Edit Bookmark Dialog ---- */}
                <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit Bookmark</DialogTitle>
                            <DialogDescription>
                                Update the bookmark title, URL, or folder.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                    id="edit-title"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-url">URL</Label>
                                <Input
                                    id="edit-url"
                                    value={editUrl}
                                    onChange={(e) => setEditUrl(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Folder</Label>
                                <Select value={editFolder} onValueChange={setEditFolder}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {hierarchicalFolders.map(({ folder, pathName }) => {
                                            if (folder.id === DEFAULT_FOLDER.id) return null;
                                            return (
                                                <SelectItem key={folder.id} value={folder.id}>
                                                    {pathName}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditTarget(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ---- Move Bookmark Dialog ---- */}
                <Dialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Move Bookmark</DialogTitle>
                            <DialogDescription>
                                Move "{moveTarget?.title}" to a different folder.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label>Destination Folder</Label>
                            <Select value={moveBookmarkFolderId} onValueChange={setMoveBookmarkFolderId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {hierarchicalFolders.map(({ folder, pathName }) => {
                                        if (folder.id === DEFAULT_FOLDER.id) return null;
                                        return (
                                            <SelectItem key={folder.id} value={folder.id}>
                                                {pathName}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setMoveTarget(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleMoveBookmark}>Move</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ---- Add Folder Dialog ---- */}
                <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>New Folder</DialogTitle>
                            <DialogDescription>
                                Create a new folder to organise your bookmarks.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="folder-name">Folder Name</Label>
                            <Input
                                id="folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="e.g. Work, Research, Reading…"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddFolder();
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Parent Folder (Optional)</Label>
                            <Select value={newFolderParentId} onValueChange={setNewFolderParentId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Top Level --</SelectItem>
                                    {hierarchicalFolders.map(({ folder, pathName }) => {
                                        if (folder.id === DEFAULT_FOLDER.id) return null;
                                        return (
                                            <SelectItem key={folder.id} value={folder.id}>
                                                {pathName}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddFolder(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddFolder} disabled={!newFolderName.trim()}>
                                Create Folder
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ---- Rename Folder Dialog ---- */}
                <Dialog
                    open={!!renameFolderId}
                    onOpenChange={(open) => !open && setRenameFolderId(null)}
                >
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Rename Folder</DialogTitle>
                            <DialogDescription>
                                Enter a new name for this folder.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="rename-folder">Folder Name</Label>
                            <Input
                                id="rename-folder"
                                value={renameFolderName}
                                onChange={(e) => setRenameFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameFolder();
                                }}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRenameFolderId(null)}>
                                Cancel
                            </Button>
                            <Button onClick={handleRenameFolder} disabled={!renameFolderName.trim()}>
                                Rename
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
