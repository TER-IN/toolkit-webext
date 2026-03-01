// ============================================
// TERIN Toolkit — Converters Dashboard Page
// ============================================
// 4 sub-tools: String → Binary, Binary → String,
// Base64 Encode, Base64 Decode.
// Supports textarea input, file upload, and copy-to-clipboard.

import { useState, useRef, useCallback } from "react";
import {
    Binary,
    FileCode2,
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

import {
    stringToBinary,
    binaryToString,
    base64Encode,
    base64Decode,
} from "@/lib/string-tools";

// ---- Sub-tool definitions ----

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    inputPlaceholder: string;
    /** Apply the transformation. Returns a string result. */
    transform: (input: string) => string;
}

const SUB_TOOLS: SubTool[] = [
    {
        id: "string-to-binary",
        label: "String → Binary",
        description: "Convert text to space-separated 8-bit binary representation.",
        icon: Binary,
        inputPlaceholder: "Type or paste text to convert to binary…",
        transform: stringToBinary,
    },
    {
        id: "binary-to-string",
        label: "Binary → String",
        description: "Convert space-separated 8-bit binary back to text.",
        icon: FileCode2,
        inputPlaceholder: "Paste binary (e.g. 01001000 01100101 01101100 01101100 01101111)…",
        transform: binaryToString,
    },
    {
        id: "base64-encode",
        label: "Base64 Encode",
        description: "Encode text as Base64 (UTF-8 safe).",
        icon: Lock,
        inputPlaceholder: "Type or paste text to encode…",
        transform: base64Encode,
    },
    {
        id: "base64-decode",
        label: "Base64 Decode",
        description: "Decode a Base64 string back to text.",
        icon: Unlock,
        inputPlaceholder: "Paste a Base64-encoded string…",
        transform: base64Decode,
    },
];

// ---- Accepted file types for upload ----
const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.xml,.html,.htm,.log,.yaml,.yml,.toml,.ini,.cfg,.conf,.css,.js,.ts,.tsx,.jsx,.py,.sh,.bat,.sql";

export function ConvertersPage() {
    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTool = SUB_TOOLS.find((t) => t.id === activeToolId)!;

    // ---- Handlers ----

    const handleTransform = useCallback(() => {
        if (!input.trim()) {
            setOutput("");
            setError("");
            return;
        }
        try {
            const result = activeTool.transform(input);
            setOutput(result);
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

            // Reset file input so same file can be re-uploaded
            e.target.value = "";
        },
        [],
    );

    // Reset output when switching tools
    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
        setOutput("");
        setError("");
    }, []);

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Converters</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Encode, decode, and convert between different string formats.
                    </p>
                </div>

                {/* Tool selector — horizontal button group */}
                <div className="flex flex-wrap gap-2">
                    {SUB_TOOLS.map((tool) => {
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

                {/* Input area */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="converter-input">Input</Label>
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
                                <TooltipContent>
                                    Load a text file into the input area
                                </TooltipContent>
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
                        id="converter-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={activeTool.inputPlaceholder}
                        className="min-h-[150px] font-mono text-sm"
                    />
                </div>

                {/* Transform button */}
                <Button onClick={handleTransform} disabled={!input.trim()}>
                    Convert
                </Button>

                {/* Error message */}
                {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Output area */}
                {output && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Output</Label>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopy}
                                    >
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
        </TooltipProvider>
    );
}
