// ============================================
// TERIN Toolkit — URL Tools Dashboard Page
// ============================================
// Tabbed page combining URL Shortener (stateful CRUD) with
// URL Encode/Decode (stateless transformation).

import { useState, useRef, useCallback } from "react";
import {
    Link2,
    Lock,
    Unlock,
    Upload,
    Copy,
    Check,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { urlEncode, urlDecode } from "@/lib/string-tools";
import { UrlShortenerPage } from "@/pages/UrlShortenerPage";

// ---- Tab definitions ----

type TabId = "shortener" | "encode-decode";

interface TabDef {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
    { id: "shortener", label: "URL Shortener", icon: Link2 },
    { id: "encode-decode", label: "Encode / Decode", icon: Lock },
];

// ---- Encode/Decode sub-tool definitions ----

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    inputPlaceholder: string;
    transform: (input: string) => string;
}

const ENCODE_DECODE_TOOLS: SubTool[] = [
    {
        id: "url-encode",
        label: "URL Encode",
        description: "Percent-encode a string for safe use in URLs.",
        icon: Lock,
        inputPlaceholder: "Type or paste text to URL-encode…",
        transform: urlEncode,
    },
    {
        id: "url-decode",
        label: "URL Decode",
        description: "Decode a percent-encoded URL string back to text.",
        icon: Unlock,
        inputPlaceholder: "Paste a URL-encoded string (e.g. hello%20world)…",
        transform: urlDecode,
    },
];

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.xml,.html,.htm,.log,.url";

export function UrlToolsPage() {
    const [activeTab, setActiveTab] = useState<TabId>("shortener");

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">URL Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Shorten, encode, and decode URLs.
                    </p>
                </div>

                {/* Tab selector */}
                <div className="flex gap-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.id === activeTab;
                        return (
                            <Button
                                key={tab.id}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => setActiveTab(tab.id)}
                                className="shrink-0"
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                {tab.label}
                            </Button>
                        );
                    })}
                </div>

                {/* Tab content */}
                {activeTab === "shortener" && <UrlShortenerPage />}
                {activeTab === "encode-decode" && <UrlEncodeDecodeTab />}
            </div>
        </TooltipProvider>
    );
}

// ---- URL Encode/Decode Tab Content ----

function UrlEncodeDecodeTab() {
    const [activeToolId, setActiveToolId] = useState(ENCODE_DECODE_TOOLS[0].id);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTool = ENCODE_DECODE_TOOLS.find((t) => t.id === activeToolId)!;

    const handleTransform = useCallback(() => {
        if (!input.trim()) {
            setOutput("");
            setError("");
            return;
        }
        try {
            setOutput(activeTool.transform(input));
            setError("");
        } catch (err) {
            setOutput("");
            setError(err instanceof Error ? err.message : "Unknown error");
        }
    }, [input, activeTool]);

    const handleCopy = useCallback(async () => {
        if (!output) return;
        await navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [output]);

    const handleClear = useCallback(() => {
        setInput("");
        setOutput("");
        setError("");
    }, []);

    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result;
                if (typeof text === "string") {
                    setInput(text);
                    setOutput("");
                    setError("");
                }
            };
            reader.readAsText(file);
            e.target.value = "";
        },
        [],
    );

    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
        setOutput("");
        setError("");
    }, []);

    return (
        <div className="space-y-6">
            {/* Sub-tool selector */}
            <div className="flex flex-wrap gap-2">
                {ENCODE_DECODE_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = tool.id === activeToolId;
                    return (
                        <Tooltip key={tool.id}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleToolChange(tool.id)}
                                    className="shrink-0"
                                >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {tool.label}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{tool.description}</TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

            {/* Active tool description */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                {(() => {
                    const Icon = activeTool.icon;
                    return (
                        <>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{activeTool.label}</p>
                                <p className="text-xs text-muted-foreground">
                                    {activeTool.description}
                                </p>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Input */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="url-tool-input">Input</Label>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_FILE_TYPES}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload File
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Load a text file into the input area</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClear}
                                    disabled={!input && !output && !error}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear input and output</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                <Textarea
                    id="url-tool-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={activeTool.inputPlaceholder}
                    className="min-h-[150px] font-mono text-sm"
                />
            </div>

            {/* Convert button */}
            <Button onClick={handleTransform} disabled={!input.trim()}>
                Convert
            </Button>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Output */}
            {output && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Output</Label>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={handleCopy}>
                                    {copied ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4 text-green-500" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy output to clipboard</TooltipContent>
                        </Tooltip>
                    </div>
                    <Textarea
                        value={output}
                        readOnly
                        className="min-h-[150px] font-mono text-sm bg-muted/30"
                    />
                </div>
            )}
        </div>
    );
}
