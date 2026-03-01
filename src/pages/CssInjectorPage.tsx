// ============================================
// TERIN Toolkit — CSS Injector Dashboard Page
// ============================================
// Displays a table of all per-domain CSS overrides.
// Users can toggle, edit, or delete overrides here.

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { useCssOverrideStore, DEFAULT_DARK_CSS } from "@/stores/useCssOverrideStore";
import type { CssOverride } from "@/types";

export function CssInjectorPage() {
    const { overrides, loaded, loadFromStorage, addOverride, removeOverride, toggleOverride, updateCss } =
        useCssOverrideStore();

    // ---- State for the Edit dialog ----
    const [editTarget, setEditTarget] = useState<CssOverride | null>(null);
    const [editCss, setEditCss] = useState("");

    // ---- State for the Add dialog ----
    const [showAdd, setShowAdd] = useState(false);
    const [newHostname, setNewHostname] = useState("");
    const [newCss, setNewCss] = useState(DEFAULT_DARK_CSS);

    // Load overrides on mount
    useEffect(() => {
        if (!loaded) {
            loadFromStorage();
        }
    }, [loaded, loadFromStorage]);

    const overrideList = Object.values(overrides);

    // ---- Handlers ----
    function handleOpenEdit(override: CssOverride) {
        setEditTarget(override);
        setEditCss(override.css);
    }

    async function handleSaveEdit() {
        if (editTarget) {
            await updateCss(editTarget.hostname, editCss);
            setEditTarget(null);
        }
    }

    async function handleAdd() {
        const hostname = newHostname.trim().toLowerCase();
        if (!hostname) return;
        await addOverride({ hostname, css: newCss, enabled: true });
        setNewHostname("");
        setNewCss(DEFAULT_DARK_CSS);
        setShowAdd(false);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">CSS Overrides</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage per-domain CSS injection rules (dark mode, custom styles, etc.)
                    </p>
                </div>
                <Button onClick={() => setShowAdd(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Override
                </Button>
            </div>

            {/* Table */}
            {overrideList.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
                    <p className="text-muted-foreground">No CSS overrides yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Use the Command Palette (<kbd className="rounded border px-1">Ctrl+Shift+K</kbd>) on any
                        page to toggle dark mode, or add one manually above.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Domain</TableHead>
                                <TableHead>CSS Preview</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[160px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {overrideList.map((override) => (
                                <TableRow key={override.hostname}>
                                    <TableCell className="font-medium">{override.hostname}</TableCell>
                                    <TableCell>
                                        <code className="block max-w-md truncate rounded bg-muted px-2 py-1 text-xs">
                                            {override.css.slice(0, 80)}
                                            {override.css.length > 80 && "…"}
                                        </code>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Switch
                                                checked={override.enabled}
                                                onCheckedChange={() => toggleOverride(override.hostname)}
                                            />
                                            <Badge variant={override.enabled ? "default" : "secondary"}>
                                                {override.enabled ? "On" : "Off"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(override)}
                                                title="Edit CSS"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeOverride(override.hostname)}
                                                title="Delete override"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* ---- Edit Dialog ---- */}
            <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit CSS — {editTarget?.hostname}</DialogTitle>
                        <DialogDescription>
                            Modify the raw CSS that gets injected into pages on this domain.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={editCss}
                        onChange={(e) => setEditCss(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                        placeholder="Enter CSS rules…"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- Add Dialog ---- */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add CSS Override</DialogTitle>
                        <DialogDescription>
                            Enter a domain and the CSS you want to inject on it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="hostname">Domain (hostname)</Label>
                            <Input
                                id="hostname"
                                value={newHostname}
                                onChange={(e) => setNewHostname(e.target.value)}
                                placeholder="e.g. github.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="css">CSS</Label>
                            <Textarea
                                id="css"
                                value={newCss}
                                onChange={(e) => setNewCss(e.target.value)}
                                className="min-h-[160px] font-mono text-sm"
                                placeholder="Enter CSS rules…"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd} disabled={!newHostname.trim()}>
                            Add Override
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
