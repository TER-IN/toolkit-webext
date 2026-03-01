// ============================================
// TERIN Toolkit — URL Shortener Dashboard Page
// ============================================
// Full short URL management: search, sort, CRUD operations,
// add/edit/delete dialogs, copy to clipboard.

import { useEffect, useState, useMemo } from "react";
import {
    Link2,
    Plus,
    Pencil,
    Trash2,
    Search,
    ExternalLink,
    Copy,
    ArrowUpDown,
    Check,
} from "lucide-react";
import browser from "webextension-polyfill";

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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useUrlShortenerStore } from "@/stores/useUrlShortenerStore";
import type { ShortUrl } from "@/types";

/** Build the full extension redirect URL for a short code */
function buildRedirectUrl(code: string): string {
    return browser.runtime.getURL(`index.html#/go/${code}`);
}

/** Build the friendly display label */
function friendlyLabel(code: string): string {
    return `terin://${code}`;
}

export function UrlShortenerPage() {
    const {
        shortUrls,
        loaded,
        loadFromStorage,
        addShortUrl,
        removeShortUrl,
        updateShortUrl,
    } = useUrlShortenerStore();

    // ---- UI State ----
    const [searchQuery, setSearchQuery] = useState("");
    const [sortNewest, setSortNewest] = useState(true);

    // Add short URL dialog
    const [showAdd, setShowAdd] = useState(false);
    const [newUrl, setNewUrl] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newCustomCode, setNewCustomCode] = useState("");

    // Edit short URL dialog
    const [editTarget, setEditTarget] = useState<ShortUrl | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editUrl, setEditUrl] = useState("");

    // Copy feedback – stores the ID of the recently copied item
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // ---- Load data on mount ----
    useEffect(() => {
        if (!loaded) {
            loadFromStorage();
        }
    }, [loaded, loadFromStorage]);

    // ---- Derived data ----
    const allShortUrls = useMemo(() => Object.values(shortUrls), [shortUrls]);

    const filteredShortUrls = useMemo(() => {
        let list = allShortUrls;

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (s) =>
                    s.title.toLowerCase().includes(q) ||
                    s.originalUrl.toLowerCase().includes(q) ||
                    s.code.toLowerCase().includes(q),
            );
        }

        // Sort by createdAt
        return list.sort((a, b) =>
            sortNewest ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
        );
    }, [allShortUrls, searchQuery, sortNewest]);

    // ---- Handlers ----

    async function handleAdd() {
        const url = newUrl.trim();
        if (!url) return;
        // Simple URL validation
        try {
            new URL(url);
        } catch {
            return;
        }

        await addShortUrl({
            originalUrl: url,
            title: newTitle.trim() || url,
            code: newCustomCode.trim() || undefined,
        });
        setNewUrl("");
        setNewTitle("");
        setNewCustomCode("");
        setShowAdd(false);
    }

    function handleOpenEdit(shortUrl: ShortUrl) {
        setEditTarget(shortUrl);
        setEditTitle(shortUrl.title);
        setEditUrl(shortUrl.originalUrl);
    }

    async function handleSaveEdit() {
        if (!editTarget) return;
        await updateShortUrl(editTarget.id, {
            title: editTitle.trim() || editTarget.originalUrl,
            originalUrl: editUrl.trim() || editTarget.originalUrl,
        });
        setEditTarget(null);
    }

    async function handleCopy(shortUrl: ShortUrl) {
        const url = buildRedirectUrl(shortUrl.code);
        await navigator.clipboard.writeText(url);
        setCopiedId(shortUrl.id);
        setTimeout(() => setCopiedId(null), 2000);
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
    function truncateUrl(url: string, max = 55): string {
        try {
            const parsed = new URL(url);
            const display = parsed.hostname + parsed.pathname;
            return display.length > max ? display.slice(0, max) + "…" : display;
        } catch {
            return url.length > max ? url.slice(0, max) + "…" : url;
        }
    }

    return (
        <div className="space-y-6">
            {/* Add button */}
            <div className="flex justify-end">
                <Button onClick={() => setShowAdd(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Short URL
                </Button>
            </div>

            {/* Search + Sort controls */}
            <div className="flex items-center gap-3">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, URL, or code…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSortNewest((v) => !v)}
                            className="shrink-0"
                        >
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            {sortNewest ? "Newest First" : "Oldest First"}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle sort order</TooltipContent>
                </Tooltip>
            </div>

            {/* Short URL List */}
            {filteredShortUrls.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
                    <Link2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">
                        {searchQuery
                            ? "No short URLs match your search."
                            : "No short URLs yet."}
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
                    {filteredShortUrls.map((shortUrl) => (
                        <div
                            key={shortUrl.id}
                            className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
                        >
                            {/* Icon */}
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Link2 className="h-5 w-5 text-primary" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium truncate text-sm">
                                        {shortUrl.title}
                                    </p>
                                    <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                                        {friendlyLabel(shortUrl.code)}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {truncateUrl(shortUrl.originalUrl, 70)}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">
                                    Created {formatDate(shortUrl.createdAt)}
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
                                            onClick={() => handleCopy(shortUrl)}
                                        >
                                            {copiedId === shortUrl.id ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {copiedId === shortUrl.id ? "Copied!" : "Copy short URL"}
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => window.open(shortUrl.originalUrl, "_blank")}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open original URL</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleOpenEdit(shortUrl)}
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
                                            onClick={() => removeShortUrl(shortUrl.id)}
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

            {/* ============== Dialogs ============== */}

            {/* ---- Add Short URL Dialog ---- */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Short URL</DialogTitle>
                        <DialogDescription>
                            Enter a URL to shorten. You can optionally set a title and custom code.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="short-url">URL</Label>
                            <Input
                                id="short-url"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://example.com/some/long/path"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="short-title">Title (optional)</Label>
                            <Input
                                id="short-title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="My link"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="short-code">
                                Custom Code (optional)
                            </Label>
                            <Input
                                id="short-code"
                                value={newCustomCode}
                                onChange={(e) => setNewCustomCode(e.target.value)}
                                placeholder="e.g. my-link (auto-generated if blank)"
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Leave blank to auto-generate a 6-character code.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd} disabled={!newUrl.trim()}>
                            Shorten URL
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Edit Short URL Dialog ---- */}
            <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Edit Short URL — <span className="font-mono text-primary">{editTarget?.code}</span>
                        </DialogTitle>
                        <DialogDescription>
                            Update the title or original URL. The short code cannot be changed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-short-title">Title</Label>
                            <Input
                                id="edit-short-title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-short-url">Original URL</Label>
                            <Input
                                id="edit-short-url"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                            />
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
        </div>
    );
}
