// ============================================
// TERIN Toolkit — Settings Page
// ============================================
// Manages Import/Export of extension data.

import { useState, useRef, useEffect } from "react";
import { Download, Upload, FileJson, AlertCircle, CheckCircle2, FolderSync, Unlink, KeyRound, Monitor, Sun, Moon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StorageManager, type ExportPayload, type ImportStrategy } from "@/lib/storage";
import { FsSyncManager, type SyncState } from "@/lib/fs-sync";
import { useTheme } from "@/components/theme-provider";

export function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [strategy, setStrategy] = useState<ImportStrategy>("merge");
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [isAlchemyKeySet, setIsAlchemyKeySet] = useState(false);
    const [isEditingAlchemyKey, setIsEditingAlchemyKey] = useState(false);
    const [newAlchemyApiKey, setNewAlchemyApiKey] = useState("");
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Auto-Sync state
    const [syncState, setSyncState] = useState<SyncState>("disconnected");
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function initSync() {
            const state = await FsSyncManager.verifyPermission(false);
            setSyncState(state);
            if (state === "connected") {
                const ts = await StorageManager.get<number>("last_sync_time", 0);
                if (ts > 0) setLastSyncTime(ts);
            }

            // Check whether API key exists, do not load it into UI state
            const key = await StorageManager.get<string>("alchemy_api_key", "");
            setIsAlchemyKeySet(!!key);
        }
        initSync();
    }, []);

    async function handleSaveAlchemyApiKey() {
        if (!newAlchemyApiKey.trim()) return;

        setIsSavingSettings(true);
        await StorageManager.set("alchemy_api_key", newAlchemyApiKey.trim());
        setIsAlchemyKeySet(true);
        setNewAlchemyApiKey("");
        setIsEditingAlchemyKey(false);
        setTimeout(() => setIsSavingSettings(false), 500);
    }

    async function handleSelectSyncFolder() {
        try {
            await FsSyncManager.selectSyncFolder();
            const state = await FsSyncManager.verifyPermission(true);
            setSyncState(state);
            if (state === "connected") {
                await FsSyncManager.syncNow();
                setLastSyncTime(Date.now());
                setTimeout(() => window.location.reload(), 1000); // Reload to reflect merged data
            }
        } catch (err) {
            if (err instanceof Error && err.message !== "ABORTED") {
                alert(`Error selecting folder: ${err.message}`);
            }
        }
    }

    async function handleGrantPermission() {
        try {
            const state = await FsSyncManager.verifyPermission(true);
            setSyncState(state);
            if (state === "connected") {
                await FsSyncManager.syncNow();
                setLastSyncTime(Date.now());
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            alert("Failed to grant permission: " + (err as Error).message);
        }
    }

    async function handleDisconnectSync() {
        await FsSyncManager.disconnect();
        setSyncState("disconnected");
        setLastSyncTime(null);
    }

    async function handleExport() {
        try {
            const data = await StorageManager.exportAll();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const dateStr = new Date().toISOString().split("T")[0];
            const filename = `terin-backup-${dateStr}.json`;

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export data.");
        }
    }

    async function handleImport() {
        if (!importFile) return;
        setIsImporting(true);
        setImportStatus(null);

        try {
            const text = await importFile.text();
            let payload: ExportPayload;
            try {
                payload = JSON.parse(text);
            } catch {
                throw new Error("Invalid JSON file.");
            }

            if (!payload.version || !payload.data) {
                throw new Error("Unrecognised TERIN export file format.");
            }

            await StorageManager.importAll(payload, strategy);

            setImportStatus({
                type: "success",
                message: "Data imported successfully! The dashboard will now reload to apply changes.",
            });

            // Reload the page to allow Zustand stores to re-hydrate from storage naturally
            setTimeout(() => {
                window.location.reload();
            }, 1500);

            setImportFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            console.error("Import failed:", err);
            setImportStatus({
                type: "error",
                message: err instanceof Error ? err.message : "Failed to import file.",
            });
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your extension appearance and data synchronisation.
                </p>
            </div>

            <Separator />

            {/* ==== Appearance Section ==== */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Appearance</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Customise the look of the extension dashboard.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={theme === "light" ? "default" : "outline"}
                        onClick={() => setTheme("light")}
                        className="w-32 justify-start"
                    >
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                    </Button>
                    <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        onClick={() => setTheme("dark")}
                        className="w-32 justify-start"
                    >
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                    </Button>
                    <Button
                        variant={theme === "system" ? "default" : "outline"}
                        onClick={() => setTheme("system")}
                        className="w-32 justify-start"
                    >
                        <Monitor className="mr-2 h-4 w-4" />
                        System
                    </Button>
                </div>
            </section>

            <Separator />

            {/* ==== Integrations Section ==== */}
            <section className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-lg font-semibold">API Integrations</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Configure API keys needed for advanced extension features.
                        </p>
                    </div>
                    {isEditingAlchemyKey && (
                        <Button
                            onClick={handleSaveAlchemyApiKey}
                            disabled={isSavingSettings || !newAlchemyApiKey.trim()}
                        >
                            {isSavingSettings ? "Saving..." : "Save API Key"}
                        </Button>
                    )}
                </div>

                <div className="space-y-3">
                    <Label htmlFor="alchemy-api-key">Alchemy API Key</Label>

                    {!isEditingAlchemyKey ? (
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground">
                                {isAlchemyKeySet ? "API key is saved" : "No API key set"}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsEditingAlchemyKey(true)}
                                >
                                    {isAlchemyKeySet ? "Replace" : "Set API Key"}
                                </Button>

                                {isAlchemyKeySet && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={async () => {
                                            await StorageManager.set("alchemy_api_key", "");
                                            setIsAlchemyKeySet(false);
                                            setNewAlchemyApiKey("");
                                            setIsEditingAlchemyKey(false);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Input
                                id="alchemy-api-key"
                                type="password"
                                placeholder="Enter Alchemy API Key"
                                value={newAlchemyApiKey}
                                onChange={(e) => setNewAlchemyApiKey(e.target.value)}
                            />

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleSaveAlchemyApiKey}
                                    disabled={isSavingSettings || !newAlchemyApiKey.trim()}
                                >
                                    {isSavingSettings ? "Saving..." : "Save"}
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setNewAlchemyApiKey("");
                                        setIsEditingAlchemyKey(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        Used by finance tools to auto-fill Ethereum and Avalanche C-Chain transactions via Alchemy.
                    </p>
                </div>
            </section>

            <Separator />

            {/* ==== Auto-Sync Section ==== */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <FolderSync className="h-5 w-5 text-primary" />
                        Auto-Sync via File System
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select a local folder (e.g., in Dropbox or Google Drive) to automatically sync your data across devices.
                    </p>
                </div>

                <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium">Status</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {syncState === "disconnected" && "Not configured."}
                                {syncState === "requires_permission" && (
                                    <span className="text-destructive font-medium flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        Browser restarted. Permission required to resume sync.
                                    </span>
                                )}
                                {syncState === "connected" && (
                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Active
                                        {lastSyncTime && ` (Last synced: ${new Date(lastSyncTime).toLocaleTimeString()})`}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {syncState === "disconnected" && (
                                <Button onClick={handleSelectSyncFolder}>Select Sync Folder</Button>
                            )}
                            {syncState === "requires_permission" && (
                                <Button onClick={handleGrantPermission} variant="secondary">
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Resume Sync
                                </Button>
                            )}
                            {syncState !== "disconnected" && (
                                <Button onClick={handleDisconnectSync} variant="outline" size="icon">
                                    <Unlink className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <Separator />

            {/* ==== Export Section ==== */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Export Data</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Download all your CSS overrides, bookmarks, and shortened URLs as a JSON file.
                    </p>
                </div>
                <Button onClick={handleExport} className="w-fit">
                    <Download className="mr-2 h-4 w-4" />
                    Export All Data
                </Button>
            </section>

            <Separator />

            {/* ==== Import Section ==== */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold">Import Data</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Restore data from a previously exported JSON file.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="import-file">Upload JSON File</Label>
                    <div className="flex items-center gap-3">
                        <label
                            htmlFor="import-file"
                            className="flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground w-fit transition-colors"
                        >
                            <FileJson className="mr-2 h-4 w-4" />
                            {importFile ? importFile.name : "Choose File..."}
                        </label>
                        <input
                            id="import-file"
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            className="hidden"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        />
                        {importFile && (
                            <span className="text-sm text-muted-foreground">
                                {(importFile.size / 1024).toFixed(1)} KB
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Merge Strategy</Label>
                    <Select value={strategy} onValueChange={(v) => setStrategy(v as ImportStrategy)}>
                        <SelectTrigger className="w-full sm:w-[400px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="merge">
                                <span className="font-medium">Merge (Recommended)</span>
                                <span className="block text-xs text-muted-foreground mt-0.5">
                                    Combines with existing data. Imported items overwrite duplicates.
                                </span>
                            </SelectItem>
                            <SelectItem value="replace">
                                <span className="font-medium text-destructive">Replace All</span>
                                <span className="block text-xs text-muted-foreground mt-0.5 whitespace-normal">
                                    Wipe all existing data and strictly apply the imported file.
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={handleImport} disabled={!importFile || isImporting} className="w-fit">
                    <Upload className="mr-2 h-4 w-4" />
                    {isImporting ? "Importing..." : "Import Data"}
                </Button>

                {importStatus && (
                    <div
                        className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${importStatus.type === "success"
                            ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                            : "border-destructive/20 bg-destructive/10 text-destructive"
                            }`}
                    >
                        {importStatus.type === "success" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <p className="font-medium">{importStatus.message}</p>
                    </div>
                )}
            </section>
        </div>
    );
}
